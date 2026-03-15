/**
 * API Service for Critix Vault
 * Handles all HTTP communication with Critix API
 */

import { ApiStatus } from "@/types/api";

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
   * Get media details by ID
   */
  async getMediaDetails(mediaId: string, type: "movie" | "series") {
    return this.request(`/media/${type}/${mediaId}/details`);
  }

  /**
   * Search media by name
   */
  async searchMedia(query: string, type?: "movie" | "series") {
    const params = new URLSearchParams({ query });
    if (type) params.append("type", type);
    return this.request(`/media/search?${params.toString()}`);
  }

  /**
   * Search media by title using the correct API endpoint
   * Returns generic response with media_type to identify movie or series
   */
  async searchMediaByTitle(query: string, returnMulti: boolean = false, normalizeText = true) {
    const params = new URLSearchParams();
    params.append("query", query);
    params.append("normalizeText", String(normalizeText));
    if (returnMulti) {
      params.append("returnMode", "multi");
    }
    return this.request(`/media/v1/search/title?${params.toString()}`);
  }

  /**
   * Get detailed media information by ID and type
   */
  async getMediaDetailsById(mediaId: string, mediaType: "movie" | "tv") {
    return this.request(`/media/v1/${mediaType}/${mediaId}/details`);
  }
}

export const apiService = new ApiService();
