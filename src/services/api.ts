/**
 * API Service for Critix Vault
 * Handles all HTTP communication with Critix API
 */

import { ApiStatus, ScanResult } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_CRITIX_API_URL || "http://localhost:8080/";

 class ApiService {
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API Request failed:", error);
      throw error;
    }
  }

  /**
   * Check API status
   */
  async checkStatus(): Promise<ApiStatus> {
    try {
      const response = await this.request<ApiStatus>("/status");
      return { ...response, online: true };
    } catch (error) {
      console.error(`Erro ao consultar status: ${error}`);
      return {
        online: false,
        message: error instanceof Error ? error.message : "API is offline",
      };
    }
  }

  /**
   * Scan a folder for media files
   */
  async scanFolder(folderId: string, folderPath: string): Promise<ScanResult> {
    return this.request<ScanResult>("/media/scan", {
      method: "POST",
      body: JSON.stringify({ folderId, folderPath }),
    });
  }

  /**
   * Get media details by ID
   */
  async getMediaDetails(mediaId: string, type: "movie" | "series") {
    return this.request(`/media/${type}/${mediaId}`);
  }

  /**
   * Search media by name
   */
  async searchMedia(query: string, type?: "movie" | "series") {
    const params = new URLSearchParams({ query });
    if (type) params.append("type", type);
    return this.request(`/media/search?${params.toString()}`);
  }
}

export const apiService = new ApiService();
