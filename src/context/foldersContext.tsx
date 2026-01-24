/**
 * Folders Context
 * Global state management for monitored folders
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Folder } from "@/types";
import { storageService } from "@/services/storageService";
import { tauriService } from "@/services/tauri";
import { redirect, useRouter } from "next/navigation";

interface FoldersContextType {
  folders: Folder[];
  selectedFolder: Folder | null;
  isLoading: boolean;
  addFolder: (path: string) => Promise<Folder>;
  removeFolder: (folderId: string) => Promise<void>;
  selectFolder: (folder: Folder | null) => void;
  refreshFolders: () => void;
  setOnNeedRedirect: (callback: () => void) => void;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onNeedRedirect, setOnNeedRedirect] = useState<(() => void) | null>(null);

  // Load folders from localStorage on mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Save last selected folder when it changes
  useEffect(() => {
    if (selectedFolder) {
      storageService.saveLastSelectedFolder(selectedFolder.id);
    }
  }, [selectedFolder]);

  const loadFolders = () => {
    try {
      const savedFolders = storageService.getFolders();
      console.log("📁 Folders loaded from localStorage:", savedFolders);
      setFolders(savedFolders);

      // Load last selected folder
      if (savedFolders.length > 0) {
        const lastFolderId = storageService.getLastSelectedFolderId();
        console.log("🔍 Last selected folder ID:", lastFolderId);
        const lastFolder = lastFolderId ? savedFolders.find((f) => f.id === lastFolderId) : null;

        // Select last folder or first folder
        const folderToSelect = lastFolder || savedFolders[0];
        console.log("✅ Selecting folder:", folderToSelect);
        setSelectedFolder(folderToSelect);
      } else {
        console.log("⚠️ No folders found in localStorage");
      }

      setIsLoading(false);
    } catch (error) {
      console.error("❌ Failed to load folders:", error);
      setIsLoading(false);
    }
  };

  const addFolder = async (path: string): Promise<Folder> => {
    try {
      // Use Tauri to create folder object
      const newFolder = await tauriService.addFolder(path);
      console.log("📂 New folder created:", newFolder);

      // Add to state
      const updatedFolders = [...folders, newFolder];
      setFolders(updatedFolders);

      // Persist to localStorage
      storageService.saveFolders(updatedFolders);
      console.log("💾 Folders saved to localStorage:", updatedFolders);

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
      // Remove from Rust backend
      await tauriService.removeFolder(folderId);

      // Remove from state
      const updatedFolders = folders.filter((f) => f.id !== folderId);
      setFolders(updatedFolders);

      // Persist to localStorage
      storageService.saveFolders(updatedFolders);

      // Remove media from this folder
      const allMovies = storageService.getMovies().filter((m) => m.folderId !== folderId);
      const allSeries = storageService.getSeries().filter((s) => s.folderId !== folderId);
      storageService.saveMovies(allMovies);
      storageService.saveSeries(allSeries);

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

  const refreshFolders = () => {
    loadFolders();
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
        setOnNeedRedirect: (callback) => setOnNeedRedirect(() => callback),
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
