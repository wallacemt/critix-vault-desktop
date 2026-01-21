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

// Scan a folder for media files
#[tauri::command]
fn scan_folder(folder_id: String) -> Result<Vec<String>, String> {
    println!("Scanning folder: {}", folder_id);
    
    // In a real implementation, this would:
    // 1. Find all media files (.mkv, .mp4, .avi, etc.)
    // 2. Return their paths
    
    Ok(Vec::new())
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
