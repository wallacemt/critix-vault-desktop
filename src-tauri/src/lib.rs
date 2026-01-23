use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Folder {
    id: String,
    path: String,
    name: String,
    media_count: usize,
    added_at: String,
    last_scanned: Option<String>,
}

// Open folder selection dialog
#[tauri::command]
async fn select_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt};
    
    let folder_path = app.dialog()
        .file()
        .set_title("Selecione uma pasta para adicionar para Blibioteca")
        .blocking_pick_folder();
    print!("S");
    match folder_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

// Add a folder to the monitored list
#[tauri::command]
fn add_folder(path: String) -> Result<Folder, String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err("Path does not exist".to_string());
    }
    
    if !path_buf.is_dir() {
        return Err("Path is not a directory".to_string());
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
    
    Ok(folder)
}

// Remove a folder from the monitored list
#[tauri::command]
fn remove_folder(folder_id: String) -> Result<(), String> {
    // In a real implementation, this would remove from a database
    println!("Removing folder: {}", folder_id);
    Ok(())
}

// Get all monitored folders
#[tauri::command]
fn get_folders() -> Result<Vec<Folder>, String> {
    // In a real implementation, this would read from a database
    // For now, return an empty list
    Ok(Vec::new())
}

// Scan a folder for media files recursively
#[tauri::command]
fn scan_folder(folder_path: String) -> Result<Vec<String>, String> {
    use std::fs;
    use std::path::Path;
    
    let media_extensions = vec![".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"];
    let mut media_files = Vec::new();
    
    fn scan_dir_recursive(dir: &Path, extensions: &[&str], files: &mut Vec<String>) -> Result<(), String> {
        if !dir.is_dir() {
            return Ok(());
        }
        
        let entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read directory: {}", e))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            
            if path.is_dir() {
                scan_dir_recursive(&path, extensions, files)?;
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_str = format!(".{}", ext.to_string_lossy().to_lowercase());
                    if extensions.contains(&ext_str.as_str()) {
                        if let Some(path_str) = path.to_str() {
                            files.push(path_str.to_string());
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    let path = Path::new(&folder_path);
    scan_dir_recursive(path, &media_extensions, &mut media_files)?;
    
    Ok(media_files)
}

// Open a media file with the default or specified player
#[tauri::command]
fn open_media(file_path: String, player: Option<String>) -> Result<(), String> {
    let player_command = player.unwrap_or_else(|| "default".to_string());
    
    match player_command.as_str() {
        "vlc" => {
            // Try to open with VLC
            #[cfg(target_os = "windows")]
            {
                Command::new("vlc")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open VLC: {}", e))?;
            }
            
            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .arg("-a")
                    .arg("VLC")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open VLC: {}", e))?;
            }
            
            #[cfg(target_os = "linux")]
            {
                Command::new("vlc")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open VLC: {}", e))?;
            }
        }
        _ => {
            // Open with default player
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(&["/C", "start", "", &file_path])
                    .spawn()
                    .map_err(|e| format!("Failed to open file: {}", e))?;
            }
            
            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open file: {}", e))?;
            }
            
            #[cfg(target_os = "linux")]
            {
                Command::new("xdg-open")
                    .arg(&file_path)
                    .spawn()
                    .map_err(|e| format!("Failed to open file: {}", e))?;
            }
        }
    }
    
    Ok(())
}

// Get file metadata
#[tauri::command]
fn get_file_metadata(file_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    
    let size = metadata.len();
    let modified = metadata.modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs());
    
    Ok(serde_json::json!({
        "size": size,
        "modified": modified,
        "is_file": metadata.is_file(),
        "is_dir": metadata.is_dir(),
    }))
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            select_folder_dialog,
            add_folder,
            remove_folder,
            get_folders,
            scan_folder,
            open_media,
            get_file_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
