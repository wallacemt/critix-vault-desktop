import { tauriService } from "@/services/tauri";
import { storageService } from "@/services/storageService";
import { AsyncState, Folder } from "@/types";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook to manage folders
 */
export function useFolders() {
  const [state, setState] = useState<AsyncState<Folder[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const loadFolders = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Try localStorage first for instant load
      const storedFolders = storageService.getFolders();
      if (storedFolders.length > 0) {
        setState({ data: storedFolders, loading: false, error: null });
      }

      // Then sync with Tauri
      const folders = await tauriService.getFolders();
      setState({ data: folders, loading: false, error: null });
      storageService.saveFolders(folders);
      return folders;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load folders";
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const addFolder = useCallback(async () => {
    try {
      const path = await tauriService.selectFolder();
      if (!path) return null;

      const folder = await tauriService.addFolder(path);
      const updatedFolders = [...(state.data || []), folder];
      setState((prev) => ({
        ...prev,
        data: updatedFolders,
      }));
      storageService.saveFolders(updatedFolders);
      return folder;
    } catch (error) {
      console.error("Failed to add folder:", error);
      throw error;
    }
  }, [state.data]);

  const removeFolder = useCallback(
    async (folderId: string) => {
      try {
        await tauriService.removeFolder(folderId);
        const updatedFolders = state.data?.filter((f) => f.id !== folderId) || null;
        setState((prev) => ({
          ...prev,
          data: updatedFolders,
        }));
        if (updatedFolders) {
          storageService.saveFolders(updatedFolders);
        }
      } catch (error) {
        console.error("Failed to remove folder:", error);
        throw error;
      }
    },
    [state.data],
  );

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return {
    folders: state.data,
    loading: state.loading,
    error: state.error,
    addFolder,
    removeFolder,
    refresh: loadFolders,
  };
}
