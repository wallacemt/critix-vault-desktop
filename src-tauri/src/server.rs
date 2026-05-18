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

/// Finds the Node.js executable to use.
/// Prefers a bundled node.exe (safe for MSIX/Store sandbox where system PATH is restricted).
/// Falls back to the system "node" command.
#[cfg_attr(debug_assertions, allow(dead_code))]
fn find_node_executable() -> std::path::PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));

    if let Some(ref dir) = exe_dir {
        // Tauri array resources layout: {install_dir}/resources/server/node.exe
        let candidate = dir.join("resources").join("server").join("node.exe");
        if candidate.exists() {
            println!("[critix] Using bundled node: {}", candidate.display());
            return candidate;
        }
        // Tauri object resources layout: {install_dir}/server/node.exe
        let candidate = dir.join("server").join("node.exe");
        if candidate.exists() {
            println!("[critix] Using bundled node: {}", candidate.display());
            return candidate;
        }
        // Bundled next to the executable
        let candidate = dir.join("node.exe");
        if candidate.exists() {
            println!("[critix] Using bundled node: {}", candidate.display());
            return candidate;
        }
    }

    println!("[critix] Bundled node.exe not found — falling back to system node");
    std::path::PathBuf::from("node")
}

fn validate_server_bundle(server_dir: &std::path::Path) -> Result<(), String> {
    let server_js = server_dir.join("server.js");
    if !server_js.exists() {
        return Err(format!(
            "Arquivo do servidor não encontrado: {}",
            server_js.display()
        ));
    }

    let chunks_dir = server_dir.join("_next_build").join("server").join("chunks");
    if !chunks_dir.is_dir() {
        return Err(format!(
            "Diretório de chunks não encontrado: {}",
            chunks_dir.display()
        ));
    }

    let js_chunk_count = fs::read_dir(&chunks_dir)
        .map_err(|e| {
            format!(
                "Falha ao ler diretório de chunks {}: {}",
                chunks_dir.display(),
                e
            )
        })?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .path()
                .extension()
                .map(|ext| ext.eq_ignore_ascii_case("js"))
                .unwrap_or(false)
        })
        .count();

    if js_chunk_count == 0 {
        return Err(format!(
            "Nenhum chunk .js encontrado em {}",
            chunks_dir.display()
        ));
    }

    println!(
        "[critix] Bundle validado: {} chunk(s) encontrados em {}",
        js_chunk_count,
        chunks_dir.display()
    );

    Ok(())
}

/// Porta em que o servidor Next.js vai rodar em produção
#[allow(dead_code)]
pub const SERVER_PORT: u16 = 1422;

/// Retorna o caminho para o arquivo de log do servidor.
/// Uses %TEMP% so it works under the MSIX sandbox (install dir is read-only).
#[allow(dead_code)]
fn get_log_file() -> Result<File, String> {
    let log_path = std::env::temp_dir().join("critix-server.log");
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

fn load_external_api_from_runtime_config(server_dir: &std::path::Path) -> Option<String> {
    let config_path = server_dir.join("runtime-config.json");
    let raw = fs::read_to_string(&config_path).ok()?;
    let parsed = serde_json::from_str::<serde_json::Value>(&raw).ok()?;
    parsed
        .get("externalApiBase")
        .and_then(|v| v.as_str())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

/// Inicia o servidor Next.js standalone como processo filho.
/// Chamado automaticamente no setup do Tauri (apenas em modo produção).
#[allow(dead_code)]
pub fn start_nextjs_server_internal() -> Result<(), String> {
    let server_dir = find_server_dir()?;
    validate_server_bundle(&server_dir)?;
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

    // Sync prisma schema & migrations to data dir on every startup.
    // This keeps older AppData installs up to date with new bundled migrations.
    let data_prisma_dir = data_dir.join("prisma");
    let source_prisma_dir = server_dir.join("prisma");
    if source_prisma_dir.exists() {
        if let Err(err) = copy_dir_recursive(&source_prisma_dir, &data_prisma_dir) {
            eprintln!(
                "[critix] Falha ao sincronizar prisma para AppData ({} -> {}): {}",
                source_prisma_dir.display(),
                data_prisma_dir.display(),
                err
            );
        }
    }

    let db_path = data_dir.join("critix.db");
    let external_api_url = if let Ok(url) = std::env::var("CRITIX_EXTERNAL_API_URL") {
        println!("[critix] External API source: CRITIX_EXTERNAL_API_URL");
        url
    } else if let Ok(url) = std::env::var("NEXT_PUBLIC_CRITIX_API_URL") {
        println!("[critix] External API source: NEXT_PUBLIC_CRITIX_API_URL");
        url
    } else if let Some(url) = load_external_api_from_runtime_config(&server_dir) {
        println!("[critix] External API source: runtime-config.json");
        url
    } else {
        println!("[critix] External API source: fallback default");
        "http://127.0.0.1:8080".to_string()
    };

    println!("[critix] External API base: {}", external_api_url);

    let node_exe = find_node_executable();
    let mut cmd = Command::new(&node_exe);
    cmd.arg(&server_js)
        .env("PORT", SERVER_PORT.to_string())
        .env("NODE_ENV", "production")
        .env("HOSTNAME", "127.0.0.1")
        .env("CRITIX_EXTERNAL_API_URL", external_api_url)
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

/// Resultado detalhado de wait_for_server().
pub enum ServerWaitResult {
    /// Servidor respondeu na porta — ok.
    Ready,
    /// O processo Node.js encerrou antes de abrir a porta.
    ProcessCrashed { exit_code: Option<i32> },
    /// Timeout esgotado sem resposta.
    Timeout,
}

/// Aguarda o servidor ficar disponível e pronto para servir requisições (máx ~3 min).
///
/// Usa um HTTP health-check em vez de apenas verificar se a porta TCP está aberta.
/// O check TCP simples retorna "pronto" assim que o socket abre, mas o servidor pode
/// ainda estar inicializando o Prisma/better-sqlite3 (que bloqueia o event loop do
/// Node.js durante o scan do Windows Defender na primeira execução). O resultado seria
/// o WebView2 navegar para um servidor que não consegue responder, causando loading
/// infinito. O health-check HTTP só retorna quando o servidor processa a requisição.
pub fn wait_for_server() -> ServerWaitResult {
    use std::time::Duration;

    let health_url = format!("http://127.0.0.1:{}/api/health", SERVER_PORT);

    // Cria o cliente HTTP uma vez — timeout de 12 s por tentativa cobre o caso em que
    // a porta está aberta mas o event loop está bloqueado (scan do Defender).
    // Após o timeout, a tentativa é descartada e o loop reinicia; quando o Defender
    // terminar o scan o servidor responde e o loop encerra.
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(12))
        .connect_timeout(Duration::from_secs(2))
        .build()
        .unwrap_or_default();

    // Até ~3 minutos: 240 iterações × (até 12 s timeout + 0,5 s sleep).
    // Na prática a maioria das iterações é "connection refused" (retorna em <1 ms),
    // então o loop fica rápido enquanto o servidor ainda não abriu a porta.
    for attempt in 0..240u32 {
        // Verifica se o processo ainda está rodando
        {
            let mut lock = SERVER_PROCESS.lock().unwrap();
            if let Some(ref mut child) = *lock {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        let code = status.code();
                        eprintln!(
                            "[critix] Servidor encerrou prematuramente com status: {:?}",
                            code
                        );
                        return ServerWaitResult::ProcessCrashed { exit_code: code };
                    }
                    Err(e) => {
                        eprintln!("[critix] Erro ao verificar status do servidor: {}", e);
                        return ServerWaitResult::ProcessCrashed { exit_code: None };
                    }
                    Ok(None) => {} // Processo ainda rodando — ok
                }
            }
        }

        match client.get(&health_url).send() {
            Ok(resp) => {
                // Qualquer resposta HTTP (200 ou 500) significa que o servidor está
                // processando requisições — pronto para receber o WebView2.
                println!("[critix] Servidor pronto (tentativa {}, status {})", attempt + 1, resp.status());
                return ServerWaitResult::Ready;
            }
            Err(e) if e.is_timeout() => {
                // Porta aberta mas event loop bloqueado (scan do Defender em andamento).
                // Aguarda e tenta novamente — não é um crash.
                eprintln!("[critix] Health-check timeout (tentativa {}): {}", attempt + 1, e);
            }
            Err(_) => {
                // Conexão recusada — servidor ainda não abriu a porta. Normal durante startup.
            }
        }

        std::thread::sleep(Duration::from_millis(500));
    }

    eprintln!(
        "[critix] Timeout aguardando servidor na porta {} (~3 min esgotados)",
        SERVER_PORT
    );
    ServerWaitResult::Timeout
}

/// Retorna o caminho do arquivo de log do servidor.
pub fn get_log_path() -> std::path::PathBuf {
    std::env::temp_dir().join("critix-server.log")
}

/// Lê o log do servidor (últimas `max_bytes` bytes, como texto).
/// Retorna None se o arquivo não existir ou não puder ser lido.
pub fn read_server_log(max_bytes: usize) -> Option<String> {
    let path = get_log_path();
    let raw = std::fs::read(&path).ok()?;
    let slice = if raw.len() > max_bytes {
        &raw[raw.len() - max_bytes..]
    } else {
        &raw[..]
    };
    Some(String::from_utf8_lossy(slice).into_owned())
}

/// Para o servidor Next.js (chamado quando o app fecha)
pub fn stop_server() {
    let mut lock = SERVER_PROCESS.lock().unwrap();
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
        let _ = child.wait(); // Evita processo zumbi
    }
}
