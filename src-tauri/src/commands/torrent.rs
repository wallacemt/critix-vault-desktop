use tauri::WebviewWindowBuilder;

/// Hosts the torrent pane is allowed to navigate to.
/// Only exact host matches are permitted; no subdomain wildcards.
const ALLOWED_TORRENT_HOSTS: &[&str] = &["apachetorrent.com"];

/// Initialization script injected into the torrent pane webview.
/// Blocks `window.open`, clears `opener`, freezes Tauri internals so the
/// sandboxed page cannot reach any app IPC, and wires a CSP-violation listener
/// as a defense-in-depth observer.
const TORRENT_INIT_SCRIPT: &str = r#"
    window.open = () => null;
    window.opener = null;
    try { Object.freeze(window.__TAURI_INTERNALS__); } catch(_) {}
    document.addEventListener('securitypolicyviolation', function(e) {
        console.warn('[torrent-pane CSP violation]', e.violatedDirective, e.blockedURI);
    });
"#;

/// Returns true only when the URL is an https:// URL whose host is in the
/// allowlist. Blocks data:, blob:, javascript: and any non-https scheme.
fn is_navigation_allowed(url: &tauri::Url) -> bool {
    let scheme = url.scheme();
    if matches!(scheme, "data" | "blob" | "javascript") {
        return false;
    }
    if scheme != "https" {
        return false;
    }
    ALLOWED_TORRENT_HOSTS
        .iter()
        .any(|&h| url.host_str() == Some(h))
}

/// Opens the sandboxed torrent browser pane. If the window is already open,
/// focuses it instead of creating a second one.
///
/// Security properties (LSF-PHASE5-001, -002, -008, -009):
/// - `on_ipc_request` returns `false` for every call → no app IPC reachable
/// - `on_navigation` blocks anything that is not an allowlisted https host
/// - initialization script freezes `__TAURI_INTERNALS__` and overrides `window.open`
#[tauri::command]
pub fn open_torrent_pane(app: tauri::AppHandle) -> Result<(), String> {
    // Reuse the existing window rather than spawning duplicates.
    if app.webview_windows().contains_key("torrent-pane") {
        if let Some(w) = app.get_webview_window("torrent-pane") {
            let _ = w.set_focus();
            return Ok(());
        }
    }

    let initial_url = format!("https://{}", ALLOWED_TORRENT_HOSTS[0]);
    let parsed_url: tauri::Url = initial_url
        .parse()
        .map_err(|e: url::ParseError| e.to_string())?;

    WebviewWindowBuilder::new(
        &app,
        "torrent-pane",
        tauri::WebviewUrl::External(parsed_url),
    )
    .title("Torrent Browser")
    .inner_size(1200.0, 800.0)
    // LSF-PHASE5-002: only allowlisted https hosts may be navigated to.
    .on_navigation(is_navigation_allowed)
    // LSF-PHASE5-001: deny every IPC invoke from this webview.
    .on_ipc_request(|_window, _request| false)
    // LSF-PHASE5-001, -009: freeze Tauri internals + CSP violation observer.
    .initialization_script(TORRENT_INIT_SCRIPT)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Validates and hands a magnet link off to the OS torrent client via the
/// system's default magnet: URI handler.
///
/// Rejects anything that is not a proper magnet link (LSF-PHASE5-004):
/// - Must start with `magnet:` (case-insensitive)
/// - Must contain the `xt=urn:` parameter that identifies the info-hash
#[tauri::command]
pub fn intercept_torrent_link(app: tauri::AppHandle, link: String) -> Result<(), String> {
    let trimmed = link.trim();
    let lower = trimmed.to_ascii_lowercase();

    if !lower.starts_with("magnet:") {
        return Err("rejected: not a magnet link".into());
    }
    if !lower.contains("xt=urn:") {
        return Err("rejected: invalid magnet link (no xt=urn: parameter)".into());
    }

    // Open with the original (not lowercased) string so the hash is preserved.
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(trimmed, None::<&str>)
        .map_err(|e| e.to_string())
}

/// Proxies a torrent list request to the local uTorrent/BitTorrent client.
///
/// ALL configuration (port, credentials) is read from Rust-side `AppSettings`.
/// The renderer passes no arguments — this prevents SSRF via port manipulation
/// (LSF-PHASE5-003) and keeps credentials out of IPC (LSF-PHASE5-006).
///
/// Flow:
///   1. Load settings from trusted storage.
///   2. Validate the configured port (must be 1–65535).
///   3. Fetch `/gui/token.html` with optional Basic auth.
///   4. Extract and sanitize the CSRF token (LSF-PHASE5-007).
///   5. Fetch the torrent list using the token.
#[tauri::command]
pub async fn proxy_torrent_api() -> Result<serde_json::Value, String> {
    use crate::storage::get_storage;

    // Read ALL config from trusted Rust-side settings.
    let settings = {
        let storage = get_storage()?;
        storage
            .as_ref()
            .ok_or("Storage not initialized")?
            .load()?
            .settings
    };

    // CA-17: feature is opt-in. Return empty object without touching the network.
    if !settings.torrent_proxy_enabled {
        return Ok(serde_json::Value::Object(serde_json::Map::new()));
    }

    let port = settings.torrent_client_port;
    // u16 already guarantees 0–65535; port 0 is the only invalid value
    // (OS uses it internally for dynamic binding). Ports 1–65535 are all valid.
    if port == 0 {
        return Err("Invalid torrent client port in settings: port cannot be 0".into());
    }

    let user = settings.torrent_client_user.clone();
    let pass = settings.torrent_client_pass.clone();
    let base = format!("http://127.0.0.1:{port}");

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Step 1: obtain CSRF token from the uTorrent token endpoint.
    let token_url = format!("{base}/gui/token.html");
    let mut token_req = client.get(&token_url);
    if let (Some(ref u), Some(ref p)) = (&user, &pass) {
        token_req = token_req.basic_auth(u, Some(p));
    }
    let token_text = token_req
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let token = extract_and_validate_token(&token_text)?;

    // Step 2: fetch the torrent list using the CSRF token.
    // Build the URL via reqwest so query-parameter encoding is handled correctly.
    let list_url = format!("{base}/gui/");
    let mut list_req = client
        .get(&list_url)
        .query(&[("list", "1"), ("token", token.as_str())]);
    if let (Some(ref u), Some(ref p)) = (&user, &pass) {
        list_req = list_req.basic_auth(u, Some(p));
    }
    let json = list_req
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(json)
}

/// Extracts the CSRF token from uTorrent's `token.html` response and validates
/// its format to prevent injection (LSF-PHASE5-007).
fn extract_and_validate_token(html: &str) -> Result<String, String> {
    // uTorrent wraps the token in: <div id='token' ...>TOKEN_VALUE</div>
    let div_start = html
        .find("<div id='token'")
        .or_else(|| html.find("<div id=\"token\""))
        .ok_or("uTorrent token div not found in response")?;

    let content_start = html[div_start..]
        .find('>')
        .ok_or("uTorrent token div is malformed (no closing >)")?
        + div_start
        + 1;

    let content_end = html[content_start..]
        .find("</div>")
        .ok_or("uTorrent token div is not closed")?
        + content_start;

    let token = html[content_start..content_end].trim().to_string();

    // LSF-PHASE5-007: length and character-set validation.
    if token.is_empty() || token.len() > 256 {
        return Err("invalid token length from uTorrent".into());
    }
    if !token
        .chars()
        .all(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | '+' | '/' | '='))
    {
        return Err("invalid token characters from uTorrent".into());
    }

    Ok(token)
}
