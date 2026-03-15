/**
 * User Action Service
 * Manages user action history for restoring app state
 * Now uses API routes instead of direct Prisma access
 */

import { logger } from "@/lib/logger";

const API_BASE = "/api/user-actions";

export interface UserAction {
  id: string;
  actionType: string;
  folderId?: string | null;
  mediaId?: string | null;
  mediaType?: string | null;
  timestamp: Date;
}

export type ActionType = "FOLDER_VIEW" | "MOVIE_VIEW" | "SERIES_VIEW";

class UserActionService {
  private async assertOk(response: Response, operation: string): Promise<void> {
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`${operation} failed: ${response.status} ${response.statusText} - ${details}`);
    }
  }

  /**
   * Save Tab view action
   */
  async saveTabView(tab: string): Promise<void> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "TAB_VIEW",
          mediaType: tab,
        }),
      });
      await this.assertOk(response, "Save tab view");
      logger.info("Saved tab view", { tab });
    } catch (error) {
      logger.error("Error saving tab view", error, { tab });
      throw error;
    }
  }

  /**
   * Save folder view action
   */
  async saveFolderView(folderId: string): Promise<void> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "FOLDER_VIEW",
          folderId,
        }),
      });
      await this.assertOk(response, "Save folder view");
      logger.info("Saved folder view", { folderId });
    } catch (error) {
      logger.error("Error saving folder view", error, { folderId });
      throw error;
    }
  }

  /**
   * Save movie view action
   */
  async saveMovieView(movieId: string): Promise<void> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "MOVIE_VIEW",
          mediaId: movieId,
          mediaType: "MOVIE",
        }),
      });
      await this.assertOk(response, "Save movie view");
      logger.info("Saved movie view", { movieId });
    } catch (error) {
      logger.error("Error saving movie view", error, { movieId });
      throw error;
    }
  }

  /**
   * Save series view action
   */
  async saveSeriesView(seriesId: string): Promise<void> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "SERIES_VIEW",
          mediaId: seriesId,
          mediaType: "SERIES",
        }),
      });
      await this.assertOk(response, "Save series view");
      logger.info("Saved series view", { seriesId });
    } catch (error) {
      logger.error("Error saving series view", error, { seriesId });
      throw error;
    }
  }

  /**
   * Get last viewed Tab
   */

  async getLastViewedTab(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}?actionType=TAB_VIEW`);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.mediaType || null;
    } catch (error) {
      logger.error("Error getting last viewed tab", error);
      return null;
    }
  }
  /**
   * Get last viewed folder
   */
  async getLastViewedFolder(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}?actionType=FOLDER_VIEW`);
      if (!response.ok) return null;

      const data = await response.json();
      return data?.folderId || null;
    } catch (error) {
      logger.error("Error getting last viewed folder", error);
      return null;
    }
  }

  /**
   * Get last viewed movie
   */
  async getLastViewedMovie(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}?actionType=MOVIE_VIEW`);
      if (!response.ok) return null;

      const data = await response.json();
      return data?.mediaId || null;
    } catch (error) {
      logger.error("Error getting last viewed movie", error);
      return null;
    }
  }

  /**
   * Get last viewed series
   */
  async getLastViewedSeries(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}?actionType=SERIES_VIEW`);
      if (!response.ok) return null;

      const data = await response.json();
      return data?.mediaId || null;
    } catch (error) {
      logger.error("Error getting last viewed series", error);
      return null;
    }
  }

  /**
   * Get last viewed media (movie or series)
   */
  async getLastViewedMedia(): Promise<{ mediaId: string; mediaType: "MOVIE" | "SERIES" } | null> {
    try {
      // Try movie first
      const movieResponse = await fetch(`${API_BASE}?actionType=MOVIE_VIEW`);
      const seriesResponse = await fetch(`${API_BASE}?actionType=SERIES_VIEW`);

      const movieData = movieResponse.ok ? await movieResponse.json() : null;
      const seriesData = seriesResponse.ok ? await seriesResponse.json() : null;

      // Return the most recent one
      if (!movieData && !seriesData) return null;
      if (!movieData) return { mediaId: seriesData.mediaId, mediaType: "SERIES" };
      if (!seriesData) return { mediaId: movieData.mediaId, mediaType: "MOVIE" };

      const movieTime = new Date(movieData.timestamp).getTime();
      const seriesTime = new Date(seriesData.timestamp).getTime();

      return movieTime > seriesTime
        ? { mediaId: movieData.mediaId, mediaType: "MOVIE" }
        : { mediaId: seriesData.mediaId, mediaType: "SERIES" };
    } catch (error) {
      logger.error("Error getting last viewed media", error);
      return null;
    }
  }

  /**
   * Clear old history entries (keep last 100)
   */
  async cleanupOldEntries(): Promise<void> {
    try {
      const response = await fetch(API_BASE, {
        method: "DELETE",
      });
      await this.assertOk(response, "Cleanup old entries");
      logger.info("Cleaned up old action entries");
    } catch (error) {
      logger.error("Error cleaning up old entries", error);
      throw error;
    }
  }
}

export const userActionService = new UserActionService();
