use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub path: String,
    pub name: String,
    pub media_count: usize,
    pub added_at: String,
    pub last_scanned: Option<String>,
}