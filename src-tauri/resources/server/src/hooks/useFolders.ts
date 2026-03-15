import { Folder } from "@/types/folder";
import { useCallback, useEffect, useState } from "react";
import {
  getFolders as getDBFolders,
  addFolder as addDBFolder,
  removeFolder as removeDBFolder,
} from "@/services/databaseService";
import { AsyncState } from "@/types/utils";

// @tauri-apps/api accesses the bare `location` global at module-init time,
// which is not defined in the Node.js SSR/static-generation environment.
// Importing it dynamically restricts the evaluation to the browser runtime.
const getTauriInvoke = () => import("@tauri-apps/api/core").then((m) => m.invoke);

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
      // Use Tauri dialog to select folder — use dynamic import so the
      // @tauri-apps/api module is never evaluated during SSR/static-gen.
      const invoke = await getTauriInvoke();
      const path = await invoke<string | null>("select_folder_dialog");
      if (!path) return null;

      // Extract folder name from path
      const folderName = path.split(/[/\\]/).pop() || "Folder";

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
