/**
 * Custom hooks for Critix Vault
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/services/api";
import { tauriService } from "@/services/tauri";
import { ApiStatus, Folder, AsyncState, Movie, Series } from "@/types";




/**
 * Hook to manage media library for a specific folder
 */
export function useMediaLibrary(folderId: string | null) {
  const [state, setState] = useState<
    AsyncState<{
      movies: Movie[];
      series: Series[];
    }>
  >({
    data: null,
    loading: false,
    error: null,
  });

  const scanFolder = useCallback(
    async (folderPath: string) => {
      if (!folderId) return;

      setState({ data: null, loading: true, error: null });
      try {
        // First, scan folder with Tauri to get file paths
        await tauriService.scanFolder(folderId);

        // Then, call API to identify media
        const result = await apiService.scanFolder(folderId, folderPath);

        setState({
          data: {
            movies: result.movies,
            series: result.series,
          },
          loading: false,
          error: null,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to scan folder";
        setState({ data: null, loading: false, error: errorMessage });
        throw error;
      }
    },
    [folderId],
  );

  return {
    movies: state.data?.movies || [],
    series: state.data?.series || [],
    loading: state.loading,
    error: state.error,
    scanFolder,
  };
}



