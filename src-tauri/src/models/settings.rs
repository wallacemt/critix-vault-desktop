use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub default_player: String,
    pub enable_image_cache: bool,
    pub auto_scan_on_startup: bool,
    pub theme: String,
    /// Controls which player the UI uses when the user opens media.
    /// Valid values: "ASK" | "INTERNAL" | "EXTERNAL"
    pub preferred_player: String,
    /// Port the BitTorrent client listens on (default 10800).
    pub torrent_client_port: u16,
    /// Optional username for the local BitTorrent client's web UI.
    /// Stored in Rust-side settings; never sent from the renderer.
    pub torrent_client_user: Option<String>,
    /// Optional password for the local BitTorrent client's web UI.
    /// Stored in Rust-side settings; never sent from the renderer.
    pub torrent_client_pass: Option<String>,
    /// Master switch for the torrent API proxy (CA-17).
    /// When false, `proxy_torrent_api` returns immediately without any network
    /// activity. Defaults to false so the feature is opt-in.
    pub torrent_proxy_enabled: bool,
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
        }
    }
}
