/**
 * Folders Context
 * Global state management for monitored folders
 *
 * Now uses Rust backend for persistent storage that survives app restarts.
 * Data is stored in the app's data directory, not localStorage.
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Folder } from "@/types";
import { tauriService } from "@/services/tauri";

interface FoldersContextType {
  folders: Folder[];
  selectedFolder: Folder | null;
  isLoading: boolean;
  addFolder: (path: string) => Promise<Folder>;
  removeFolder: (folderId: string) => Promise<void>;
  selectFolder: (folder: Folder | null) => void;
  refreshFolders: () => Promise<void>;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onNeedRedirect, setOnNeedRedirect] = useState<(() => void) | null>(null);

  // Load folders from Rust backend on mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Save last selected folder when it changes (to Rust backend)
  useEffect(() => {
    if (selectedFolder) {
      tauriService.saveLastSelectedFolder(selectedFolder.id).catch(console.error);
    }
  }, [selectedFolder]);

  const loadFolders = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load folders from Rust backend (persistent storage)
      const savedFolders = await tauriService.getFolders();
      console.log("📁 Folders loaded from Rust backend:", savedFolders);
      setFolders(savedFolders);

      // Load last selected folder from Rust backend
      if (savedFolders.length > 0) {
        const lastFolderId = await tauriService.getLastSelectedFolder();
        console.log("🔍 Last selected folder ID:", lastFolderId);
        const lastFolder = lastFolderId ? savedFolders.find((f) => f.id === lastFolderId) : null;

        // Select last folder or first folder
        const folderToSelect = lastFolder || savedFolders[0];
        console.log("✅ Selecting folder:", folderToSelect);
        setSelectedFolder(folderToSelect);
      } else {
        console.log("⚠️ No folders found in storage");
        setSelectedFolder(null);
      }
    } catch (error) {
      console.error("❌ Failed to load folders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addFolder = async (path: string): Promise<Folder> => {
    try {
      // Use Tauri to create folder object (automatically persisted to disk)
      const newFolder = await tauriService.addFolder(path);
      console.log("📂 New folder created and persisted:", newFolder);

      // Update state
      const updatedFolders = [...folders, newFolder];
      setFolders(updatedFolders);

      // Auto-select if first folder
      if (updatedFolders.length === 1) {
        setSelectedFolder(newFolder);
      }

      return newFolder;
    } catch (error) {
      console.error("❌ Failed to add folder:", error);
      throw error;
    }
  };

  const removeFolder = async (folderId: string): Promise<void> => {
    try {
      // Remove from Rust backend (also removes associated media automatically)
      await tauriService.removeFolder(folderId);

      // Update state
      const updatedFolders = folders.filter((f) => f.id !== folderId);
      setFolders(updatedFolders);

      // Clear selection if removed folder was selected
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(updatedFolders[0] || null);
      }

      // Redirect to landing if no folders left
      if (updatedFolders.length === 0 && onNeedRedirect) {
        console.log("🔄 No folders left, calling redirect callback");
        onNeedRedirect();
      }
    } catch (error) {
      console.error("Failed to remove folder:", error);
      throw error;
    }
  };

  const selectFolder = (folder: Folder | null) => {
    setSelectedFolder(folder);
  };

  const refreshFolders = async () => {
    await loadFolders();
  };

  return (
    <FoldersContext.Provider
      value={{
        folders,
        selectedFolder,
        isLoading,
        addFolder,
        removeFolder,
        selectFolder,
        refreshFolders,
      }}
    >
      {children}
    </FoldersContext.Provider>
  );
}

export function useFoldersContext() {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error("useFoldersContext must be used within FoldersProvider");
  }
  return context;
}
