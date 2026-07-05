/// Watches every registered library folder for filesystem changes and emits a
/// "library-folder-changed" event to the frontend so it can trigger an
/// automatic rescan — without any HTTP/SSE round-trip, reusing the same Tauri
/// IPC channel the rest of the app already relies on.
///
/// Folders are managed in the Next.js/SQLite side, not here, so this module
/// doesn't track folders itself: the frontend calls `watch_folders` with the
/// full current list every time it changes (startup, add, remove). Replacing
/// the whole watcher on every call is simpler and safer than diffing
/// individual paths, and folder-list changes are rare (a few times per year,
/// not per second).
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use tauri::{AppHandle, Emitter};

/// Debounce window: filesystem events are batched and only fired once the
/// folder has been quiet for this long. Copying/extracting a season of
/// episodes triggers hundreds of raw events — without debouncing this would
/// spam the scan pipeline mid-copy instead of once when it's actually done.
const DEBOUNCE: Duration = Duration::from_secs(5);

static WATCHER: Mutex<Option<Debouncer<RecommendedWatcher>>> = Mutex::new(None);

fn normalize(path: &str) -> String {
    let forward = path.replace('\\', "/");
    if cfg!(target_os = "windows") {
        forward.to_lowercase()
    } else {
        forward
    }
}

/// Trailing-slash-safe root, so "D:/Anime2" never matches root "D:/Anime".
fn normalized_root(path: &str) -> String {
    let n = normalize(path);
    if n.ends_with('/') {
        n
    } else {
        format!("{n}/")
    }
}

/// (Re)starts watching for exactly the given folder paths, replacing whatever
/// was watched before. Never fails the caller: a folder that can't be watched
/// (e.g. a network share whose OS doesn't expose change notifications) is
/// skipped and logged — the rest of the library keeps being monitored.
pub fn watch_folders(app: AppHandle, paths: Vec<String>) {
    let mut guard = match WATCHER.lock() {
        Ok(g) => g,
        Err(e) => {
            eprintln!("[watcher] Mutex envenenado, ignorando: {e}");
            return;
        }
    };

    // Drop the previous debouncer/watcher first so old inotify/ReadDirectoryChangesW
    // handles are released before re-watching.
    *guard = None;

    if paths.is_empty() {
        return;
    }

    // (normalized-with-trailing-slash root, original path as given by the caller)
    // kept together so the emitted event uses the exact string the frontend
    // already has in its folder list (case/slash as stored in the DB).
    let roots: Vec<(String, String)> = paths
        .iter()
        .map(|p| (normalized_root(p), p.clone()))
        .collect();

    let result = new_debouncer(DEBOUNCE, move |events: DebounceEventResult| match events {
        Ok(events) => {
            let mut affected: Vec<String> = Vec::new();
            for event in events {
                let changed = normalize(&event.path.to_string_lossy());
                if let Some((_, original_root)) =
                    roots.iter().find(|(root, _)| changed.starts_with(root.as_str()))
                {
                    if !affected.contains(original_root) {
                        affected.push(original_root.clone());
                    }
                }
            }
            if !affected.is_empty() {
                let _ = app.emit("library-folder-changed", affected);
            }
        }
        Err(e) => eprintln!("[watcher] Erro observando pastas: {e:?}"),
    });

    let mut debouncer = match result {
        Ok(d) => d,
        Err(e) => {
            eprintln!("[watcher] Falha ao iniciar o observador de pastas: {e}");
            return;
        }
    };

    for path in &paths {
        let p: PathBuf = Path::new(path).to_path_buf();
        if let Err(e) = debouncer.watcher().watch(&p, RecursiveMode::Recursive) {
            // Non-fatal — e.g. a network share that doesn't support native
            // change notifications on this OS. The other folders are unaffected.
            eprintln!("[watcher] Nao foi possivel observar '{path}': {e}");
        }
    }

    *guard = Some(debouncer);
}
