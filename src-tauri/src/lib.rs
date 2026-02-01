mod commands;
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
mod models;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Folder management
            commands::folders::add_folder,
            commands::folders::select_folder_dialog,
            commands::folders::remove_folder,
            commands::folders::get_folders,
            commands::folders::update_folder,
            // Media management
            commands::media::save_movies,
            commands::media::get_movies,
            commands::media::save_series,
            commands::media::get_series,
            commands::media::update_movie,
            commands::media::update_series,
            commands::media::remove_movie,
            commands::media::remove_series,
            // Settings & state
            commands::settings::save_last_selected_folder,
            commands::settings::get_last_selected_folder,
            commands::settings::save_settings,
            commands::settings::get_settings,
            // Image cache
            commands::cache::cache_image,
            commands::cache::get_cached_image_path,
            commands::cache::is_image_cached,
            // Data management
            commands::data::clear_all_data,
            commands::data::get_cache_info,
            commands::data::get_data_directory,
            commands::data::export_data,
            commands::data::import_data,
            // File operations
            commands::files::scan_folder,
            commands::files::open_media,
            commands::files::get_file_metadata,
            commands::files::open_file_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
