use crate::models::AppSettings;
use crate::storage::get_storage;

#[tauri::command]
pub fn save_last_selected_folder(folder_id: Option<String>) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        data.last_selected_folder = folder_id;
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_last_selected_folder() -> Result<Option<String>, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.load()?.last_selected_folder);
    }
    Ok(None)
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        data.settings = settings;
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.load()?.settings);
    }
    Ok(AppSettings::default())
}
