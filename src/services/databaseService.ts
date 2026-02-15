/**
 * Database API Service
 * Frontend service for making HTTP requests to the database API
 */

import type { Folder, Movie, Series } from "@/types";

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
  mediaType: "MOVIE" | "SERIES";
  progress?: number;
  completed?: boolean;
};

export type WatchHistory = {
  id: string;
  mediaId: string;
  mediaType: string;
  watchedAt: Date;
  progress: number | null;
  completed: boolean;
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

export async function markAsWatched(mediaId: string, mediaType: "MOVIE" | "SERIES"): Promise<WatchHistory> {
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

export async function isMediaWatched(mediaId: string): Promise<boolean> {
  const history = await getWatchHistory(mediaId);
  return history.some((h) => h.completed);
}
