mod commands;
/**
 * Critix Vault - Rust Backend
 *
 * Sistema atualizado: Agora usa SQLite via API HTTP para persistência de dados.
 * O Rust backend mantém apenas operações de sistema:
 * - Diálogos de seleção de pasta
 * - Scan de arquivos do sistema
 * - Abertura de arquivos/pastas
 * - Cache de imagens para funcionamento offline
 * - Preferências de UI (última pasta selecionada)
 *
 * REMOVIDO (migrado para SQLite):
 * - Gerenciamento de pastas (agora na API /api/folders)
 * - Metadados de mídia (agora na API /api/movies e /api/series)
 */
mod models;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Folder dialogs (UI only - storage moved to SQLite)
            commands::folders::select_folder_dialog,
            // Settings & state (UI preferences only)
            commands::settings::save_last_selected_folder,
            commands::settings::get_last_selected_folder,
            commands::settings::save_settings,
            commands::settings::get_settings,
            // Image cache (offline functionality)
            commands::cache::cache_image,
            commands::cache::get_cached_image_path,
            commands::cache::is_image_cached,
            // Data management
            commands::data::clear_all_data,
            commands::data::get_cache_info,
            commands::data::get_data_directory,
            commands::data::export_data,
            commands::data::import_data,
            commands::data::write_text_file,
            // File operations (system access)
            commands::files::scan_folder,
            commands::files::open_media,
            commands::files::get_file_metadata,
            commands::files::open_file_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
