/**
 * Tauri Service for Critix Vault
 * Handles all communication with Rust backend
 */

import { invoke } from "@tauri-apps/api/core";
import { Folder } from "@/types";

class TauriService {
  /**
   * Open folder picker dialog
   */
  async selectFolder(): Promise<string | null> {
    try {
      // Using Tauri's dialog plugin which needs to be installed
      // For now, return null - will be implemented once plugin is installed
      const selected = await invoke<string | null>("select_folder_dialog");
      return selected;
    } catch (error) {
      console.error("Failed to open folder picker:", error);
      return null;
    }
  }

  /**
   * Add a folder to the monitored list
   */
  async addFolder(path: string): Promise<Folder> {
    return invoke<Folder>("add_folder", { path });
  }

  /**
   * Remove a folder from the monitored list
   */
  async removeFolder(folderId: string): Promise<void> {
    return invoke("remove_folder", { folderId });
  }

  /**
   * Get all monitored folders
   */
  async getFolders(): Promise<Folder[]> {
    return invoke<Folder[]>("get_folders");
  }

  /**
   * Scan a specific folder for media files
   */
  async scanFolder(folderPath: string): Promise<string[]> {
    return invoke<string[]>("scan_folder", { folderPath });
  }

  /**
   * Open a media file with the default or specified player
   */
  async openMedia(filePath: string, player?: "vlc" | "default"): Promise<void> {
    return invoke("open_media", { filePath, player: player || "default" });
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string) {
    return invoke("get_file_metadata", { filePath });
  }
}

export const tauriService = new TauriService();
