use serde::{Deserialize, Serialize};

use crate::models::{
    Folder,
    Movie,
    Series,
    AppSettings,
};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppData {
    pub folders: Vec<Folder>,
    pub movies: Vec<Movie>,
    pub series: Vec<Series>,
    pub last_selected_folder: Option<String>,
    pub settings: AppSettings,
}
