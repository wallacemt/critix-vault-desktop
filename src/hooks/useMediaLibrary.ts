/**
 * Custom hooks for Critix Vault
 *
 * Uses Rust backend for persistent storage that survives app restarts.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { folderScanService } from "@/services/folderScanService";
import { apiService } from "@/services/api";
import { tauriService } from "@/services/tauri";
import { Movie, Series, Media } from "@/types";
import { useFoldersContext } from "@/context/foldersContext";

/**
 * Hook to manage media library for a specific folder
 * Reads from Rust backend (persistent storage) and filters by folderId
 */
export function useMediaLibrary(folderId: string | null) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { folders } = useFoldersContext();

  const loadMediaFromStorage = useCallback(async () => {
    if (!folderId) {
      console.log("⚠️ No folderId, clearing media");
      setMovies([]);
      setSeries([]);
      return;
    }

    setLoading(true);
    try {
      // Load media from Rust backend (persistent storage)
      const allMovies = await tauriService.getMovies();
      const allSeries = await tauriService.getSeries();

      console.log("📦 All movies in storage:", allMovies.length);
      console.log("📦 All series in storage:", allSeries.length);
      console.log("🔍 Filtering for folderId:", folderId);

      const filteredMovies = allMovies.filter((movie) => {
        const match = movie.folderId === folderId;
        if (match) console.log("✅ Movie matched:", movie.title);
        return match;
      });
      const filteredSeries = allSeries.filter((s) => {
        const match = s.folderId === folderId;
        if (match) console.log("✅ Series matched:", s.title);
        return match;
      });

      console.log("🎬 Loaded movies for folder:", filteredMovies.length);
      console.log("📺 Loaded series for folder:", filteredSeries.length);

      setMovies(filteredMovies);
      setSeries(filteredSeries);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load media";
      setError(errorMessage);
      setMovies([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  const scanFolder = async (folderPath: string) => {
    if (!folderId) return;

    // Get existing media for this folder (for intelligent rescan)
    const allMovies = await tauriService.getMovies();
    const allSeries = await tauriService.getSeries();
    const existingMovies = allMovies.filter((m) => m.folderId === folderId);
    const existingSeries = allSeries.filter((s) => s.folderId === folderId);
    const otherMovies = allMovies.filter((m) => m.folderId !== folderId);
    const otherSeries = allSeries.filter((s) => s.folderId !== folderId);

    try {
      setScanning(true);
      setScanProgress(0);
      setError(null);

      console.log("🔍 Starting folder scan:", folderPath);

      // Scan the folder using Rust + API
      const result = await folderScanService.scanAndMatchFolder(folderId, folderPath, (progress) => {
        const percent = progress.totalFiles > 0 ? (progress.processedFiles / progress.totalFiles) * 100 : 0;
        setScanProgress(percent);
      });

      console.log("✅ Scan complete:", result);

      // Smart rescan: detect new media and mark missing media as watched
      console.log("📊 Rescan analysis:");
      console.log(`  - Existing movies: ${existingMovies.length}`);
      console.log(`  - Existing series: ${existingSeries.length}`);
      console.log(`  - Found movies: ${result.movies.length}`);
      console.log(`  - Found series: ${result.series.length}`);

      // Create lookup maps for found media (by ID)
      const foundMovieIds = new Set(result.movies.map((m) => m.id));
      const foundSeriesIds = new Set(result.series.map((s) => s.id));

      // Find truly new media (not in existing)
      const existingMovieIds = new Set(existingMovies.map((m) => m.id));
      const existingSeriesIds = new Set(existingSeries.map((s) => s.id));
      const newMovies = result.movies.filter((m) => !existingMovieIds.has(m.id));
      const newSeries = result.series.filter((s) => !existingSeriesIds.has(s.id));

      console.log("✨ New media to add:");
      console.log(`  - New movies: ${newMovies.length}`);
      newMovies.forEach((m) => console.log(`    📽️  ${m.title}`));
      console.log(`  - New series: ${newSeries.length}`);
      newSeries.forEach((s) => console.log(`    📺 ${s.title}`));

      // Find missing media (was in folder, not found anymore)
      const missingMovies = existingMovies.filter((m) => !foundMovieIds.has(m.id));
      const missingSeries = existingSeries.filter((s) => !foundSeriesIds.has(s.id));

      if (missingMovies.length > 0 || missingSeries.length > 0) {
        console.log("📝 Missing media (will mark as watched):");
        console.log(`  - Missing movies: ${missingMovies.length}`);
        missingMovies.forEach((m) => console.log(`    🗑️  ${m.title}`));
        console.log(`  - Missing series: ${missingSeries.length}`);
        missingSeries.forEach((s) => console.log(`    🗑️  ${s.title}`));

        // TODO Task 2: Mark as watched
        // For now, just keep them in the database
        console.log("⏳ Task 2: Marking as watched not yet implemented - keeping in database");
      }

      // IMPORTANT: Keep ALL existing media + add only new ones
      // Do NOT remove missing media from database (they should be marked as watched instead)
      const moviesToSave = [...otherMovies, ...existingMovies, ...newMovies].filter((m) => {
        if (!m.id || m.id === "") {
          console.warn("⚠️ Skipping movie without ID:", m.title);
          return false;
        }
        return true;
      });

      const seriesToSave = [...otherSeries, ...existingSeries, ...newSeries]
        .filter((s) => {
          if (!s.id || s.id === "") {
            console.warn("⚠️ Skipping series without ID:", s.title);
            return false;
          }
          return true;
        })
        .map((s) => ({
          ...s,
          seasons: s.seasons || [],
          numberOfSeasons: s.numberOfSeasons || 0,
          numberOfEpisodes: s.numberOfEpisodes || 0,
        }));

      console.log("💾 Saving movies:", moviesToSave.length);
      console.log("💾 Saving series:", seriesToSave.length);
      console.log("📊 Final Summary:");
      console.log(`  - Total movies in library: ${moviesToSave.length}`);
      console.log(`  - Total series in library: ${seriesToSave.length}`);
      console.log(`  - Movies in this folder: ${existingMovies.length + newMovies.length}`);
      console.log(`  - Series in this folder: ${existingSeries.length + newSeries.length}`);
      console.log(`  - New added this scan: ${newMovies.length} movies, ${newSeries.length} series`);

      try {
        await tauriService.saveMovies(moviesToSave);
        console.log("✅ Movies saved successfully");
      } catch (movieErr) {
        console.error("❌ Failed to save movies:", movieErr);
        throw movieErr;
      }

      try {
        await tauriService.saveSeries(seriesToSave);
        console.log("✅ Series saved successfully");
      } catch (seriesErr) {
        console.error("❌ Failed to save series:", seriesErr);
        throw seriesErr;
      }

      // Reload from storage
      await loadMediaFromStorage();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to scan folder";
      console.error("❌ Scan error:", errorMessage);
      setError(errorMessage);
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  useEffect(() => {
    console.log("🔄 useMediaLibrary - folderId changed:", folderId);
    loadMediaFromStorage();
  }, [folderId, loadMediaFromStorage]);

  /**
   * Update a media item with new information from API
   * Used when user corrects an incorrect match
   */
  const updateMedia = useCallback(
    async (originalMedia: Media, newMediaId: string, newMediaType: "movie" | "tv"): Promise<void> => {
      if (!folderId) return;

      try {
        console.log(`🔄 Updating media: ${originalMedia.title} -> ID: ${newMediaId} (${newMediaType})`);

        // Fetch detailed info from API
        const details = await apiService.getMediaDetailsById(newMediaId, newMediaType);

        if (!details) {
          throw new Error("Failed to fetch media details");
        }

        const apiData = details as any;

        // Build the updated media object
        const baseInfo = {
          id: apiData.id?.toString() || newMediaId,
          title: apiData.title || apiData.name || "Unknown",
          originalTitle: apiData.original_title || apiData.original_name,
          overview: apiData.overview,
          poster: apiData.poster_path ? `https://image.tmdb.org/t/p/w500${apiData.poster_path}` : undefined,
          backdrop: apiData.backdrop_path ? `https://image.tmdb.org/t/p/original${apiData.backdrop_path}` : undefined,
          rating: apiData.vote_average,
          year: parseInt(apiData.release_date?.split("-")[0] || apiData.first_air_date?.split("-")[0] || "0"),
          status: "MATCHED" as const,
          folderId: originalMedia.folderId,
          filePath: originalMedia.filePath,
        };

        if (newMediaType === "movie") {
          // Remove from series if it was there, then add/update as movie
          if (originalMedia.type === "SERIES") {
            await tauriService.removeSeries(originalMedia.id, folderId);
          }

          const updatedMovie: Movie = {
            ...baseInfo,
            type: "MOVIE",
            duration: apiData.runtime,
            releaseDate: apiData.release_date,
            trailer: apiData.videos?.results?.[0]?.key
              ? `https://www.youtube.com/watch?v=${apiData.videos.results[0].key}`
              : undefined,
          };

          await tauriService.updateMovie(updatedMovie);
        } else {
          // Remove from movies if it was there, then add/update as series
          if (originalMedia.type === "MOVIE") {
            await tauriService.removeMovie(originalMedia.id, folderId);
          }

          const updatedSeries: Series = {
            ...baseInfo,
            type: "SERIES",
            numberOfSeasons: apiData.number_of_seasons || 0,
            numberOfEpisodes: apiData.number_of_episodes || 0,
            firstAirDate: apiData.first_air_date,
            lastAirDate: apiData.last_air_date,
            seasons:
              apiData.seasons?.map((season: any) => ({
                id: `${apiData.id}-s${season.season_number}`,
                seasonNumber: season.season_number,
                name: season.name,
                overview: season.overview,
                poster: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : undefined,
                episodeCount: season.episode_count,
                episodes: [],
                available: false,
                downloadedEpisodes: 0,
              })) || [],
            trailer: apiData.videos?.results?.[0]?.key
              ? `https://www.youtube.com/watch?v=${apiData.videos.results[0].key}`
              : undefined,
          };

          await tauriService.updateSeries(updatedSeries);
        }

        // Reload from storage to update UI
        await loadMediaFromStorage();

        console.log("✅ Media updated successfully");
      } catch (error) {
        console.error("Failed to update media:", error);
        throw error;
      }
    },
    [folderId, loadMediaFromStorage],
  );

  return {
    movies,
    series,
    loading,
    scanning,
    scanProgress,
    error,
    scanFolder,
    updateMedia,
    refreshMedia: loadMediaFromStorage, // Expose reload function
  };
}
