import { AsyncState, Folder } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { 
  getFolders as getDBFolders, 
  addFolder as addDBFolder, 
  removeFolder as removeDBFolder 
} from "@/services/databaseService";
import { invoke } from "@tauri-apps/api/core";

/**
 * Hook to manage folders
 * Uses SQLite database via API for persistent storage
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
      // Load folders from database
      const folders = await getDBFolders();
      console.log("📁 Loaded folders from database:", folders.length);
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
      // Use Tauri dialog to select folder
      const path = await invoke<string | null>('select_folder_dialog');
      if (!path) return null;

      // Extract folder name from path
      const folderName = path.split(/[/\\]/).pop() || 'Folder';

      // Add folder to database
      const folder = await addDBFolder(path, folderName);
      
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
        await removeDBFolder(folderId);
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
