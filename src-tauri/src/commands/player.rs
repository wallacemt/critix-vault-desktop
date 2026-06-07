use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SubtitleEntry {
    pub label: String,
    pub lang: String,
    pub path: String,
}

/// Returns the canonical (absolute, symlink-resolved) path of a media file,
/// confirming it exists and is a regular file.
///
/// This is the Rust authority for path validation when the frontend needs to
/// hand a path to the OS (e.g. open_media / VLC) without going through the
/// HTTP streaming route.
#[tauri::command]
pub fn resolve_media_path(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);

    // canonicalize resolves symlinks and `..` components.
    // It also returns an error when the path does not exist on disk.
    let canonical = p
        .canonicalize()
        .map_err(|e| format!("Path resolution failed: {e}"))?;

    if !canonical.is_file() {
        return Err("Path is not a file".to_string());
    }

    Ok(canonical.to_string_lossy().into_owned())
}

/// Scans the directory that contains the given video file for sidecar subtitle
/// files (.srt, .vtt) whose filename stem starts with the video's own stem.
///
/// Language tags are extracted from the suffix after the shared stem:
///   `Movie.en.srt`  →  lang = "en",  label = "EN"
///   `Movie.srt`     →  lang = "und", label = "Subtitle"
#[tauri::command]
pub fn list_sidecar_subtitles(video_path: String) -> Result<Vec<SubtitleEntry>, String> {
    // canonicalize() resolves `..` and symlinks, and errors if the path does
    // not exist — prevents directory traversal via crafted paths (LSF-2026-004).
    let video = PathBuf::from(&video_path)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {e}"))?;

    if !video.is_file() {
        return Err("Path is not a file".to_string());
    }

    // `file_stem` returns the filename without its last extension, as OsStr.
    // We convert to String immediately so we can call `.to_lowercase()`.
    let stem = video
        .file_stem()
        .ok_or_else(|| "Invalid video path".to_string())?
        .to_string_lossy()
        .to_string()
        .to_lowercase();

    let dir = video
        .parent()
        .ok_or_else(|| "Cannot determine parent directory".to_string())?;

    let entries =
        fs::read_dir(dir).map_err(|e| format!("Cannot read dir: {e}"))?;

    let mut subs: Vec<SubtitleEntry> = Vec::new();

    for entry in entries.flatten() {
        let p = entry.path();

        let ext = p
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase());

        if !matches!(ext.as_deref(), Some("srt") | Some("vtt")) {
            continue;
        }

        let file_stem = p
            .file_stem()
            .map(|s| s.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        // Require an exact stem match OR a '.'-separated suffix (DEF-031).
        // "movie" matches "movie" and "movie.en" but NOT "movie 2" or "movies".
        let suffix = file_stem.strip_prefix(stem.as_str()).unwrap_or("NOMATCH");
        if suffix != "" && !suffix.starts_with('.') {
            continue;
        }

        // Everything after the shared stem (stripping the leading dot) is the
        // language tag. "Movie.en" with stem "movie" → strip "movie" → ".en"
        // → trim leading dot → "en".
        let lang_raw = suffix.trim_start_matches('.').to_string();

        let lang = if lang_raw.is_empty() {
            "und".to_string()
        } else {
            lang_raw
        };

        let label = if lang == "und" {
            "Subtitle".to_string()
        } else {
            lang.to_uppercase()
        };

        subs.push(SubtitleEntry {
            label,
            lang,
            path: p.to_string_lossy().into_owned(),
        });
    }

    Ok(subs)
}
