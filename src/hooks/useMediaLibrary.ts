/**
 * Custom hooks for Critix Vault
 */

"use client";

import { useState, useEffect } from "react";
import { STORAGE_KEYS, storageService } from "@/services/storageService";
import { folderScanService } from "@/services/folderScanService";
import { Movie, Series } from "@/types";
import { useFoldersContext } from "@/context/foldersContext";

/**
 * Hook to manage media library for a specific folder
 * Reads from localStorage and filters by folderId
 */
export function useMediaLibrary(folderId: string | null) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { folders } = useFoldersContext();
  const loadMediaFromStorage = () => {
    if (!folderId) {
      console.log("⚠️ No folderId, clearing media");
      setMovies([]);
      setSeries([]);
      return;
    }

    setLoading(true);
    try {
      // Load media from localStorage and filter by folderId
      const allMovies = storageService.getMovies();
      const allSeries = storageService.getSeries();

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
  };

  const scanFolder = async (folderPath: string) => {
    if (!folderId) return;

    if (folders.some((f) => f.path === folderPath)) {
      storageService.clearAll();
    }
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

      // Save to localStorage (replacing existing media for this folder)
      const allMovies = storageService.getMovies();
      const allSeries = storageService.getSeries();

      // Remove old media for this folder
      const otherMovies = allMovies.filter((m) => m.folderId !== folderId);
      const otherSeries = allSeries.filter((s) => s.folderId !== folderId);

      // Add new scanned media
      storageService.saveMovies([...otherMovies, ...result.movies]);
      storageService.saveSeries([...otherSeries, ...result.series]);

      // Reload from storage
      loadMediaFromStorage();
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
  }, [folderId]);

  return {
    movies,
    series,
    loading,
    scanning,
    scanProgress,
    error,
    scanFolder,
  };
}
