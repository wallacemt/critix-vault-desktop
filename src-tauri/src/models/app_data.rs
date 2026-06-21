use serde::{Deserialize, Serialize};

use crate::models::{
    Folder,
    Movie,
    Series,
    AppSettings,
};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppData {
    #[serde(default)]
    pub folders: Vec<Folder>,
    #[serde(default)]
    pub movies: Vec<Movie>,
    #[serde(default)]
    pub series: Vec<Series>,
    #[serde(default)]
    pub last_selected_folder: Option<String>,
    #[serde(default)]
    pub settings: AppSettings,
}
