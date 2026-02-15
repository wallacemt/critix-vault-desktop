

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
