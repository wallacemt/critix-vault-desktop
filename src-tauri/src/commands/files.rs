use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[tauri::command]
pub fn scan_folder(folder_path: String) -> Result<Vec<String>, String> {
    let extensions = [".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"];
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
