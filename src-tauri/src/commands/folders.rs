use crate::models::Folder;
use crate::storage::get_storage;
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
pub fn add_folder(path: String) -> Result<Folder, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err("Path does not exist".into());
    }

    if !path_buf.is_dir() {
        return Err("Path is not a directory".into());
    }

    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let folder = Folder {
        id: Uuid::new_v4().to_string(),
        path: path.clone(),
        name,
        media_count: 0,
        added_at: chrono::Utc::now().to_rfc3339(),
        last_scanned: None,
    };

    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;

        if data.folders.iter().any(|f| f.path == path) {
            return Err("Folder already added".into());
        }

        data.folders.push(folder.clone());
        manager.save(&data)?;
    }

    Ok(folder)
}

#[tauri::command]
pub fn remove_folder(folder_id: String) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;

        data.folders.retain(|f| f.id != folder_id);
        data.movies.retain(|m| m.folder_id != folder_id);
        data.series.retain(|s| s.folder_id != folder_id);

        if data.last_selected_folder.as_ref() == Some(&folder_id) {
            data.last_selected_folder = data.folders.first().map(|f| f.id.clone());
        }

        manager.save(&data)?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_folders() -> Result<Vec<Folder>, String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        return Ok(manager.load()?.folders);
    }
    Ok(vec![])
}

#[tauri::command]
pub fn update_folder(folder: Folder) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(manager) = storage.as_ref() {
        let mut data = manager.load()?;
        if let Some(existing) = data.folders.iter_mut().find(|f| f.id == folder.id) {
            *existing = folder;
        }
        manager.save(&data)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn select_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder_path = app
        .dialog()
        .file()
        .set_title("Selecione uma pasta para adicionar à Biblioteca")
        .blocking_pick_folder();
    match folder_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}
