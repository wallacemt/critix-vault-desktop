use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

use crate::models::{AppData, CacheInfo};

pub struct StorageManager {
    pub data_dir: PathBuf,
    pub cache_dir: PathBuf,
    pub data_file: PathBuf,
}

impl StorageManager {
    pub fn new() -> Result<Self, String> {
        let proj_dirs = ProjectDirs::from("com", "critix", "critix-vault")
            .ok_or("Failed to get project directories")?;

        let data_dir = proj_dirs.data_dir().to_path_buf();
        let cache_dir = data_dir.join("cache");
        let images_dir = cache_dir.join("images");

        fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create cache dir: {e}"))?;

        let data_file = data_dir.join("app_data.json");

        Ok(Self {
            data_dir,
            cache_dir,
            data_file,
        })
    }

    // ===============================
    // Data
    // ===============================

    pub fn load(&self) -> Result<AppData, String> {
        if !self.data_file.exists() {
            return Ok(AppData::default());
        }

        let content = fs::read_to_string(&self.data_file)
            .map_err(|e| format!("Failed to read data file: {e}"))?;

        serde_json::from_str(&content).map_err(|e| format!("Failed to parse data file: {e}"))
    }

    pub fn save(&self, data: &AppData) -> Result<(), String> {
        let json =
            serde_json::to_string_pretty(data).map_err(|e| format!("Serialize error: {e}"))?;

        fs::write(&self.data_file, json).map_err(|e| format!("Failed to write data file: {e}"))
    }

    // ===============================
    // Cache / Cleanup
    // ===============================

    pub fn clear_all_data(&self) -> Result<(), String> {
        // Remove app_data.json
        if self.data_file.exists() {
            fs::remove_file(&self.data_file)
                .map_err(|e| format!("Failed to remove data file: {e}"))?;
        }

        // Remove image cache
        let images_dir = self.cache_dir.join("images");
        if images_dir.exists() {
            fs::remove_dir_all(&images_dir)
                .map_err(|e| format!("Failed to clear image cache: {e}"))?;
            fs::create_dir_all(&images_dir)
                .map_err(|e| format!("Failed to recreate image cache dir: {e}"))?;
        }

        Ok(())
    }

    pub fn get_cache_info(&self) -> Result<CacheInfo, String> {
        let mut total_size = 0u64;
        let mut image_count = 0u32;

        let images_dir = self.cache_dir.join("images");
        if images_dir.exists() {
            for entry in fs::read_dir(&images_dir).map_err(|e| format!("Read dir error: {e}"))? {
                let entry = entry.map_err(|e| e.to_string())?;
                let meta = entry.metadata().map_err(|e| e.to_string())?;
                if meta.is_file() {
                    total_size += meta.len();
                    image_count += 1;
                }
            }
        }

        let data_file_size = if self.data_file.exists() {
            fs::metadata(&self.data_file).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        Ok(CacheInfo {
            total_size_bytes: total_size,
            image_count,
            data_file_size,
        })
    }
}
