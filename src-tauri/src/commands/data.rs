use crate::models::CacheInfo;
use crate::storage::get_storage;
use std::fs;

#[tauri::command]
pub fn clear_all_data() -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        manager.clear_all_data()?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_cache_info() -> Result<CacheInfo, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return manager.get_cache_info();
    }
    Err("Storage not available".into())
}

#[tauri::command]
pub fn get_data_directory() -> Result<String, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.data_dir.to_string_lossy().to_string());
    }
    Err("Storage not available".into())
}

#[tauri::command]
pub fn export_data() -> Result<String, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let data = manager.load()?;
        return serde_json::to_string_pretty(&data).map_err(|e| e.to_string());
    }
    Err("Storage not available".into())
}

#[tauri::command]
pub fn import_data(json_data: String) -> Result<(), String> {
    let data = serde_json::from_str(&json_data).map_err(|e| e.to_string())?;
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())
}
