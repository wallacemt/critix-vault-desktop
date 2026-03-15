/**
 * Tauri Service for Critix Vault
 * Handles all communication with Rust backend
 *
 * Provides persistent storage that survives app restarts:
 * - Folder management with automatic persistence
 * - Media metadata storage (movies & series)
 * - Image caching for offline support
 * - Settings management
 */

import { Folder } from "@/types/folder";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";

// @tauri-apps/api accesses the bare `location` global during module
// initialization, which is undefined in the Node.js SSR/static-generation
// environment used by Next.js. Deferring the import to first use prevents
// the ReferenceError: location is not defined crash during `next build`.
let _invoke: typeof import("@tauri-apps/api/core").invoke | null = null;
const invoke: typeof import("@tauri-apps/api/core").invoke = async (cmd, args?, opts?) => {
  if (!_invoke) {
    _invoke = (await import("@tauri-apps/api/core")).invoke;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _invoke(cmd as string, args, opts) as any;
};

function normalizeFolderPath(selected: string): string {
  const trimmed = selected.trim();
  if (!trimmed.startsWith("file://")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    let pathname = decodeURIComponent(url.pathname);

    // Convert URL-style path (/C:/Users/...) to Windows path (C:/Users/...)
    if (/^\/[A-Za-z]:\//.test(pathname)) {
      pathname = pathname.slice(1);
    }

    return pathname;
  } catch {
    return trimmed;
  }
}

// Types for Rust backend communication
interface RustMovie {
  id: string;
  type: string;
  title: string;
  original_title?: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  status: string;
  file_path: string;
  folder_id: string;
  duration?: number;
  trailer?: string;
  release_date?: string;
}

interface RustSeries {
  id: string;
  type: string;
  title: string;
  original_title?: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  status: string;
  file_path: string;
  folder_id: string;
  seasons: RustSeason[];
  number_of_seasons: number;
  number_of_episodes: number;
  trailer?: string;
  first_air_date?: string;
  last_air_date?: string;
}

interface RustSeason {
  id: string;
  season_number: number;
  name: string;
  overview?: string;
  poster?: string;
  episode_count: number;
  episodes: RustEpisode[];
  available: boolean;
  downloaded_episodes: number;
}

interface RustEpisode {
  id: string;
  episode_number: number;
  season_number: number;
  title: string;
  overview?: string;
  still_path?: string;
  air_date?: string;
  duration?: number;
  file_path?: string;
  available: boolean;
  vote_average?: number;
}

interface RustFolder {
  id: string;
  path: string;
  name: string;
  media_count: number;
  added_at: string;
  last_scanned?: string;
}

interface AppSettings {
  default_player: string;
  enable_image_cache: boolean;
  auto_scan_on_startup: boolean;
  theme: string;
}

interface CacheInfo {
  total_size_bytes: number;
  image_count: number;
  data_file_size: number;
}

// Conversion utilities
function rustFolderToFolder(rf: RustFolder): Folder {
  return {
    id: rf.id,
    path: rf.path,
    name: rf.name,
    mediaCount: rf.media_count,
    addedAt: rf.added_at,
    lastScanned: rf.last_scanned,
  };
}

function folderToRustFolder(f: Folder): RustFolder {
  return {
    id: f.id,
    path: f.path,
    name: f.name,
    media_count: f.mediaCount,
    added_at: f.addedAt,
    last_scanned: f.lastScanned,
  };
}

function rustMovieToMovie(rm: RustMovie): Movie {
  return {
    id: rm.id,
    type: rm.type as "MOVIE",
    title: rm.title,
    originalTitle: rm.original_title,
    year: rm.year,
    poster: rm.poster,
    backdrop: rm.backdrop,
    overview: rm.overview,
    rating: rm.rating,
    status: rm.status as "MATCHED" | "UNMATCHED" | "ERROR",
    filePath: rm.file_path,
    folderId: rm.folder_id,
    duration: rm.duration,
    trailer: rm.trailer,
    releaseDate: rm.release_date,
  };
}

function movieToRustMovie(m: Movie): RustMovie {
  return {
    id: m.id,
    type: m.type || "MOVIE",
    title: m.title || "",
    original_title: m.originalTitle,
    year: m.year,
    poster: m.poster,
    backdrop: m.backdrop,
    overview: m.overview,
    rating: m.rating,
    status: m.status || "UNMATCHED",
    file_path: m.filePath || "",
    folder_id: m.folderId || "",
    duration: m.duration,
    trailer: m.trailer,
    release_date: m.releaseDate,
  };
}

function rustSeriesToSeries(rs: RustSeries): Series {
  return {
    id: rs.id,
    type: rs.type as "SERIES" | "ANIME",
    title: rs.title,
    originalTitle: rs.original_title,
    year: rs.year,
    poster: rs.poster,
    backdrop: rs.backdrop,
    overview: rs.overview,
    rating: rs.rating,
    status: rs.status as "MATCHED" | "UNMATCHED" | "ERROR",
    filePath: rs.file_path,
    folderId: rs.folder_id,
    seasons: rs.seasons.map((s) => ({
      id: s.id,
      seasonNumber: s.season_number,
      name: s.name,
      overview: s.overview || "",
      poster: s.poster,
      episodeCount: s.episode_count,
      episodes: s.episodes.map((e) => ({
        id: e.id,
        name: e.title,
        overview: e.overview || "",
        episode_number: e.episode_number,
        season_number: e.season_number,
        still_path: e.still_path || "",
        air_date: e.air_date || "",
        title: e.title,
        runtime: e.duration || 0,
        filePath: e.file_path,
        duration: e.duration,
        available: e.available,
        vote_average: e.vote_average || 0,
      })),
      available: s.available,
      downloadedEpisodes: s.downloaded_episodes,
    })),
    numberOfSeasons: rs.number_of_seasons,
    numberOfEpisodes: rs.number_of_episodes,
    trailer: rs.trailer,
    firstAirDate: rs.first_air_date,
    lastAirDate: rs.last_air_date,
  };
}

function seriesToRustSeries(s: Series): RustSeries {
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    original_title: s.originalTitle,
    year: s.year,
    poster: s.poster,
    backdrop: s.backdrop,
    overview: s.overview,
    rating: s.rating,
    status: s.status,
    file_path: s.filePath,
    folder_id: s.folderId,
    seasons: (s.seasons || []).map((season) => ({
      id: season.id ?? `${s.id}-s${season.seasonNumber}`,
      season_number: season.seasonNumber || 0,
      name: season.name || "",
      overview: season.overview,
      poster: season.poster,
      episode_count: season.episodeCount || 0,
      episodes: (season.episodes || []).map((ep) => ({
        id: ep.id,
        episode_number: ep.episode_number || 0,
        season_number: ep.season_number || 0,
        title: ep.title || "",
        overview: ep.overview,
        still_path: ep.still_path,
        air_date: ep.air_date,
        duration: ep.duration,
        file_path: ep.filePath,
        available: ep.available ?? false,
      })),
      available: season.available ?? false,
      downloaded_episodes: season.downloadedEpisodes || 0,
    })),
    number_of_seasons: s.numberOfSeasons || 0,
    number_of_episodes: s.numberOfEpisodes || 0,
    trailer: s.trailer,
    first_air_date: s.firstAirDate,
    last_air_date: s.lastAirDate,
  };
}

class TauriService {
  // ============================================================================
  // Folder Management
  // ============================================================================

  /**
   * Open folder picker dialog
   */
  async selectFolder(): Promise<string | null> {
    try {
      const selected = await invoke<string | null>("select_folder_dialog");
      return selected ? normalizeFolderPath(selected) : null;
    } catch (error) {
      console.error("Failed to open folder picker:", error);
      return null;
    }
  }

  /**
   * Add a folder to the monitored list (persisted to disk)
   */
  async addFolder(path: string): Promise<Folder> {
    const rustFolder = await invoke<RustFolder>("add_folder", { path });
    return rustFolderToFolder(rustFolder);
  }

  /**
   * Remove a folder from the monitored list (persisted to disk)
   */
  async removeFolder(folderId: string): Promise<void> {
    return invoke("remove_folder", { folderId });
  }

  /**
   * Get all monitored folders (loaded from disk)
   */
  async getFolders(): Promise<Folder[]> {
    const rustFolders = await invoke<RustFolder[]>("get_folders");
    return rustFolders.map(rustFolderToFolder);
  }

  /**
   * Update a folder (persisted to disk)
   */
  async updateFolder(folder: Folder): Promise<void> {
    return invoke("update_folder", { folder: folderToRustFolder(folder) });
  }

  // ============================================================================
  // Media Management
  // ============================================================================

  /**
   * Save all movies (persisted to disk)
   */
  async saveMovies(movies: Movie[]): Promise<void> {
    const rustMovies = movies.map(movieToRustMovie);
    return invoke("save_movies", { movies: rustMovies });
  }

  /**
   * Get all movies (loaded from disk)
   */
  async getMovies(): Promise<Movie[]> {
    const rustMovies = await invoke<RustMovie[]>("get_movies");
    return rustMovies.map(rustMovieToMovie);
  }

  /**
   * Save all series (persisted to disk)
   */
  async saveSeries(series: Series[]): Promise<void> {
    const rustSeries = series.map((s) => seriesToRustSeries(s));
    console.log(rustSeries);
    return invoke("save_series", { series: rustSeries });
  }

  /**
   * Get all series (loaded from disk)
   */
  async getSeries(): Promise<Series[]> {
    const rustSeries = await invoke<RustSeries[]>("get_series");
    return rustSeries.map(rustSeriesToSeries);
  }

  /**
   * Update a single movie (persisted to disk)
   */
  async updateMovie(movie: Movie): Promise<void> {
    return invoke("update_movie", { movie: movieToRustMovie(movie) });
  }

  /**
   * Update a single series (persisted to disk)
   */
  async updateSeries(series: Series): Promise<void> {
    return invoke("update_series", { series: seriesToRustSeries(series) });
  }

  /**
   * Remove a movie (persisted to disk)
   */
  async removeMovie(movieId: string, folderId: string): Promise<void> {
    return invoke("remove_movie", { movieId, folderId });
  }

  /**
   * Remove a series (persisted to disk)
   */
  async removeSeries(seriesId: string, folderId: string): Promise<void> {
    return invoke("remove_series", { seriesId, folderId });
  }

  // ============================================================================
  // Settings & State
  // ============================================================================

  /**
   * Save last selected folder ID (persisted to disk)
   */
  async saveLastSelectedFolder(folderId: string | null): Promise<void> {
    return invoke("save_last_selected_folder", { folderId });
  }

  /**
   * Get last selected folder ID (loaded from disk)
   */
  async getLastSelectedFolder(): Promise<string | null> {
    return invoke<string | null>("get_last_selected_folder");
  }

  /**
   * Save app settings (persisted to disk)
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    return invoke("save_settings", { settings });
  }

  /**
   * Get app settings (loaded from disk)
   */
  async getSettings(): Promise<AppSettings> {
    return invoke<AppSettings>("get_settings");
  }

  // ============================================================================
  // Image Cache
  // ============================================================================

  /**
   * Cache an image from URL (downloads and saves to disk)
   */
  async cacheImage(url: string): Promise<string> {
    return invoke<string>("cache_image", { url });
  }

  /**
   * Get cached image path if it exists
   */
  async getCachedImagePath(url: string): Promise<string | null> {
    return invoke<string | null>("get_cached_image_path", { url });
  }

  /**
   * Check if an image is cached
   */
  async isImageCached(url: string): Promise<boolean> {
    return invoke<boolean>("is_image_cached", { url });
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Clear all app data (folders, media, cache, settings)
   * WARNING: This is destructive and cannot be undone!
   */
  async clearAllData(): Promise<void> {
    return invoke("clear_all_data");
  }

  /**
   * Get information about cache usage
   */
  async getCacheInfo(): Promise<CacheInfo> {
    return invoke<CacheInfo>("get_cache_info");
  }

  /**
   * Get the directory where app data is stored
   */
  async getDataDirectory(): Promise<string> {
    return invoke<string>("get_data_directory");
  }

  /**
   * Export all app data as JSON
   */
  async exportData(): Promise<string> {
    return invoke<string>("export_data");
  }

  /**
   * Import app data from JSON
   */
  async importData(jsonData: string): Promise<void> {
    return invoke("import_data", { jsonData });
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Scan a folder for media files
   */
  async scanFolder(folderPath: string): Promise<string[]> {
    return invoke<string[]>("scan_folder", { folderPath });
  }

  /**
   * Open a media file with the default or specified player
   */
  async openMedia(filePath: string, player?: "vlc" | "default"): Promise<void> {
    return invoke("open_media", { filePath, player: player || "default" });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string) {
    return invoke("get_file_metadata", { filePath });
  }

  /**
   * Open file location in system file explorer
   */
  async openFileLocation(filePath: string): Promise<void> {
    return invoke("open_file_location", { filePath });
  }
}

export const tauriService = new TauriService();
export type { AppSettings, CacheInfo };
