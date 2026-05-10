/**
 * Database API Service
 * Frontend service for making HTTP requests to the database API
 */
import { Folder } from "@/types/folder";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";

const API_BASE = "/api";

function apiPath(path: string): string {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return `${API_BASE}/${normalized}/`;
}

// ---------------------------------------------------------------------------
// localStorage watch-history shadow cache
// Provides resilience against SQLite resets (e.g. MSIX updates on Windows).
// We store a compact list of completed watch entries keyed by mediaId/episodeId
// and restore them when the database comes up empty.
// ---------------------------------------------------------------------------

const LS_WATCH_KEY = "critix_watch_shadow";

type WatchShadowEntry = {
  mediaId: string;
  mediaType: string;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};

function loadWatchShadow(): WatchShadowEntry[] {
  try {
    const raw = localStorage.getItem(LS_WATCH_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchShadowEntry[];
  } catch {
    return [];
  }
}

function saveWatchShadow(entries: WatchShadowEntry[]): void {
  try {
    localStorage.setItem(LS_WATCH_KEY, JSON.stringify(entries));
  } catch {
    // localStorage may be unavailable in SSR or private mode — ignore
  }
}

function addToWatchShadow(entry: WatchShadowEntry): void {
  const all = loadWatchShadow();
  const isDuplicate = all.some(
    (e) =>
      e.mediaId === entry.mediaId &&
      e.mediaType === entry.mediaType &&
      (entry.episodeId ? e.episodeId === entry.episodeId : !e.episodeId),
  );
  if (!isDuplicate) {
    all.push(entry);
    saveWatchShadow(all);
  }
}

function removeFromWatchShadow(mediaId: string, episodeId?: string): void {
  const all = loadWatchShadow();
  const filtered = all.filter((e) => {
    if (e.mediaId !== mediaId) return true;
    if (episodeId) return e.episodeId !== episodeId;
    return false;
  });
  saveWatchShadow(filtered);
}

async function restoreWatchHistoryFromShadow(shadow: WatchShadowEntry[]): Promise<void> {
  console.warn("⚠️ Watch history appears empty — restoring from local backup...");
  for (const entry of shadow) {
    try {
      await addWatchHistory({
        mediaId: entry.mediaId,
        mediaType: entry.mediaType as "MOVIE" | "SERIES" | "ANIME",
        episodeId: entry.episodeId,
        seasonNumber: entry.seasonNumber,
        episodeNumber: entry.episodeNumber,
        completed: true,
        progress: 100,
      });
    } catch {
      // Best-effort restore — individual failures are non-fatal
    }
  }
  console.log("✅ Watch history restored from local backup");
}

type ApiEnvelope<T> =
  | T
  | {
      success: boolean;
      data?: T;
      error?: {
        message?: string;
      };
    };

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (payload && typeof payload === "object" && "success" in payload && typeof payload.success === "boolean") {
    if (!payload.success) {
      throw new Error(payload.error?.message || "Request failed");
    }
    return payload.data as T;
  }

  return payload as T;
}

async function parseApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await response.json()) as
      | { error?: string }
      | {
          success?: boolean;
          error?: { message?: string };
        };

    if (payload && typeof payload === "object") {
      if ("error" in payload && typeof payload.error === "string") {
        return new Error(payload.error);
      }
      if (
        "error" in payload &&
        payload.error &&
        typeof payload.error === "object" &&
        "message" in payload.error &&
        typeof payload.error.message === "string"
      ) {
        return new Error(payload.error.message);
      }
    }
  } catch {
    // Ignore JSON parsing failures and return fallback message.
  }

  return new Error(fallback);
}

// ============================================================================
// FOLDERS API
// ============================================================================

export async function getFolders(): Promise<Folder[]> {
  const response = await fetch(apiPath("folders"), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel carregar as pastas.");
  }

  return parseApiResponse<Folder[]>(response);
}

export async function addFolder(path: string, name: string): Promise<Folder> {
  const response = await fetch(apiPath("folders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name }),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel adicionar a pasta.");
  }

  return parseApiResponse<Folder>(response);
}

export async function removeFolder(folderId: string): Promise<void> {
  const response = await fetch(`${apiPath("folders")}?id=${encodeURIComponent(folderId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel remover a pasta.");
  }
}

export async function updateFolderMediaCount(folderId: string): Promise<Folder> {
  const response = await fetch(apiPath("folders"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId }),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel atualizar a contagem de midias da pasta.");
  }

  return parseApiResponse<Folder>(response);
}

// ============================================================================
// MOVIES API
// ============================================================================

export async function getMovies(folderId?: string): Promise<Movie[]> {
  const url = folderId ? `${apiPath("movies")}?folderId=${encodeURIComponent(folderId)}` : apiPath("movies");

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel carregar os filmes.");
  }

  return parseApiResponse<Movie[]>(response);
}

export async function saveMovies(movies: Movie[]): Promise<void> {
  const response = await fetch(apiPath("movies"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movies),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel salvar os filmes.");
  }
}

export async function removeMovie(movieId: string): Promise<void> {
  const response = await fetch(`${apiPath("movies")}?id=${encodeURIComponent(movieId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel remover o filme.");
  }
}

// ============================================================================
// SERIES API
// ============================================================================

export async function getSeries(folderId?: string): Promise<Series[]> {
  const url = folderId ? `${apiPath("series")}?folderId=${encodeURIComponent(folderId)}` : apiPath("series");

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel carregar as series.");
  }

  return parseApiResponse<Series[]>(response);
}

export async function saveSeries(seriesList: Series[]): Promise<void> {
  const response = await fetch(apiPath("series"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(seriesList),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel salvar as series.");
  }
}

export async function removeSeries(seriesId: string): Promise<void> {
  const response = await fetch(`${apiPath("series")}?id=${encodeURIComponent(seriesId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel remover a serie.");
  }
}

// ============================================================================
// WATCH HISTORY API
// ============================================================================

export type WatchHistoryInput = {
  mediaId: string;
  mediaType: "MOVIE" | "SERIES" | "ANIME";
  progress?: number;
  completed?: boolean;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};

export type WatchHistory = {
  id: string;
  mediaId: string;
  mediaType: string;
  watchedAt: Date;
  progress: number | null;
  completed: boolean;
  episodeId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

let _shadowRestoreChecked = false;

export async function getWatchHistory(mediaId?: string, limit?: number): Promise<WatchHistory[]> {
  const params = new URLSearchParams();
  if (mediaId) params.append("mediaId", mediaId);
  if (limit) params.append("limit", limit.toString());

  const url = `${apiPath("watch-history")}${params.toString() ? "?" + params.toString() : ""}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel carregar o historico de assistidos.");
  }

  const history = (await response.json()) as WatchHistory[];

  // On the first full fetch (no filter), if the DB is empty but local backup
  // has entries, restore silently so watched state survives a DB reset.
  if (!mediaId && !_shadowRestoreChecked) {
    _shadowRestoreChecked = true;
    const shadow = loadWatchShadow();
    if (history.length === 0 && shadow.length > 0) {
      await restoreWatchHistoryFromShadow(shadow);
      // Re-fetch after restore
      const retryResponse = await fetch(url, { method: "GET", cache: "no-store" });
      if (retryResponse.ok) return (await retryResponse.json()) as WatchHistory[];
    }
  }

  return history;
}

export async function addWatchHistory(data: WatchHistoryInput): Promise<WatchHistory> {
  const response = await fetch(apiPath("watch-history"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel registrar no historico de assistidos.");
  }

  const result = (await response.json()) as WatchHistory;

  // Mirror completed entries to localStorage for resilience
  if (data.completed) {
    addToWatchShadow({
      mediaId: data.mediaId,
      mediaType: data.mediaType,
      episodeId: data.episodeId,
      seasonNumber: data.seasonNumber,
      episodeNumber: data.episodeNumber,
    });
  }

  return result;
}

export async function markAsWatched(mediaId: string, mediaType: "MOVIE" | "SERIES" | "ANIME"): Promise<WatchHistory> {
  if (mediaType !== "MOVIE") {
    throw new Error("Use as funcoes de episodio para marcar series/animes como assistidos.");
  }

  return addWatchHistory({
    mediaId,
    mediaType,
    progress: 100,
    completed: true,
  });
}

export async function updateWatchProgress(
  mediaId: string,
  mediaType: "MOVIE" | "SERIES",
  progress: number,
): Promise<WatchHistory> {
  return addWatchHistory({
    mediaId,
    mediaType,
    progress,
    completed: progress >= 100,
  });
}

export async function clearWatchHistory(mediaId: string): Promise<void> {
  const response = await fetch(`${apiPath("watch-history")}?mediaId=${encodeURIComponent(mediaId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await parseApiError(response, "Nao foi possivel limpar o historico de assistidos.");
  }

  removeFromWatchShadow(mediaId);
}

export async function toggleWatchStatus(mediaId: string, mediaType: "MOVIE" | "SERIES" | "ANIME"): Promise<boolean> {
  if (mediaType !== "MOVIE") {
    throw new Error("toggleWatchStatus so e suportado para filmes.");
  }

  const isWatched = await isMediaWatched(mediaId, mediaType);
  if (isWatched) {
    await clearWatchHistory(mediaId);
    return false;
  } else {
    await markAsWatched(mediaId, mediaType);
    return true;
  }
}

export async function isMediaWatched(
  mediaId: string,
  mediaType: "MOVIE" | "SERIES" | "ANIME" = "MOVIE",
): Promise<boolean> {
  if (mediaType !== "MOVIE") {
    return false;
  }

  const history = await getWatchHistory(mediaId);
  return history.some((h) => h.completed && h.mediaType === "MOVIE" && !h.episodeId);
}

/**
 * Episode watch status functions
 */
export async function markEpisodeAsWatched(
  seriesId: string,
  episodeId: string | number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<WatchHistory> {
  const normalizedEpisodeId = String(episodeId);

  return addWatchHistory({
    mediaId: seriesId,
    mediaType: "SERIES",
    episodeId: normalizedEpisodeId,
    seasonNumber,
    episodeNumber,
    progress: 100,
    completed: true,
  });
}

export async function isEpisodeWatched(
  seriesId: string,
  seasonNumber: number,
  episodeNumber: number,
  episodeId?: string | number,
): Promise<boolean> {
  const normalizedEpisodeId = episodeId != null ? String(episodeId) : undefined;
  const history = await getWatchHistory(seriesId);
  return history.some(
    (h) =>
      h.mediaType === "SERIES" &&
      h.completed &&
      !!h.episodeId &&
      (normalizedEpisodeId
        ? h.episodeId === normalizedEpisodeId
        : h.seasonNumber === seasonNumber && h.episodeNumber === episodeNumber),
  );
}

export async function toggleEpisodeWatchStatus(
  seriesId: string,
  episodeId: string | number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<boolean> {
  const normalizedEpisodeId = String(episodeId);
  const isWatched = await isEpisodeWatched(seriesId, seasonNumber, episodeNumber, normalizedEpisodeId);

  if (isWatched) {
    // Delete the specific episode watch history by episodeId
    await fetch(`${API_BASE}/watch-history?episodeId=${normalizedEpisodeId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    removeFromWatchShadow(seriesId, normalizedEpisodeId);
    return false;
  } else {
    await markEpisodeAsWatched(seriesId, normalizedEpisodeId, seasonNumber, episodeNumber);
    return true;
  }
}

/**
 * Get all watched media IDs in a single request
 * More efficient than checking each media individually
 */
export async function getAllWatchedMediaIds(): Promise<Set<string>> {
  const history = await getWatchHistory();
  const watchedIds = new Set<string>();

  history.forEach((entry) => {
    if (entry.completed && entry.mediaType === "MOVIE" && !entry.episodeId) {
      watchedIds.add(entry.mediaId);
    }
  });

  return watchedIds;
}

/**
 * Get all watched episodes for a series
 * Returns a map of "seasonNumber-episodeNumber" to isWatched boolean
 */
export async function getSeriesEpisodeWatchStatus(seriesId: string): Promise<Map<string, boolean>> {
  const history = await getWatchHistory(seriesId);
  const watchedEpisodes = new Map<string, boolean>();

  history.forEach((entry) => {
    if (
      entry.mediaType === "SERIES" &&
      !!entry.episodeId &&
      entry.seasonNumber !== null &&
      entry.episodeNumber !== null &&
      entry.completed
    ) {
      const key = `${entry.seasonNumber}-${entry.episodeNumber}`;
      watchedEpisodes.set(key, true);
    }
  });

  return watchedEpisodes;
}

/**
 * Check if all episodes in a season are watched
 */
export async function isSeasonWatched(
  seriesId: string,
  seasonNumber: number,
  episodes: { episode_number: number }[],
): Promise<boolean> {
  if (episodes.length === 0) return false;
  const watchStatus = await getSeriesEpisodeWatchStatus(seriesId);
  return episodes.every((ep) => watchStatus.get(`${seasonNumber}-${ep.episode_number}`) === true);
}

/**
 * Mark all episodes in a season as watched
 */
export async function markSeasonAsWatched(
  seriesId: string,
  seasonNumber: number,
  episodes: { id: string; episode_number: number }[],
): Promise<void> {
  for (const ep of episodes) {
    const watched = await isEpisodeWatched(seriesId, seasonNumber, ep.episode_number, ep.id);
    if (!watched) {
      await markEpisodeAsWatched(seriesId, ep.id, seasonNumber, ep.episode_number);
    }
  }
}

/**
 * Unmark all episodes in a season as watched
 */
export async function unmarkSeasonAsWatched(
  seriesId: string,
  seasonNumber: number,
  episodes: { id: string; episode_number: number }[],
): Promise<void> {
  for (const ep of episodes) {
    const watched = await isEpisodeWatched(seriesId, seasonNumber, ep.episode_number, ep.id);
    if (watched) {
      await fetch(`${API_BASE}/watch-history?episodeId=${ep.id}`, { method: "DELETE" });
    }
  }
}

export async function setSeriesEpisodesWatchStatus(
  seriesId: string,
  episodes: { id: string; seasonNumber: number; episodeNumber: number }[],
  watched: boolean,
): Promise<void> {
  for (const episode of episodes) {
    if (watched) {
      await markEpisodeAsWatched(seriesId, episode.id, episode.seasonNumber, episode.episodeNumber);
    } else {
      await fetch(`${API_BASE}/watch-history?episodeId=${episode.id}`, { method: "DELETE" });
    }
  }
}

/**
 * Toggle watched status for all episodes in a season
 * Returns true if season is now watched, false if now unwatched
 */
export async function toggleSeasonWatchStatus(
  seriesId: string,
  seasonNumber: number,
  episodes: { id: string; episode_number: number }[],
): Promise<boolean> {
  const currentlyWatched = await isSeasonWatched(seriesId, seasonNumber, episodes);
  if (currentlyWatched) {
    await unmarkSeasonAsWatched(seriesId, seasonNumber, episodes);
    return false;
  } else {
    await markSeasonAsWatched(seriesId, seasonNumber, episodes);
    return true;
  }
}
