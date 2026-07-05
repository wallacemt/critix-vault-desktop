use serde::{Deserialize, Serialize};

fn default_player() -> String { "default".to_string() }
fn default_theme() -> String { "dark".to_string() }
fn default_preferred_player() -> String { "ASK".to_string() }
fn default_torrent_port() -> u16 { 10800 }
fn default_true() -> bool { true }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    #[serde(default = "default_player")]
    pub default_player: String,
    #[serde(default = "default_true")]
    pub enable_image_cache: bool,
    #[serde(default)]
    pub auto_scan_on_startup: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
    /// Controls which player the UI uses when the user opens media.
    /// Valid values: "ASK" | "INTERNAL" | "EXTERNAL"
    #[serde(default = "default_preferred_player")]
    pub preferred_player: String,
    /// Port the BitTorrent client listens on (default 10800).
    #[serde(default = "default_torrent_port")]
    pub torrent_client_port: u16,
    /// Optional username for the local BitTorrent client's web UI.
    /// Stored in Rust-side settings; never sent from the renderer.
    #[serde(default)]
    pub torrent_client_user: Option<String>,
    /// Optional password for the local BitTorrent client's web UI.
    /// Stored in Rust-side settings; never sent from the renderer.
    #[serde(default)]
    pub torrent_client_pass: Option<String>,
    /// Master switch for the torrent API proxy (CA-17).
    /// When false, `proxy_torrent_api` returns immediately without any network
    /// activity. Defaults to false so the feature is opt-in.
    #[serde(default)]
    pub torrent_proxy_enabled: bool,
    /// Last app version for which the user dismissed the "What's New" prompt.
    /// Empty string on first run — treated as "already seen" to avoid greeting
    /// brand-new users with a changelog (OQ-1 resolved).
    #[serde(default)]
    pub last_seen_version: String,
    /// Master switch for the filesystem watcher that triggers an automatic
    /// rescan when a tracked folder changes. Defaults to true since it's the
    /// expected always-on behavior; existing installs without this field yet
    /// (pre-upgrade settings.json) also default to enabled via `default_true`.
    #[serde(default = "default_true")]
    pub auto_scan_on_change: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_player: "default".to_string(),
            enable_image_cache: true,
            auto_scan_on_startup: false,
            theme: "dark".to_string(),
            preferred_player: "ASK".to_string(),
            torrent_client_port: 10800,
            torrent_client_user: None,
            torrent_client_pass: None,
            torrent_proxy_enabled: false,
            last_seen_version: String::new(),
            auto_scan_on_change: true,
        }
    }
}
