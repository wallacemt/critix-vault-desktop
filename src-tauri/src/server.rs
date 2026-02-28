use std::process::{Child, Command};
use std::sync::Mutex;

static SERVER_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

/// Porta em que o servidor Next.js vai rodar em produção
#[allow(dead_code)]
pub const SERVER_PORT: u16 = 1422;

/// Resolve o diretório onde os recursos do app estão armazenados.
#[cfg_attr(debug_assertions, allow(dead_code))]
fn find_server_dir() -> Result<std::path::PathBuf, String> {
    // Tenta via diretório do executável (funciona em todos os targets)
    let exe_dir = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_parent = exe_dir
        .parent()
        .ok_or("Não foi possível encontrar diretório do executável")?;

    // Tauri coloca recursos em {install_dir}/server/ quando dest é "server/"
    let via_exe = exe_parent.join("server");
    if via_exe.is_dir() {
        return Ok(via_exe);
    }

    // Fallback: desenvolvimento — diretório relativo ao crate
    let dev_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.join("resources").join("server"))
        .unwrap_or_default();
    if dev_path.is_dir() {
        return Ok(dev_path);
    }

    Err(format!(
        "Diretório do servidor não encontrado. Caminhos tentados:\n  {}\n  {}",
        via_exe.display(),
        dev_path.display()
    ))
}

/// Inicia o servidor Next.js standalone como processo filho.
/// Chamado automaticamente no setup do Tauri (apenas em modo produção).
#[allow(dead_code)]
pub fn start_nextjs_server_internal() -> Result<(), String> {
    let server_dir = find_server_dir()?;
    let server_js = server_dir.join("server.js");

    if !server_js.exists() {
        return Err(format!(
            "Arquivo do servidor não encontrado: {}.\nExecute 'bun run build:app' para gerar o build.",
            server_js.display()
        ));
    }

    let child = Command::new("node")
        .arg(&server_js)
        .env("PORT", SERVER_PORT.to_string())
        .env("NODE_ENV", "production")
        .env("HOSTNAME", "127.0.0.1")
        .current_dir(&server_dir)
        .spawn()
        .map_err(|e| {
            format!(
                "Falha ao iniciar o servidor Node.js: {}.\nCertifique-se que o Node.js está instalado e acessível no PATH.",
                e
            )
        })?;

    let mut lock = SERVER_PROCESS.lock().unwrap();
    *lock = Some(child);

    Ok(())
}


/// Para o servidor Next.js (chamado quando o app fecha)
pub fn stop_server() {
    let mut lock = SERVER_PROCESS.lock().unwrap();
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
    }
}
