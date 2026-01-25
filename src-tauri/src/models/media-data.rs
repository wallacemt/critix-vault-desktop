#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub path: String,
    pub name: String,
    pub media_count: usize,
    pub added_at: String,
    pub last_scanned: Option<String>,
}

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
    pub available: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Season {
    pub id: String,
    pub season_number: u32,
    pub name: String,
    pub overview: Option<String>,
    pub poster: Option<String>,
    pub episode_count: u32,
    pub episodes: Vec<Episode>,
    pub available: bool,
    pub downloaded_episodes: u32,
}

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