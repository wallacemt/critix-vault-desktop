import { tauriService } from "@/services/tauri";
import { AsyncState, Folder } from "@/types";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook to manage folders
 * Uses Rust backend for persistent storage
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
      // Load folders from Rust backend (persistent storage)
      const folders = await tauriService.getFolders();
      console.log("📁 Loaded folders from Rust backend:", folders.length);
      setState({ data: folders, loading: false, error: null });
      return folders;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load folders";
      console.error("❌ Failed to load folders:", errorMessage);
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
