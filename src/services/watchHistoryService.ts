/**
 * Watch History Service
 * Manages watch history for movies and series episodes
 */

export interface WatchHistoryEntry {
  id: string;
  mediaId: string;
  mediaType: "MOVIE" | "SERIES";
  title: string;
  poster: string;
  watchedAt: string; // ISO timestamp
  metadata?: {
    seasonNumber?: number;
    episodeNumber?: number;
    episodeTitle?: string;
    runtime?: number;
  };
}

export interface SeriesWatchProgress {
  seriesId: string;
  episodes: {
    [key: string]: boolean; // key: "S01E01"
  };
  totalEpisodes: number;
  watchedEpisodes: number;
  lastWatched: string;
}

class WatchHistoryService {
  private readonly STORAGE_KEY = "critix_watch_history";
  private readonly PROGRESS_KEY = "critix_series_progress";

  /**
   * Mark a movie as watched
   */
  markMovieWatched(movieId: string, title: string, poster: string, runtime?: number): void {
    const history = this.getHistory();

    // Remove existing entry if present
    const filtered = history.filter((entry) => !(entry.mediaId === movieId && entry.mediaType === "MOVIE"));

    // Add new entry
    const entry: WatchHistoryEntry = {
      id: `${movieId}-${Date.now()}`,
      mediaId: movieId,
      mediaType: "MOVIE",
      title,
      poster,
      watchedAt: new Date().toISOString(),
      metadata: { runtime },
    };

    filtered.unshift(entry);
    this.saveHistory(filtered);
  }

  /**
   * Mark an episode as watched
   */
  markEpisodeWatched(
    seriesId: string,
    seriesTitle: string,
    seriesPoster: string,
    seasonNumber: number,
    episodeNumber: number,
    episodeTitle?: string,
    runtime?: number,
  ): void {
    const history = this.getHistory();

    const entry: WatchHistoryEntry = {
      id: `${seriesId}-S${seasonNumber}E${episodeNumber}-${Date.now()}`,
      mediaId: seriesId,
      mediaType: "SERIES",
      title: seriesTitle,
      poster: seriesPoster,
      watchedAt: new Date().toISOString(),
      metadata: {
        seasonNumber,
        episodeNumber,
        episodeTitle,
        runtime,
      },
    };

    history.unshift(entry);
    this.saveHistory(history);

    // Update series progress
    this.updateSeriesProgress(seriesId, seasonNumber, episodeNumber);
  }

  /**
   * Update series watch progress
   */
  private updateSeriesProgress(seriesId: string, seasonNumber: number, episodeNumber: number): void {
    const progressMap = this.getProgressMap();
    const key = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;

    if (!progressMap[seriesId]) {
      progressMap[seriesId] = {
        seriesId,
        episodes: {},
        totalEpisodes: 0,
        watchedEpisodes: 0,
        lastWatched: new Date().toISOString(),
      };
    }

    progressMap[seriesId].episodes[key] = true;
    progressMap[seriesId].watchedEpisodes = Object.keys(progressMap[seriesId].episodes).length;
    progressMap[seriesId].lastWatched = new Date().toISOString();

    this.saveProgressMap(progressMap);
  }

  /**
   * Check if a movie is watched
   */
  isMovieWatched(movieId: string): boolean {
    const history = this.getHistory();
    return history.some((entry) => entry.mediaId === movieId && entry.mediaType === "MOVIE");
  }

  /**
   * Check if an episode is watched
   */
  isEpisodeWatched(seriesId: string, seasonNumber: number, episodeNumber: number): boolean {
    const progressMap = this.getProgressMap();
    const progress = progressMap[seriesId];

    if (!progress) return false;

    const key = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
    return progress.episodes[key] === true;
  }

  /**
   * Get series watch progress
   */
  getSeriesProgress(seriesId: string): SeriesWatchProgress | null {
    const progressMap = this.getProgressMap();
    return progressMap[seriesId] || null;
  }

  /**
   * Unmark movie as watched
   */
  unmarkMovieWatched(movieId: string): void {
    const history = this.getHistory();
    const filtered = history.filter((entry) => !(entry.mediaId === movieId && entry.mediaType === "MOVIE"));
    this.saveHistory(filtered);
  }

  /**
   * Unmark episode as watched
   */
  unmarkEpisodeWatched(seriesId: string, seasonNumber: number, episodeNumber: number): void {
    const progressMap = this.getProgressMap();
    const progress = progressMap[seriesId];

    if (!progress) return;

    const key = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
    delete progress.episodes[key];
    progress.watchedEpisodes = Object.keys(progress.episodes).length;

    if (progress.watchedEpisodes === 0) {
      delete progressMap[seriesId];
    }

    this.saveProgressMap(progressMap);

    // Remove from history
    const history = this.getHistory();
    const filtered = history.filter(
      (entry) =>
        !(
          entry.mediaId === seriesId &&
          entry.metadata?.seasonNumber === seasonNumber &&
          entry.metadata?.episodeNumber === episodeNumber
        ),
    );
    this.saveHistory(filtered);
  }

  /**
   * Get full watch history
   */
  getHistory(): WatchHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading watch history:", error);
      return [];
    }
  }

  /**
   * Get history filtered by type
   */
  getHistoryByType(type: "MOVIE" | "SERIES"): WatchHistoryEntry[] {
    return this.getHistory().filter((entry) => entry.mediaType === type);
  }

  /**
   * Clear entire watch history
   */
  clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PROGRESS_KEY);
  }

  /**
   * Remove single entry from history
   */
  removeHistoryEntry(entryId: string): void {
    const history = this.getHistory();
    const filtered = history.filter((entry) => entry.id !== entryId);
    this.saveHistory(filtered);
  }

  /**
   * Get progress map
   */
  private getProgressMap(): Record<string, SeriesWatchProgress> {
    try {
      const stored = localStorage.getItem(this.PROGRESS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading progress map:", error);
      return {};
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(history: WatchHistoryEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving watch history:", error);
    }
  }

  /**
   * Save progress map to localStorage
   */
  private saveProgressMap(progressMap: Record<string, SeriesWatchProgress>): void {
    try {
      localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progressMap));
    } catch (error) {
      console.error("Error saving progress map:", error);
    }
  }
}

export const watchHistoryService = new WatchHistoryService();
