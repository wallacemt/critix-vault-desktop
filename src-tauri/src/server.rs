use std::fs::{self, File, OpenOptions};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

/// Recursively copies a directory tree.
#[cfg_attr(debug_assertions, allow(dead_code))]
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        let dest_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &dest_path)?;
        } else if ty.is_file() {
            // Skip .db files — we want a fresh database
            let name = entry.file_name();
            if name.to_string_lossy().ends_with(".db")
                || name.to_string_lossy().ends_with(".db-journal")
            {
                continue;
            }
            fs::copy(entry.path(), &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

static SERVER_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

/// Porta em que o servidor Next.js vai rodar em produção
#[allow(dead_code)]
pub const SERVER_PORT: u16 = 1422;

/// Retorna o caminho para o arquivo de log do servidor.
#[allow(dead_code)]
fn get_log_file() -> Result<File, String> {
    // Salva log no diretório do executável ou temp
    let log_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(std::env::temp_dir);

    let log_path = log_dir.join("critix-server.log");
    OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&log_path)
        .map_err(|e| {
            format!(
                "Não foi possível criar log em {}: {}",
                log_path.display(),
                e
            )
        })
}

/// Resolve o diretório onde os recursos do app estão armazenados.
#[cfg_attr(debug_assertions, allow(dead_code))]
fn find_server_dir() -> Result<std::path::PathBuf, String> {
    // Tenta via diretório do executável (funciona em todos os targets)
    let exe_dir = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_parent = exe_dir
        .parent()
        .ok_or("Não foi possível encontrar diretório do executável")?;

    // Tauri array resources: coloca em {install_dir}/resources/server/
    let via_resources = exe_parent.join("resources").join("server");
    if via_resources.is_dir() {
        return Ok(via_resources);
    }

    // Tauri object resources: coloca em {install_dir}/server/
    let via_exe = exe_parent.join("server");
    if via_exe.is_dir() {
        return Ok(via_exe);
    }

    // Fallback: desenvolvimento — diretório relativo ao crate
    let dev_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("server");
    if dev_path.is_dir() {
        return Ok(dev_path);
    }

    Err(format!(
        "Diretório do servidor não encontrado. Caminhos tentados:\n  {}\n  {}\n  {}",
        via_resources.display(),
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

    // Log de saída do servidor para diagnóstico
    let log_file = get_log_file().ok();
    let stdout_cfg: Stdio = match log_file {
        Some(ref f) => f.try_clone().map(Stdio::from).unwrap_or(Stdio::null()),
        None => Stdio::null(),
    };
    let stderr_cfg: Stdio = match log_file {
        Some(f) => Stdio::from(f),
        None => Stdio::null(),
    };

    // Use a writable directory for the database (AppData on Windows, etc.)
    let data_dir = directories::ProjectDirs::from("", "", "critix-vault")
        .map(|dirs| dirs.data_dir().to_path_buf())
        .unwrap_or_else(|| server_dir.join("data"));

    std::fs::create_dir_all(&data_dir).ok();

    // Copy prisma schema & migrations to data dir if not present
    let data_prisma_dir = data_dir.join("prisma");
    let source_prisma_dir = server_dir.join("prisma");
    if !data_prisma_dir.exists() && source_prisma_dir.exists() {
        copy_dir_recursive(&source_prisma_dir, &data_prisma_dir).ok();
    }

    let db_path = data_dir.join("critix.db");

    let mut cmd = Command::new("node");
    cmd.arg(&server_js)
        .env("PORT", SERVER_PORT.to_string())
        .env("NODE_ENV", "production")
        .env("HOSTNAME", "127.0.0.1")
        .env("DATABASE_URL", format!("file:{}", db_path.display()))
        .env("CRITIX_DATA_DIR", data_dir.to_string_lossy().to_string())
        .current_dir(&server_dir)
        .stdin(Stdio::null())
        .stdout(stdout_cfg)
        .stderr(stderr_cfg);

    // No Windows, evita criar janela de console para o processo filho
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn().map_err(|e| {
        format!(
            "Falha ao iniciar o servidor Node.js: {}.\nCertifique-se que o Node.js está instalado e acessível no PATH.",
            e
        )
    })?;

    let mut lock = SERVER_PROCESS.lock().unwrap();
    *lock = Some(child);

    Ok(())
}

/// Aguarda o servidor ficar disponível na porta (máx ~30 s).
/// Retorna `true` se o servidor respondeu, `false` se deu timeout.
pub fn wait_for_server() -> bool {
    use std::net::{SocketAddr, TcpStream};
    use std::time::Duration;

    let addr: SocketAddr = format!("127.0.0.1:{}", SERVER_PORT)
        .parse()
        .expect("invalid socket address");

    for _ in 0..60 {
        // Verifica se o processo ainda está rodando
        {
            let mut lock = SERVER_PROCESS.lock().unwrap();
            if let Some(ref mut child) = *lock {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        eprintln!(
                            "[critix] Servidor encerrou prematuramente com status: {}",
                            status
                        );
                        return false;
                    }
                    Err(e) => {
                        eprintln!("[critix] Erro ao verificar status do servidor: {}", e);
                        return false;
                    }
                    Ok(None) => {} // Processo ainda rodando — ok
                }
            }
        }

        if TcpStream::connect_timeout(&addr, Duration::from_millis(500)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    eprintln!(
        "[critix] Timeout aguardando servidor na porta {}",
        SERVER_PORT
    );
    false
}

/// Para o servidor Next.js (chamado quando o app fecha)
pub fn stop_server() {
    let mut lock = SERVER_PROCESS.lock().unwrap();
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
        let _ = child.wait(); // Evita processo zumbi
    }
}
