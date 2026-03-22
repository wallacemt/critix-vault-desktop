use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[tauri::command]
pub async fn select_media_file_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file_path = app
        .dialog()
        .file()
        .set_title("Selecione um arquivo de vídeo")
        .add_filter(
            "Vídeo",
            &[
                "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "m2ts",
            ],
        )
        .blocking_pick_file();

    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn select_media_files_dialog(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let files = app
        .dialog()
        .file()
        .set_title("Selecione os arquivos de vídeo")
        .add_filter(
            "Vídeo",
            &[
                "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "m2ts",
            ],
        )
        .blocking_pick_files();

    match files {
        Some(paths) => Ok(paths.into_iter().map(|path| path.to_string()).collect()),
        None => Ok(Vec::new()),
    }
}

#[tauri::command]
pub fn scan_folder(folder_path: String) -> Result<Vec<String>, String> {
    let extensions = [
        ".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v",
    ];
    let mut files = vec![];

    fn scan(dir: &Path, exts: &[&str], out: &mut Vec<String>) -> Result<(), String> {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_dir() {
                scan(&path, exts, out)?;
            } else if let Some(ext) = path.extension() {
                let ext = format!(".{}", ext.to_string_lossy().to_lowercase());
                if exts.contains(&ext.as_str()) {
                    out.push(path.to_string_lossy().to_string());
                }
            }
        }
        Ok(())
    }

    scan(Path::new(&folder_path), &extensions, &mut files)?;
    Ok(files)
}

#[tauri::command]
pub fn open_file_location(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);

    // Check if file exists
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    #[cfg(target_os = "windows")]
    {
        // Open Explorer and select the file
        Command::new("explorer")
            .args(["/select,", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        // Open Finder and select the file
        Command::new("open")
            .args(["-R", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try to use different file managers
        // First try to get the parent directory
        if let Some(parent) = path.parent() {
            let parent_str = parent.to_string_lossy().to_string();

            // Try xdg-open with the parent directory
            let result = Command::new("xdg-open").arg(&parent_str).spawn();

            if result.is_err() {
                // Fallback to common file managers
                let managers = ["nautilus", "dolphin", "thunar", "nemo", "caja"];
                let mut opened = false;

                for manager in &managers {
                    if let Ok(_) = Command::new(manager).arg(&parent_str).spawn() {
                        opened = true;
                        break;
                    }
                }

                if !opened {
                    return Err("No file manager found. Please install xdg-utils or a supported file manager.".to_string());
                }
            }
        } else {
            return Err("Could not determine parent directory".to_string());
        }
    }

    Ok(())
}

#[tauri::command]
pub fn open_media(file_path: String, player: Option<String>) -> Result<(), String> {
    let player = player.unwrap_or_else(|| "default".into());

    match player.as_str() {
        "vlc" => {
            #[cfg(target_os = "windows")]
            {
                Command::new("vlc")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open VLC: {e}"))?;
            }

            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .arg("-a")
                    .arg("VLC")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open VLC: {e}"))?;
            }

            #[cfg(target_os = "linux")]
            {
                Command::new("vlc")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open VLC: {e}"))?;
            }
        }
        _ => {
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", "start", "", &file_path])
                    .spawn()
                    .map_err(|e| format!("Failed to open file: {e}"))?;
            }

            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open file: {e}"))?;
            }

            #[cfg(target_os = "linux")]
            {
                Command::new("xdg-open")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open file: {e}"))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_file_metadata(file_path: String) -> Result<serde_json::Value, String> {
    let meta = fs::metadata(PathBuf::from(file_path)).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "size": meta.len(),
        "is_file": meta.is_file(),
        "is_dir": meta.is_dir(),
        "modified": meta.modified().ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
    }))
}
