use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub default_player: String,
    pub enable_image_cache: bool,
    pub auto_scan_on_startup: bool,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_player: "default".to_string(),
            enable_image_cache: true,
            auto_scan_on_startup: false,
            theme: "dark".to_string(),
        }
    }
}
