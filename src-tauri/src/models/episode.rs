use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Episode {
    pub id: String,
    pub episode_number: u32,
    pub season_number: u32,
    pub title: String,
    pub overview: Option<String>,
    pub still_path: Option<String>,
    pub air_date: Option<String>,
    pub duration: Option<u32>,
    pub file_path: Option<String>,
    pub available: Option<bool>,
}
