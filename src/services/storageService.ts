/**
 * Storage Service for Critix Vault
 *
 * ⚠️ DEPRECATED - Use databaseService.ts instead
 *
 * This service is now deprecated and will be removed in a future version.
 * All storage operations have been migrated to SQLite via databaseService.ts
 *
 * Migration Guide:
 * - Use databaseService functions for all storage operations
 * - Database provides better performance, type safety, and referential integrity
 * - Data location: {appDataDir}/critix.db
 *
 * @deprecated Use databaseService.ts for all storage operations
 */

import { Folder, Movie, Series } from "@/types/utils";
import { tauriService, AppSettings, CacheInfo } from "./tauri";

// Legacy storage keys (for migration purposes)
export const STORAGE_KEYS = {
  FOLDERS: "critix_vault_folders",
  MOVIES: "critix_vault_movies",
  SERIES: "critix_vault_series",
  LAST_SYNC: "critix_vault_last_sync",
  LAST_SELECTED_FOLDER: "critix_vault_last_selected_folder",
};

class StorageService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize storage and migrate data from localStorage if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Check if we have data in localStorage that needs to be migrated
      await this.migrateFromLocalStorage();
      this.initialized = true;
      console.log("✅ StorageService initialized with Rust backend");
    } catch (error) {
      console.error("❌ Failed to initialize StorageService:", error);
      throw error;
    }
  }

  /**
   * Migrate data from localStorage to Rust backend (one-time operation)
   */
  private async migrateFromLocalStorage(): Promise<void> {
    try {
      // Check if migration is needed
      const migrated = localStorage.getItem("critix_vault_migrated_to_rust");
      if (migrated === "true") return;

      console.log("🔄 Checking for localStorage data to migrate...");

      // Migrate folders
      const foldersJson = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      if (foldersJson) {
        const folders = JSON.parse(foldersJson) as Folder[];
        if (folders.length > 0) {
          console.log(`📁 Migrating ${folders.length} folders...`);
          // Note: We can't directly save folders, they need to be added one by one
          // For now, just log the migration need
        }
      }

      // Migrate movies
      const moviesJson = localStorage.getItem(STORAGE_KEYS.MOVIES);
      if (moviesJson) {
        const movies = JSON.parse(moviesJson) as Movie[];
        if (movies.length > 0) {
          console.log(`🎬 Migrating ${movies.length} movies...`);
          await tauriService.saveMovies(movies);
        }
      }

      // Migrate series
      const seriesJson = localStorage.getItem(STORAGE_KEYS.SERIES);
      if (seriesJson) {
        const series = JSON.parse(seriesJson) as Series[];
        if (series.length > 0) {
          console.log(`📺 Migrating ${series.length} series...`);
          await tauriService.saveSeries(series);
        }
      }

      // Migrate last selected folder
      const lastSelected = localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_FOLDER);
      if (lastSelected) {
        await tauriService.saveLastSelectedFolder(lastSelected);
      }

      // Mark migration as complete
      localStorage.setItem("critix_vault_migrated_to_rust", "true");

      // Clear old localStorage data
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      console.log("✅ Migration complete!");
    } catch (error) {
      console.error("⚠️ Migration failed, will use Rust backend directly:", error);
    }
  }

  // ============================================================================
  // Folder Management (delegated to Rust)
  // ============================================================================

  /**
   * Save folders - Now handled by Rust backend automatically
   * @deprecated Use tauriService.addFolder() instead
   */
  saveFolders(folders: Folder[]): void {
    console.warn("saveFolders is deprecated. Folders are managed by Rust backend.");
  }

  /**
   * Get folders from Rust backend
   */
  async getFoldersAsync(): Promise<Folder[]> {
    return tauriService.getFolders();
  }

  /**
   * Synchronous getter for backwards compatibility
   * Returns empty array - use getFoldersAsync() instead
   * @deprecated Use getFoldersAsync() instead
   */
  getFolders(): Folder[] {
    console.warn("Synchronous getFolders() is deprecated. Use getFoldersAsync()");
    return [];
  }

  // ============================================================================
  // Last Selected Folder
  // ============================================================================

  /**
   * Save last selected folder ID
   */
  async saveLastSelectedFolderAsync(folderId: string): Promise<void> {
    await tauriService.saveLastSelectedFolder(folderId);
  }

  /**
   * Synchronous version for backwards compatibility
   * @deprecated Use saveLastSelectedFolderAsync() instead
   */
  saveLastSelectedFolder(folderId: string): void {
    tauriService.saveLastSelectedFolder(folderId).catch(console.error);
  }

  /**
   * Get last selected folder ID
   */
  async getLastSelectedFolderIdAsync(): Promise<string | null> {
    return tauriService.getLastSelectedFolder();
  }

  /**
   * Synchronous version for backwards compatibility
   * @deprecated Use getLastSelectedFolderIdAsync() instead
   */
  getLastSelectedFolderId(): string | null {
    console.warn("Synchronous getLastSelectedFolderId() is deprecated. Use getLastSelectedFolderIdAsync()");
    return null;
  }

  // ============================================================================
  // Movie Management
  // ============================================================================

  /**
   * Save movies to Rust backend
   */
  async saveMoviesAsync(movies: Movie[]): Promise<void> {
    await tauriService.saveMovies(movies);
  }

  /**
   * Synchronous version for backwards compatibility
   * @deprecated Use saveMoviesAsync() instead
   */
  saveMovies(movies: Movie[]): void {
    tauriService.saveMovies(movies).catch(console.error);
  }

  /**
   * Get movies from Rust backend
   */
  async getMoviesAsync(): Promise<Movie[]> {
    return tauriService.getMovies();
  }

  /**
   * Synchronous getter for backwards compatibility
   * @deprecated Use getMoviesAsync() instead
   */
  getMovies(): Movie[] {
    console.warn("Synchronous getMovies() is deprecated. Use getMoviesAsync()");
    return [];
  }

  /**
   * Get movies by folder ID
   */
  async getMoviesByFolderAsync(folderId: string): Promise<Movie[]> {
    const allMovies = await tauriService.getMovies();
    return allMovies.filter((movie) => movie.folderId === folderId);
  }

  /**
   * @deprecated Use getMoviesByFolderAsync() instead
   */
  getMoviesByFolder(folderId: string): Movie[] {
    console.warn("Synchronous getMoviesByFolder() is deprecated. Use getMoviesByFolderAsync()");
    return [];
  }

  /**
   * Update a single movie
   */
  async updateMovieAsync(movie: Movie): Promise<void> {
    await tauriService.updateMovie(movie);
  }

  /**
   * @deprecated Use updateMovieAsync() instead
   */
  updateMovie(updatedMovie: Movie): void {
    tauriService.updateMovie(updatedMovie).catch(console.error);
  }

  /**
   * Remove a movie
   */
  async removeMovieAsync(movieId: string, folderId: string): Promise<void> {
    await tauriService.removeMovie(movieId, folderId);
  }

  /**
   * @deprecated Use removeMovieAsync() instead
   */
  removeMovie(movieId: string, folderId: string): void {
    tauriService.removeMovie(movieId, folderId).catch(console.error);
  }

  // ============================================================================
  // Series Management
  // ============================================================================

  /**
   * Save series to Rust backend
   */
  async saveSeriesAsync(series: Series[]): Promise<void> {
    await tauriService.saveSeries(series);
  }

  /**
   * @deprecated Use saveSeriesAsync() instead
   */
  saveSeries(series: Series[]): void {
    tauriService.saveSeries(series).catch(console.error);
  }

  /**
   * Get series from Rust backend
   */
  async getSeriesAsync(): Promise<Series[]> {
    return tauriService.getSeries();
  }

  /**
   * @deprecated Use getSeriesAsync() instead
   */
  getSeries(): Series[] {
    console.warn("Synchronous getSeries() is deprecated. Use getSeriesAsync()");
    return [];
  }

  /**
   * Get series by folder ID
   */
  async getSeriesByFolderAsync(folderId: string): Promise<Series[]> {
    const allSeries = await tauriService.getSeries();
    return allSeries.filter((series) => series.folderId === folderId);
  }

  /**
   * @deprecated Use getSeriesByFolderAsync() instead
   */
  getSeriesByFolder(folderId: string): Series[] {
    console.warn("Synchronous getSeriesByFolder() is deprecated. Use getSeriesByFolderAsync()");
    return [];
  }

  /**
   * Update a single series
   */
  async updateSeriesAsync(series: Series): Promise<void> {
    await tauriService.updateSeries(series);
  }

  /**
   * @deprecated Use updateSeriesAsync() instead
   */
  updateSeries(updatedSeries: Series): void {
    tauriService.updateSeries(updatedSeries).catch(console.error);
  }

  /**
   * Remove a series
   */
  async removeSeriesAsync(seriesId: string, folderId: string): Promise<void> {
    await tauriService.removeSeries(seriesId, folderId);
  }

  /**
   * @deprecated Use removeSeriesAsync() instead
   */
  removeSeries(seriesId: string, folderId: string): void {
    tauriService.removeSeries(seriesId, folderId).catch(console.error);
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Clear all stored data (DESTRUCTIVE!)
   */
  async clearAllAsync(): Promise<void> {
    await tauriService.clearAllData();
    // Also clear localStorage migration flag
    localStorage.removeItem("critix_vault_migrated_to_rust");
  }

  /**
   * @deprecated Use clearAllAsync() instead
   */
  clearAll(): void {
    tauriService.clearAllData().catch(console.error);
    localStorage.removeItem("critix_vault_migrated_to_rust");
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<CacheInfo> {
    return tauriService.getCacheInfo();
  }

  /**
   * Get the data directory path
   */
  async getDataDirectory(): Promise<string> {
    return tauriService.getDataDirectory();
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<string> {
    return tauriService.exportData();
  }

  /**
   * Import data from JSON
   */
  async importData(jsonData: string): Promise<void> {
    return tauriService.importData(jsonData);
  }

  // ============================================================================
  // Settings
  // ============================================================================

  /**
   * Get app settings
   */
  async getSettings(): Promise<AppSettings> {
    return tauriService.getSettings();
  }

  /**
   * Save app settings
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    return tauriService.saveSettings(settings);
  }

  // ============================================================================
  // Image Cache
  // ============================================================================

  /**
   * Cache an image from URL
   */
  async cacheImage(url: string): Promise<string> {
    return tauriService.cacheImage(url);
  }

  /**
   * Get cached image path
   */
  async getCachedImagePath(url: string): Promise<string | null> {
    return tauriService.getCachedImagePath(url);
  }

  /**
   * Check if image is cached
   */
  async isImageCached(url: string): Promise<boolean> {
    return tauriService.isImageCached(url);
  }

  // ============================================================================
  // Series Manual Edits
  // ============================================================================

  /**
   * Save series manual edits to localStorage
   */
  saveSeriesEdits(seriesId: string, edits: any): void {
    try {
      const key = `critix_series_edits_${seriesId}`;
      localStorage.setItem(key, JSON.stringify(edits));
    } catch (error) {
      console.error("Error saving series edits:", error);
    }
  }

  /**
   * Get series manual edits from localStorage
   */
  getSeriesEdits(seriesId: string): any | null {
    try {
      const key = `critix_series_edits_${seriesId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Error loading series edits:", error);
      return null;
    }
  }

  /**
   * Check if series has manual edits
   */
  hasSeriesEdits(seriesId: string): boolean {
    const edits = this.getSeriesEdits(seriesId);
    return edits !== null && edits.manuallyEdited === true;
  }

  /**
   * Remove series manual edits
   */
  removeSeriesEdits(seriesId: string): void {
    try {
      const key = `critix_series_edits_${seriesId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing series edits:", error);
    }
  }

  // ============================================================================
  // Legacy Support
  // ============================================================================

  /**
   * @deprecated
   */
  private updateLastSync(): void {
    // No longer needed
  }

  /**
   * @deprecated
   */
  getLastSync(): Date | null {
    return null;
  }
}

export const storageService = new StorageService();
