use crate::models::CacheInfo;
use crate::storage::get_storage;
use std::fs;
use tauri_plugin_dialog::DialogExt;

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

// The save path always comes from the native dialog this command opens itself —
// unlike a `write_text_file(path, content)` command, the renderer never gets to
// name an arbitrary filesystem path, so there's nothing to validate/sandbox here.
#[tauri::command]
pub fn export_backup_file(
    app: tauri::AppHandle,
    content: String,
    default_file_name: String,
) -> Result<bool, String> {
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&default_file_name)
        .add_filter("JSON", &["json"])
        .blocking_save_file();

    let Some(file_path) = file_path else {
        return Ok(false);
    };

    let path = file_path.into_path().map_err(|e| e.to_string())?;
    fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(true)
}
