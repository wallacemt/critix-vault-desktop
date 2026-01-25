use crate::models::{Movie, Series};
use crate::storage::get_storage;

#[tauri::command]
pub fn save_movies(movies: Vec<Movie>) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        data.movies = movies;
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_movies() -> Result<Vec<Movie>, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.load()?.movies);
    }
    Ok(vec![])
}

#[tauri::command]
pub fn save_series(series: Vec<Series>) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        data.series = series;
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_series() -> Result<Vec<Series>, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.load()?.series);
    }
    Ok(vec![])
}

#[tauri::command]
pub fn update_movie(movie: Movie) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;

        if let Some(existing) = data.movies.iter_mut()
            .find(|m| m.id == movie.id && m.folder_id == movie.folder_id)
        {
            *existing = movie;
        } else if let Some(existing) = data.movies.iter_mut()
            .find(|m| m.file_path == movie.file_path)
        {
            *existing = movie;
        } else {
            data.movies.push(movie);
        }

        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn update_series(series: Series) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;

        if let Some(existing) = data.series.iter_mut()
            .find(|s| s.id == series.id && s.folder_id == series.folder_id)
        {
            *existing = series;
        } else if let Some(existing) = data.series.iter_mut()
            .find(|s| s.file_path == series.file_path)
        {
            *existing = series;
        } else {
            data.series.push(series);
        }

        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn remove_movie(movie_id: String, folder_id: String) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        data.movies.retain(|m| !(m.id == movie_id && m.folder_id == folder_id));
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn remove_series(series_id: String, folder_id: String) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        data.series.retain(|s| !(s.id == series_id && s.folder_id == folder_id));
        manager.save(&data)?;
    }
    Ok(())
}
