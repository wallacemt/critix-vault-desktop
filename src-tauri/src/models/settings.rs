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
    /// Port the BitTorrent client listens on. Reserved for Phase 5.
    pub torrent_client_port: u16,
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
        }
    }
}
