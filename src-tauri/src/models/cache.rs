use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheInfo {
    pub total_size_bytes: u64,
    pub image_count: u32,
    pub data_file_size: u64,
}
