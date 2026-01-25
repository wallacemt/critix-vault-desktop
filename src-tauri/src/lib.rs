/**
 * Critix Vault - Rust Backend
 * 
 * Sistema de persistência de dados robusto que armazena:
 * - Pastas monitoradas
 * - Metadados de mídia (filmes e séries)
 * - Cache de imagens para funcionamento offline
 * 
 * Os dados são armazenados no diretório de dados da aplicação:
 * - Windows: C:\Users\{user}\AppData\Roaming\critix-vault\
 * - macOS: ~/Library/Application Support/critix-vault/
 * - Linux: ~/.local/share/critix-vault/
 */

use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use uuid::Uuid;

// ============================================================================
// Data Structures
// ============================================================================



#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppData {
    pub folders: Vec<Folder>,
    pub movies: Vec<Movie>,
    pub series: Vec<Series>,
    pub last_selected_folder: Option<String>,
    pub settings: AppSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub default_player: String,
    pub enable_image_cache: bool,
    pub auto_scan_on_startup: bool,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_player: "default".to_string(),
            enable_image_cache: true,
            auto_scan_on_startup: false,
            theme: "dark".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheInfo {
    pub total_size_bytes: u64,
    pub image_count: u32,
    pub data_file_size: u64,
}

// ============================================================================
// Storage Manager - Handles all data persistence
// ============================================================================

struct StorageManager {
    data_dir: PathBuf,
    cache_dir: PathBuf,
    data_file: PathBuf,
}

impl StorageManager {
    fn new() -> Result<Self, String> {
        let proj_dirs = ProjectDirs::from("com", "critix", "critix-vault")
            .ok_or("Failed to get project directories")?;

        let data_dir = proj_dirs.data_dir().to_path_buf();
        let cache_dir = data_dir.join("cache");
        let images_dir = cache_dir.join("images");

        // Create directories if they don't exist
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
        fs::create_dir_all(&images_dir)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;

        let data_file = data_dir.join("app_data.json");

        Ok(Self {
            data_dir,
            cache_dir,
            data_file,
        })
    }

    fn load_data(&self) -> Result<AppData, String> {
        if !self.data_file.exists() {
            return Ok(AppData::default());
        }

        let content = fs::read_to_string(&self.data_file)
            .map_err(|e| format!("Failed to read data file: {}", e))?;

        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse data file: {}", e))
    }

    fn save_data(&self, data: &AppData) -> Result<(), String> {
        let content = serde_json::to_string_pretty(data)
            .map_err(|e| format!("Failed to serialize data: {}", e))?;

        // Write to temp file first, then rename (atomic operation)
        let temp_file = self.data_file.with_extension("json.tmp");
        
        fs::write(&temp_file, &content)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
        
        fs::rename(&temp_file, &self.data_file)
            .map_err(|e| format!("Failed to save data file: {}", e))?;

        Ok(())
    }

    fn get_image_cache_path(&self, url: &str) -> PathBuf {
        let mut hasher = Sha256::new();
        hasher.update(url.as_bytes());
        let hash = hex::encode(hasher.finalize());
        
        // Extract extension from URL
        let ext = url.split('.').last().unwrap_or("jpg");
        let ext = if ext.contains('?') {
            ext.split('?').next().unwrap_or("jpg")
        } else {
            ext
        };
        
        self.cache_dir.join("images").join(format!("{}.{}", hash, ext))
    }

    fn cache_image(&self, url: &str, data: &[u8]) -> Result<String, String> {
        let cache_path = self.get_image_cache_path(url);
        
        fs::write(&cache_path, data)
            .map_err(|e| format!("Failed to cache image: {}", e))?;
        
        Ok(cache_path.to_string_lossy().to_string())
    }

    fn get_cached_image(&self, url: &str) -> Option<String> {
        let cache_path = self.get_image_cache_path(url);
        
        if cache_path.exists() {
            Some(cache_path.to_string_lossy().to_string())
        } else {
            None
        }
    }

    fn clear_all_data(&self) -> Result<(), String> {
        // Remove data file
        if self.data_file.exists() {
            fs::remove_file(&self.data_file)
                .map_err(|e| format!("Failed to remove data file: {}", e))?;
        }

        // Clear image cache
        let images_dir = self.cache_dir.join("images");
        if images_dir.exists() {
            fs::remove_dir_all(&images_dir)
                .map_err(|e| format!("Failed to clear image cache: {}", e))?;
            fs::create_dir_all(&images_dir)
                .map_err(|e| format!("Failed to recreate cache directory: {}", e))?;
        }

        Ok(())
    }

    fn get_cache_info(&self) -> Result<CacheInfo, String> {
        let mut total_size: u64 = 0;
        let mut image_count: u32 = 0;

        let images_dir = self.cache_dir.join("images");
        if images_dir.exists() {
            for entry in fs::read_dir(&images_dir).map_err(|e| e.to_string())? {
                if let Ok(entry) = entry {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_file() {
                            total_size += metadata.len();
                            image_count += 1;
                        }
                    }
                }
            }
        }

        let data_file_size = if self.data_file.exists() {
            fs::metadata(&self.data_file).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        Ok(CacheInfo {
            total_size_bytes: total_size,
            image_count,
            data_file_size,
        })
    }

    fn get_data_dir(&self) -> String {
        self.data_dir.to_string_lossy().to_string()
    }
}

// Global storage instance
static STORAGE: Mutex<Option<StorageManager>> = Mutex::new(None);

fn get_storage() -> Result<std::sync::MutexGuard<'static, Option<StorageManager>>, String> {
    let mut storage = STORAGE.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    if storage.is_none() {
        *storage = Some(StorageManager::new()?);
    }
    
    Ok(storage)
}

// ============================================================================
// Tauri Commands - Folder Management
// ============================================================================

#[tauri::command]
async fn select_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
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

    // Save to storage
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        
        // Check if folder already exists
        if data.folders.iter().any(|f| f.path == path) {
            return Err("Folder already added".to_string());
        }
        
        data.folders.push(folder.clone());
        manager.save_data(&data)?;
    }

    Ok(folder)
}

#[tauri::command]
fn remove_folder(folder_id: String) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        
        // Remove folder
        data.folders.retain(|f| f.id != folder_id);
        
        // Remove associated media
        data.movies.retain(|m| m.folder_id != folder_id);
        data.series.retain(|s| s.folder_id != folder_id);
        
        // Clear last selected if it was this folder
        if data.last_selected_folder.as_ref() == Some(&folder_id) {
            data.last_selected_folder = data.folders.first().map(|f| f.id.clone());
        }
        
        manager.save_data(&data)?;
    }
    
    Ok(())
}

#[tauri::command]
fn get_folders() -> Result<Vec<Folder>, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let data = manager.load_data()?;
        return Ok(data.folders);
    }
    Ok(Vec::new())
}

#[tauri::command]
fn update_folder(folder: Folder) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        
        if let Some(existing) = data.folders.iter_mut().find(|f| f.id == folder.id) {
            *existing = folder;
        }
        
        manager.save_data(&data)?;
    }
    Ok(())
}

// ============================================================================
// Tauri Commands - Media Management
// ============================================================================

#[tauri::command]
fn save_movies(movies: Vec<Movie>) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        data.movies = movies;
        manager.save_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn get_movies() -> Result<Vec<Movie>, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let data = manager.load_data()?;
        return Ok(data.movies);
    }
    Ok(Vec::new())
}

#[tauri::command]
fn save_series(series: Vec<Series>) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        data.series = series;
        manager.save_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn get_series() -> Result<Vec<Series>, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let data = manager.load_data()?;
        return Ok(data.series);
    }
    Ok(Vec::new())
}

#[tauri::command]
fn update_movie(movie: Movie) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        
        // Find and update or insert
        if let Some(existing) = data.movies.iter_mut().find(|m| m.id == movie.id && m.folder_id == movie.folder_id) {
            *existing = movie;
        } else if let Some(existing) = data.movies.iter_mut().find(|m| m.file_path == movie.file_path) {
            *existing = movie;
        } else {
            data.movies.push(movie);
        }
        
        manager.save_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn update_series(series: Series) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        
        // Find and update or insert
        if let Some(existing) = data.series.iter_mut().find(|s| s.id == series.id && s.folder_id == series.folder_id) {
            *existing = series;
        } else if let Some(existing) = data.series.iter_mut().find(|s| s.file_path == series.file_path) {
            *existing = series;
        } else {
            data.series.push(series);
        }
        
        manager.save_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn remove_movie(movie_id: String, folder_id: String) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        data.movies.retain(|m| !(m.id == movie_id && m.folder_id == folder_id));
        manager.save_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn remove_series(series_id: String, folder_id: String) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        data.series.retain(|s| !(s.id == series_id && s.folder_id == folder_id));
        manager.save_data(&data)?;
    }
    Ok(())
}

// ============================================================================
// Tauri Commands - Settings & State
// ============================================================================

#[tauri::command]
fn save_last_selected_folder(folder_id: Option<String>) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        data.last_selected_folder = folder_id;
        manager.save_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn get_last_selected_folder() -> Result<Option<String>, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let data = manager.load_data()?;
        return Ok(data.last_selected_folder);
    }
    Ok(None)
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let mut data = manager.load_data()?;
        data.settings = settings;
        manager.save_data(&data)?;
    }
    Ok(())
}

#[tauri::command]
fn get_settings() -> Result<AppSettings, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let data = manager.load_data()?;
        return Ok(data.settings);
    }
    Ok(AppSettings::default())
}

// ============================================================================
// Tauri Commands - Image Cache
// ============================================================================

#[tauri::command]
async fn cache_image(url: String) -> Result<String, String> {
    // Check if already cached first
    {
        let storage = get_storage()?;
        if let Some(ref manager) = *storage {
            if let Some(cached_path) = manager.get_cached_image(&url) {
                return Ok(cached_path);
            }
        }
    }
    
    // Download the image
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download image: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to download image: HTTP {}", response.status()));
    }
    
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image data: {}", e))?;
    
    // Cache the image
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        return manager.cache_image(&url, &bytes);
    }
    
    Err("Storage not available".to_string())
}

#[tauri::command]
fn get_cached_image_path(url: String) -> Result<Option<String>, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        return Ok(manager.get_cached_image(&url));
    }
    Ok(None)
}

#[tauri::command]
fn is_image_cached(url: String) -> Result<bool, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        return Ok(manager.get_cached_image(&url).is_some());
    }
    Ok(false)
}

// ============================================================================
// Tauri Commands - Data Management
// ============================================================================

#[tauri::command]
fn clear_all_data() -> Result<(), String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        manager.clear_all_data()?;
    }
    Ok(())
}

#[tauri::command]
fn get_cache_info() -> Result<CacheInfo, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        return manager.get_cache_info();
    }
    Ok(CacheInfo {
        total_size_bytes: 0,
        image_count: 0,
        data_file_size: 0,
    })
}

#[tauri::command]
fn get_data_directory() -> Result<String, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        return Ok(manager.get_data_dir());
    }
    Err("Storage not available".to_string())
}

#[tauri::command]
fn export_data() -> Result<String, String> {
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        let data = manager.load_data()?;
        return serde_json::to_string_pretty(&data)
            .map_err(|e| format!("Failed to export data: {}", e));
    }
    Err("Storage not available".to_string())
}

#[tauri::command]
fn import_data(json_data: String) -> Result<(), String> {
    let data: AppData = serde_json::from_str(&json_data)
        .map_err(|e| format!("Invalid data format: {}", e))?;
    
    let storage = get_storage()?;
    if let Some(ref manager) = *storage {
        manager.save_data(&data)?;
    }
    Ok(())
}

// ============================================================================
// Tauri Commands - File Operations
// ============================================================================

#[tauri::command]
fn scan_folder(folder_path: String) -> Result<Vec<String>, String> {
    let media_extensions = vec![".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"];
    let mut media_files = Vec::new();

    fn scan_dir_recursive(
        dir: &Path,
        extensions: &[&str],
        files: &mut Vec<String>,
    ) -> Result<(), String> {
        if !dir.is_dir() {
            return Ok(());
        }

        let entries =
            fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;

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

#[tauri::command]
fn open_media(file_path: String, player: Option<String>) -> Result<(), String> {
    let player_command = player.unwrap_or_else(|| "default".to_string());

    match player_command.as_str() {
        "vlc" => {
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
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", "start", "", &file_path])
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

#[tauri::command]
fn get_file_metadata(file_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {}", e))?;

    let size = metadata.len();
    let modified = metadata
        .modified()
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

// ============================================================================
// Application Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Folder management
            select_folder_dialog,
            add_folder,
            remove_folder,
            get_folders,
            update_folder,
            // Media management
            save_movies,
            get_movies,
            save_series,
            get_series,
            update_movie,
            update_series,
            remove_movie,
            remove_series,
            // Settings & state
            save_last_selected_folder,
            get_last_selected_folder,
            save_settings,
            get_settings,
            // Image cache
            cache_image,
            get_cached_image_path,
            is_image_cached,
            // Data management
            clear_all_data,
            get_cache_info,
            get_data_directory,
            export_data,
            import_data,
            // File operations
            scan_folder,
            open_media,
            get_file_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
