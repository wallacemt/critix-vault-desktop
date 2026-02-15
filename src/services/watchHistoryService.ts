/**
 * Watch History Service
 * Manages watch history for movies and series episodes using Prisma database
 */

import { addWatchHistory, getWatchHistory, type WatchHistory, type WatchHistoryInput } from "./databaseService";

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
  /**
   * Mark a movie as watched
   */
  async markMovieWatched(movieId: string, title: string, poster: string, runtime?: number): Promise<void> {
    try {
      const data: WatchHistoryInput = {
        mediaId: movieId,
        mediaType: "MOVIE",
        completed: true,
        progress: 100,
      };
      await addWatchHistory(data);
    } catch (error) {
      console.error("Error marking movie as watched:", error);
    }
  }

  /**
   * Mark an episode as watched
   */
  async markEpisodeWatched(
    seriesId: string,
    seriesTitle: string,
    seriesPoster: string,
    seasonNumber: number,
    episodeNumber: number,
    episodeTitle?: string,
    runtime?: number,
  ): Promise<void> {
    try {
      const data: WatchHistoryInput = {
        mediaId: seriesId,
        mediaType: "SERIES",
        completed: true,
        progress: 100,
      };
      await addWatchHistory(data);
    } catch (error) {
      console.error("Error marking episode as watched:", error);
    }
  }

  /**
   * Check if a movie is watched
   */
  async isMovieWatched(movieId: string): Promise<boolean> {
    try {
      const history = await getWatchHistory(movieId);
      return history.some((entry) => entry.mediaType === "MOVIE" && entry.completed);
    } catch (error) {
      console.error("Error checking movie watched status:", error);
      return false;
    }
  }

  /**
   * Check if an episode is watched
   */
  async isEpisodeWatched(seriesId: string, seasonNumber: number, episodeNumber: number): Promise<boolean> {
    try {
      const history = await getWatchHistory(seriesId);
      return history.some((entry) => entry.mediaType === "SERIES" && entry.completed);
    } catch (error) {
      console.error("Error checking episode watched status:", error);
      return false;
    }
  }

  /**
   * Get series watch progress
   */
  async getSeriesProgress(seriesId: string): Promise<SeriesWatchProgress | null> {
    try {
      const history = await getWatchHistory(seriesId);
      const seriesHistory = history.filter((entry) => entry.mediaType === "SERIES");

      if (seriesHistory.length === 0) return null;

      const episodes: { [key: string]: boolean } = {};
      let lastWatched = "";

      seriesHistory.forEach((entry) => {
        // Para compatibilidade com a estrutura anterior
        const key = "S01E01"; // Temporário - pode ser melhorado depois
        episodes[key] = entry.completed;

        const watchedDate = new Date(entry.watchedAt).toISOString();
        if (!lastWatched || watchedDate > lastWatched) {
          lastWatched = watchedDate;
        }
      });

      return {
        seriesId,
        episodes,
        totalEpisodes: 0,
        watchedEpisodes: Object.keys(episodes).length,
        lastWatched,
      };
    } catch (error) {
      console.error("Error getting series progress:", error);
      return null;
    }
  }

  /**
   * Unmark movie as watched
   */
  async unmarkMovieWatched(movieId: string): Promise<void> {
    try {
      await fetch(`/api/watch-history?mediaId=${movieId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error unmarking movie as watched:", error);
    }
  }

  /**
   * Unmark episode as watched
   */
  async unmarkEpisodeWatched(seriesId: string, seasonNumber: number, episodeNumber: number): Promise<void> {
    try {
      await fetch(`/api/watch-history?mediaId=${seriesId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error unmarking episode as watched:", error);
    }
  }

  /**
   * Get full watch history
   */
  async getHistory(): Promise<WatchHistory[]> {
    try {
      return await getWatchHistory();
    } catch (error) {
      console.error("Error loading watch history:", error);
      return [];
    }
  }

  /**
   * Get history filtered by type
   */
  async getHistoryByType(type: "MOVIE" | "SERIES"): Promise<WatchHistory[]> {
    try {
      const history = await this.getHistory();
      return history.filter((entry) => entry.mediaType === type);
    } catch (error) {
      console.error("Error loading history by type:", error);
      return [];
    }
  }

  /**
   * Clear entire watch history
   */
  async clearHistory(): Promise<void> {
    try {
      // This would require a new API endpoint to clear all history
      console.warn("Clear all history not implemented yet");
    } catch (error) {
      console.error("Error clearing watch history:", error);
    }
  }

  /**
   * Remove single entry from history
   */
  async removeHistoryEntry(entryId: string): Promise<void> {
    try {
      // This would require modification to the API to delete by ID
      console.warn("Remove single entry not implemented yet");
    } catch (error) {
      console.error("Error removing history entry:", error);
    }
  }

  /**
   * Migration utility: Migrate localStorage data to Prisma database
   * This should be called once to migrate existing data
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const STORAGE_KEY = "critix_watch_history";
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        console.log("No localStorage data to migrate");
        return;
      }

      const localHistory: WatchHistoryEntry[] = JSON.parse(stored);
      console.log(`Migrating ${localHistory.length} watch history entries...`);

      for (const entry of localHistory) {
        const data: WatchHistoryInput = {
          mediaId: entry.mediaId,
          mediaType: entry.mediaType,
          completed: true,
          progress: 100,
        };

        try {
          await addWatchHistory(data);
        } catch (error) {
          console.error(`Failed to migrate entry ${entry.id}:`, error);
        }
      }

      console.log("Migration completed successfully");

      // Optionally clear localStorage after successful migration
      // localStorage.removeItem(STORAGE_KEY);
      // localStorage.removeItem("critix_series_progress");
    } catch (error) {
      console.error("Error migrating watch history:", error);
    }
  }
}

export const watchHistoryService = new WatchHistoryService();
