/**
 * User Action Service
 * Manages user action history for restoring app state
 * Now uses API routes instead of direct Prisma access
 */

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
  /**
   * Save Tab view action
   */
  async saveTabView(tab: string): Promise<void> {
    try {
      await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "TAB_VIEW",
          mediaType: tab,
        }),
      });
      console.log(`📺 Saved tab view: ${tab}`);
    } catch (error) {
      console.error("Error saving tab view:", error);
    }
  }

  /**
   * Save folder view action
   */
  async saveFolderView(folderId: string): Promise<void> {
    try {
      await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "FOLDER_VIEW",
          folderId,
        }),
      });
      console.log(`📁 Saved folder view: ${folderId}`);
    } catch (error) {
      console.error("Error saving folder view:", error);
    }
  }

  /**
   * Save movie view action
   */
  async saveMovieView(movieId: string): Promise<void> {
    try {
      await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "MOVIE_VIEW",
          mediaId: movieId,
          mediaType: "MOVIE",
        }),
      });
      console.log(`🎬 Saved movie view: ${movieId}`);
    } catch (error) {
      console.error("Error saving movie view:", error);
    }
  }

  /**
   * Save series view action
   */
  async saveSeriesView(seriesId: string): Promise<void> {
    try {
      await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "SERIES_VIEW",
          mediaId: seriesId,
          mediaType: "SERIES",
        }),
      });
      console.log(`📺 Saved series view: ${seriesId}`);
    } catch (error) {
      console.error("Error saving series view:", error);
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
      console.error("Error getting last viewed tab:", error);
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
      console.error("Error getting last viewed folder:", error);
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
      console.error("Error getting last viewed movie:", error);
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
      console.error("Error getting last viewed series:", error);
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
      console.error("Error getting last viewed media:", error);
      return null;
    }
  }

  /**
   * Clear old history entries (keep last 100)
   */
  async cleanupOldEntries(): Promise<void> {
    try {
      await fetch(API_BASE, {
        method: "DELETE",
      });
      console.log(`🧹 Cleaned up old action entries`);
    } catch (error) {
      console.error("Error cleaning up old entries:", error);
    }
  }
}

export const userActionService = new UserActionService();
