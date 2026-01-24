/**
 * Storage Service for Critix Vault
 * Handles persistent storage using localStorage
 */

import { Folder, Movie, Series } from "@/types";

export const STORAGE_KEYS = {
  FOLDERS: "critix_vault_folders",
  MOVIES: "critix_vault_movies",
  SERIES: "critix_vault_series",
  LAST_SYNC: "critix_vault_last_sync",
  LAST_SELECTED_FOLDER: "critix_vault_last_selected_folder",
};

class StorageService {
  /**
   * Save folders to localStorage
   */
  saveFolders(folders: Folder[]): void {
    try {
      console.log("💾 StorageService: Saving folders to localStorage:", folders);
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      console.log("✅ StorageService: Folders saved successfully");
    } catch (error) {
      console.error("❌ StorageService: Failed to save folders:", error);
    }
  }

  /**
   * Get folders from localStorage
   */
  getFolders(): Folder[] {
    try {
      console.log("📖 StorageService: Reading folders from localStorage...");
      const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      console.log("📖 StorageService: Raw data:", data);
      const folders = data ? JSON.parse(data) : [];
      console.log("📖 StorageService: Parsed folders:", folders);
      return folders;
    } catch (error) {
      console.error("❌ StorageService: Failed to load folders:", error);
      return [];
    }
  }

  /**
   * Save last selected folder ID
   */
  saveLastSelectedFolder(folderId: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_FOLDER, folderId);
    } catch (error) {
      console.error("Failed to save last selected folder:", error);
    }
  }

  /**
   * Get last selected folder ID
   */
  getLastSelectedFolderId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_FOLDER);
    } catch (error) {
      console.error("Failed to load last selected folder:", error);
      return null;
    }
  }

  /**
   * Save movies to localStorage
   */
  saveMovies(movies: Movie[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(movies));
      this.updateLastSync();
    } catch (error) {
      console.error("Failed to save movies:", error);
    }
  }

  /**
   * Get movies from localStorage
   */
  getMovies(): Movie[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MOVIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to load movies:", error);
      return [];
    }
  }

  /**
   * Get movies by folder ID
   */
  getMoviesByFolder(folderId: string): Movie[] {
    const allMovies = this.getMovies();
    return allMovies.filter((movie) => movie.folderId === folderId);
  }

  /**
   * Save series to localStorage
   */
  saveSeries(series: Series[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(series));
      this.updateLastSync();
    } catch (error) {
      console.error("Failed to save series:", error);
    }
  }

  /**
   * Get series from localStorage
   */
  getSeries(): Series[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SERIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to load series:", error);
      return [];
    }
  }

  /**
   * Get series by folder ID
   */
  getSeriesByFolder(folderId: string): Series[] {
    const allSeries = this.getSeries();
    return allSeries.filter((series) => series.folderId === folderId);
  }

  /**
   * Clear all stored data
   */
  clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  }

  /**
   * Update last sync timestamp
   */
  private updateLastSync(): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  /**
   * Get last sync timestamp
   */
  getLastSync(): Date | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? new Date(data) : null;
    } catch (error) {
      console.error("Failed to get last sync:", error);
      return null;
    }
  }
}

export const storageService = new StorageService();
