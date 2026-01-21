import { tauriService } from "@/services/tauri";
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
      const folders = await tauriService.getFolders();
      setState({ data: folders, loading: false, error: null });
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
      setState((prev) => ({
        ...prev,
        data: [...(prev.data || []), folder],
      }));
      return folder;
    } catch (error) {
      console.error("Failed to add folder:", error);
      throw error;
    }
  }, []);

  const removeFolder = useCallback(async (folderId: string) => {
    try {
      await tauriService.removeFolder(folderId);
      setState((prev) => ({
        ...prev,
        data: prev.data?.filter((f) => f.id !== folderId) || null,
      }));
    } catch (error) {
      console.error("Failed to remove folder:", error);
      throw error;
    }
  }, []);

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
