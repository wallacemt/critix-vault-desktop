use tauri::{Manager, WebviewWindowBuilder};

/// Opens the in-app torrent search pane. The pane is a regular Tauri window
/// that loads the internal `/torrent-search` Next.js route using WebviewUrl::App,
/// which resolves correctly in both dev (devUrl) and production (frontendDist) modes.
#[tauri::command]
pub fn open_torrent_pane(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("torrent-pane") {
        let _ = w.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "torrent-pane",
        tauri::WebviewUrl::App("torrent-search".into()),
    )
    .title("Buscar Torrent")
    .inner_size(1000.0, 700.0)
    .resizable(false)
    .closable(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Search torrents via The Pirate Bay's public JSON API (apibay.org).
/// All network I/O happens on the Rust side to avoid CORS restrictions in the
/// renderer. Returns the raw JSON array from the API.
#[tauri::command]
pub async fn search_torrents(query: String) -> Result<serde_json::Value, String> {
    use reqwest::Client;

    if query.trim().is_empty() {
        return Ok(serde_json::Value::Array(vec![]));
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("https://apibay.org/q.php")
        .query(&[("q", query.trim()), ("cat", "0")])
        .send()
        .await
        .map_err(|e| format!("Falha ao conectar com apibay.org: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("API retornou status {}", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Resposta inválida da API: {e}"))?;

    Ok(json)
}

/// Validates and hands a magnet link off to the OS torrent client via the
/// system's default magnet: URI handler.
///
/// Rejects anything that is not a proper magnet link (LSF-PHASE5-004):
/// - Must start with `magnet:` (case-insensitive)
/// - Must contain the `xt=urn:` parameter that identifies the info-hash
#[tauri::command]
pub fn intercept_torrent_link(link: String) -> Result<(), String> {
    use std::process::Command;

    let trimmed = link.trim();
    let lower = trimmed.to_ascii_lowercase();

    if !lower.starts_with("magnet:") {
        return Err("rejected: not a magnet link".into());
    }
    if !lower.contains("xt=urn:") {
        return Err("rejected: invalid magnet link (no xt=urn: parameter)".into());
    }

    // Use the OS shell to hand the validated magnet URI to the registered
    // protocol handler (e.g. qBittorrent, uTorrent). `cmd /C start` is the
    // most reliable path on Windows for custom URI schemes; xdg-open on Linux
    // and `open` on macOS serve the same purpose.
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .spawn()
            .map_err(|e| format!("Falha ao abrir link magnet: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Falha ao abrir link magnet: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Falha ao abrir link magnet: {e}"))?;
    }

    Ok(())
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
