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
        // LSF-PHASE5-006 / LSF-2026-001: credentials are unconditionally
        // restored from disk so save_settings cannot modify them regardless
        // of what the renderer sends. The only mutation path is
        // set_torrent_credentials.
        let preserved_pass = data.settings.torrent_client_pass.clone();
        data.settings = settings;
        data.settings.torrent_client_pass = preserved_pass;
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut safe = manager.load()?.settings;
        // LSF-PHASE5-006: never return the password to the renderer.
        // The renderer uses a placeholder "••••••••" and calls
        // `set_torrent_credentials` when it needs to update credentials.
        safe.torrent_client_pass = None;
        return Ok(safe);
    }
    Ok(AppSettings::default())
}

/// Write-only command for torrent credentials (LSF-PHASE5-006).
///
/// Credentials are updated in isolation so they are never bundled with the
/// rest of `AppSettings` in a round-trip. The renderer supplies the new
/// values; the Rust side loads the current settings, patches only the
/// credential fields, and saves — the password is never returned outbound.
#[tauri::command]
pub fn set_torrent_credentials(
    user: Option<String>,
    pass: Option<String>,
) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        data.settings.torrent_client_user = user;
        data.settings.torrent_client_pass = pass;
        manager.save(&data)?;
    }
    Ok(())
}
