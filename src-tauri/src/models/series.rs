use serde::{Deserialize, Serialize};
use crate::models::{ Season};
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Series {
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
    pub seasons: Vec<Season>,
    pub number_of_seasons: u32,
    pub number_of_episodes: u32,
    pub trailer: Option<String>,
    pub first_air_date: Option<String>,
    pub last_air_date: Option<String>,
}



