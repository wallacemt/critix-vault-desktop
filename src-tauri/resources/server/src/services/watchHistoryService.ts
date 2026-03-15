/**
 * Watch History Service
 * Manages watch history for movies and series episodes using Prisma database
 */

import { addWatchHistory, getWatchHistory, type WatchHistory, type WatchHistoryInput } from "./databaseService";
import { logger } from "@/lib/logger";

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
  private async assertOk(response: Response, operation: string): Promise<void> {
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`${operation} failed: ${response.status} ${response.statusText} - ${details}`);
    }
  }

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
      logger.info("Marked movie as watched", { movieId, title, poster, runtime });
    } catch (error) {
      logger.error("Error marking movie as watched", error, { movieId, title });
      throw error;
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
      logger.info("Marked episode as watched", {
        seriesId,
        seriesTitle,
        seriesPoster,
        seasonNumber,
        episodeNumber,
        episodeTitle,
        runtime,
      });
    } catch (error) {
      logger.error("Error marking episode as watched", error, { seriesId, seasonNumber, episodeNumber });
      throw error;
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
      logger.error("Error checking movie watched status", error, { movieId });
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
      logger.error("Error checking episode watched status", error, { seriesId, seasonNumber, episodeNumber });
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
      logger.error("Error getting series progress", error, { seriesId });
      return null;
    }
  }

  /**
   * Unmark movie as watched
   */
  async unmarkMovieWatched(movieId: string): Promise<void> {
    try {
      const response = await fetch(`/api/watch-history?mediaId=${movieId}`, {
        method: "DELETE",
      });
      await this.assertOk(response, "Unmark movie watched");
      logger.info("Unmarked movie as watched", { movieId });
    } catch (error) {
      logger.error("Error unmarking movie as watched", error, { movieId });
      throw error;
    }
  }

  /**
   * Unmark episode as watched
   */
  async unmarkEpisodeWatched(seriesId: string, seasonNumber: number, episodeNumber: number): Promise<void> {
    try {
      const response = await fetch(`/api/watch-history?mediaId=${seriesId}`, {
        method: "DELETE",
      });
      await this.assertOk(response, "Unmark episode watched");
      logger.info("Unmarked episode as watched", { seriesId, seasonNumber, episodeNumber });
    } catch (error) {
      logger.error("Error unmarking episode as watched", error, { seriesId, seasonNumber, episodeNumber });
      throw error;
    }
  }

  /**
   * Get full watch history
   */
  async getHistory(): Promise<WatchHistory[]> {
    try {
      return await getWatchHistory();
    } catch (error) {
      logger.error("Error loading watch history", error);
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
      logger.error("Error loading history by type", error, { type });
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
      logger.error("Error clearing watch history", error);
      throw error;
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
      logger.error("Error removing history entry", error, { entryId });
      throw error;
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
        logger.info("No localStorage data to migrate");
        return;
      }

      const localHistory: WatchHistoryEntry[] = JSON.parse(stored);
      logger.info("Migrating watch history entries", { count: localHistory.length });

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
          logger.error("Failed to migrate watch history entry", error, { entryId: entry.id });
        }
      }

      logger.info("Watch history migration completed successfully");

      // Optionally clear localStorage after successful migration
      // localStorage.removeItem(STORAGE_KEY);
      // localStorage.removeItem("critix_series_progress");
    } catch (error) {
      logger.error("Error migrating watch history", error);
      throw error;
    }
  }
}

export const watchHistoryService = new WatchHistoryService();
