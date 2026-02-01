use serde::{Deserialize, Serialize};
use crate::models::{Episode};
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Season {
    pub id: String,
    pub season_number: u32,
    pub name: String,
    pub overview: Option<String>,
    pub poster: Option<String>,
    pub episode_count: u32,
    pub episodes: Vec<Episode>,
    pub available: Option<bool>,
    pub downloaded_episodes: u32,
}