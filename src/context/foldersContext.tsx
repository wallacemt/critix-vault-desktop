/**
 * Folders Context
 * Global state management for monitored folders
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Folder } from "@/types";
import { storageService } from "@/services/storageService";
import { tauriService } from "@/services/tauri";

interface FoldersContextType {
  folders: Folder[];
  selectedFolder: Folder | null;
  isLoading: boolean;
  addFolder: (path: string) => Promise<Folder>;
  removeFolder: (folderId: string) => Promise<void>;
  selectFolder: (folder: Folder | null) => void;
  refreshFolders: () => void;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      // Check if folder already exists
      const exists = folders.some((f) => f.path === newFolder.path);
      console.log("🔎 Checking if folder exists. Current folders:", folders);
      console.log("🔎 Path to check:", newFolder.path);
      console.log("🔎 Exists:", exists);

      if (exists) {
        throw new Error("Esta pasta já foi adicionada");
      }

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

      // Clear selection if removed folder was selected
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(updatedFolders[0] || null);
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
