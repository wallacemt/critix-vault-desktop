use crate::storage::get_storage;

#[tauri::command]
pub async fn cache_image(url: String) -> Result<String, String> {
    {
        let storage = get_storage()?;
        if let Some(manager) = storage.as_ref() {
            if let Some(path) = manager.get_cached_image(&url) {
                return Ok(path);
            }
        }
    }

    let bytes = reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return manager.cache_image(&url, &bytes);
    }

    Err("Storage not available".into())
}

#[tauri::command]
pub fn get_cached_image_path(url: String) -> Result<Option<String>, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.get_cached_image(&url));
    }
    Ok(None)
}

#[tauri::command]
pub fn is_image_cached(url: String) -> Result<bool, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.get_cached_image(&url).is_some());
    }
    Ok(false)
}
