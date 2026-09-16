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
        let mut data = manager.load()?;
        data.settings.torrent_client_user = None;
        data.settings.torrent_client_pass = None;
        return serde_json::to_string_pretty(&data).map_err(|e| e.to_string());
    }
    Err("Storage not available".into())
}

#[tauri::command]
pub fn import_data(json_data: String) -> Result<(), String> {
    let mut data: crate::models::AppData = serde_json::from_str(&json_data).map_err(|e| e.to_string())?;
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let current = manager.load()?;
        data.settings.torrent_client_user = current.settings.torrent_client_user;
        data.settings.torrent_client_pass = current.settings.torrent_client_pass;
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    let file = std::path::Path::new(&path);
    let name = file.file_name().and_then(|n| n.to_str()).unwrap_or_default();
    if !name.starts_with("critix-vault-backup-") || file.extension().and_then(|e| e.to_str()) != Some("json") {
        return Err("Only Critix Vault JSON backups can be written".to_string());
    }
    fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())
}
