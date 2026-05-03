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
mod server;
mod storage;

#[cfg(not(debug_assertions))]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| {
            // Em modo de produção, inicia o servidor Next.js e navega para ele assim que estiver pronto
            #[cfg(not(debug_assertions))]
            {
                let app_handle = _app.handle().clone();
                std::thread::spawn(move || {
                    if let Err(e) = server::start_nextjs_server_internal() {
                        eprintln!("[critix] Erro ao iniciar servidor: {e}");
                        return;
                    }
                    println!(
                        "[critix] Servidor Next.js iniciado na porta {}",
                        server::SERVER_PORT
                    );
                    // Aguarda a porta aceitar conexões antes de redirecionar
                    if !server::wait_for_server() {
                        eprintln!(
                            "[critix] Servidor não ficou disponível. Abortando redirecionamento."
                        );
                        return;
                    }
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let url = format!("http://127.0.0.1:{}", server::SERVER_PORT);
                        let _: Result<(), _> =
                            window.eval(&format!("window.location.replace('{}')", url));
                    }
                });
            }
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                server::stop_server();
            }
        })
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
            commands::files::select_media_file_dialog,
            commands::files::select_media_files_dialog,
            commands::files::scan_folder,
            commands::files::open_media,
            commands::files::get_file_metadata,
            commands::files::open_file_location,
            commands::files::open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
