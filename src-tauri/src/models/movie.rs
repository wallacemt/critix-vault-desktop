use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Movie {
    pub id: String,
    #[serde(rename = "type")]
    pub media_type: String,
    pub title: String,
    pub original_title: Option<String>,
    pub year: Option<u32>,
    pub poster: Option<String>,
    pub backdrop: Option<String>,
    pub overview: Option<String>,
    pub rating: Option<f64>,
    pub status: String,
    pub file_path: String,
    pub folder_id: String,
    pub duration: Option<u32>,
    pub trailer: Option<String>,
    pub release_date: Option<String>,
}