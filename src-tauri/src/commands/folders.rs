
#[tauri::command]
pub async fn select_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    // Use blocking_pick_folder in spawn_blocking so the Win32 file dialog runs on
    // a dedicated blocking thread with a proper COM apartment. The callback-based
    // pick_folder can miss the dialog on maximized windows in tauri-plugin-dialog
    // 2.7.x because the async runtime thread lacks the UI context needed to ensure
    // the dialog appears on top.
    let result = tokio::task::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Selecione uma pasta para adicionar à Biblioteca")
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.map(|p| p.to_string()))
}
