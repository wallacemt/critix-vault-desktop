use sha2::{Digest, Sha256};
use std::fs;
use crate::storage::StorageManager;

impl StorageManager {
    pub fn get_cached_image(&self, url: &str) -> Option<String> {
        let path = self.cache_dir.join("images").join(hash_url(url));
        if path.exists() {
            Some(path.to_string_lossy().to_string())
        } else {
            None
        }
    }

    pub fn cache_image(&self, url: &str, data: &[u8]) -> Result<String, String> {
        let path = self.cache_dir.join("images").join(hash_url(url));
        fs::write(&path, data).map_err(|e| e.to_string())?;
        Ok(path.to_string_lossy().to_string())
    }
}

fn hash_url(url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    hex::encode(hasher.finalize())
}
