/**
 * Database API Service
 * Frontend service for making HTTP requests to the database API
 */
import { Folder } from "@/types/folder";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";

const API_BASE = "/api";

// ============================================================================
// FOLDERS API
// ============================================================================

export async function getFolders(): Promise<Folder[]> {
  const response = await fetch(`${API_BASE}/folders`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to get folders");
  }

  return response.json();
}

export async function addFolder(path: string, name: string): Promise<Folder> {
  const response = await fetch(`${API_BASE}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add folder");
  }

  return response.json();
}

export async function removeFolder(folderId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/folders?id=${folderId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to remove folder");
  }
}

export async function updateFolderMediaCount(folderId: string): Promise<Folder> {
  const response = await fetch(`${API_BASE}/folders`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId }),
  });

  if (!response.ok) {
    throw new Error("Failed to update folder media count");
  }

  return response.json();
}

// ============================================================================
// MOVIES API
// ============================================================================

export async function getMovies(folderId?: string): Promise<Movie[]> {
  const url = folderId ? `${API_BASE}/movies?folderId=${folderId}` : `${API_BASE}/movies`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to get movies");
  }

  return response.json();
}

export async function saveMovies(movies: Movie[]): Promise<void> {
  const response = await fetch(`${API_BASE}/movies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movies),
  });

  if (!response.ok) {
    throw new Error("Failed to save movies");
  }
}

export async function removeMovie(movieId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/movies?id=${movieId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to remove movie");
  }
}

// ============================================================================
// SERIES API
// ============================================================================

export async function getSeries(folderId?: string): Promise<Series[]> {
  const url = folderId ? `${API_BASE}/series?folderId=${folderId}` : `${API_BASE}/series`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to get series");
  }

  return response.json();
}

export async function saveSeries(seriesList: Series[]): Promise<void> {
  const response = await fetch(`${API_BASE}/series`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(seriesList),
  });

  if (!response.ok) {
    throw new Error("Failed to save series");
  }
}

export async function removeSeries(seriesId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/series?id=${seriesId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to remove series");
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

export async function getWatchHistory(mediaId?: string, limit?: number): Promise<WatchHistory[]> {
  const params = new URLSearchParams();
  if (mediaId) params.append("mediaId", mediaId);
  if (limit) params.append("limit", limit.toString());

  const url = `${API_BASE}/watch-history${params.toString() ? "?" + params.toString() : ""}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to get watch history");
  }

  return response.json();
}

export async function addWatchHistory(data: WatchHistoryInput): Promise<WatchHistory> {
  const response = await fetch(`${API_BASE}/watch-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to add watch history");
  }

  return response.json();
}

export async function markAsWatched(mediaId: string, mediaType: "MOVIE" | "SERIES" | "ANIME"): Promise<WatchHistory> {
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
  const response = await fetch(`${API_BASE}/watch-history?mediaId=${mediaId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to clear watch history");
  }
}

export async function toggleWatchStatus(mediaId: string, mediaType: "MOVIE" | "SERIES" | "ANIME"): Promise<boolean> {
  const isWatched = await isMediaWatched(mediaId);
  if (isWatched) {
    await clearWatchHistory(mediaId);
    return false;
  } else {
    await markAsWatched(mediaId, mediaType);
    return true;
  }
}

export async function isMediaWatched(mediaId: string): Promise<boolean> {
  const history = await getWatchHistory(mediaId);
  return history.some((h) => h.completed);
}

/**
 * Episode watch status functions
 */
export async function markEpisodeAsWatched(
  seriesId: string,
  episodeId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<WatchHistory> {
  return addWatchHistory({
    mediaId: seriesId,
    mediaType: "SERIES",
    episodeId,
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
): Promise<boolean> {
  const history = await getWatchHistory(seriesId);
  return history.some((h) => h.completed && h.seasonNumber === seasonNumber && h.episodeNumber === episodeNumber);
}

export async function toggleEpisodeWatchStatus(
  seriesId: string,
  episodeId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<boolean> {
  const isWatched = await isEpisodeWatched(seriesId, seasonNumber, episodeNumber);

  if (isWatched) {
    // Delete the specific episode watch history by episodeId
    await fetch(`${API_BASE}/watch-history?episodeId=${episodeId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return false;
  } else {
    await markEpisodeAsWatched(seriesId, episodeId, seasonNumber, episodeNumber);
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
    if (entry.completed) {
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
    if (entry.seasonNumber !== null && entry.episodeNumber !== null && entry.completed) {
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
    const watched = await isEpisodeWatched(seriesId, seasonNumber, ep.episode_number);
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
    const watched = await isEpisodeWatched(seriesId, seasonNumber, ep.episode_number);
    if (watched) {
      await fetch(`${API_BASE}/watch-history?episodeId=${ep.id}`, { method: "DELETE" });
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
