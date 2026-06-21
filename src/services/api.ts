/**
 * API Service for Critix Vault
 * Handles all HTTP communication with Critix API
 */

import { ApiStatus } from "@/types/api";
import { DiscoveryCategory, DiscoveryFeed, TorrentMatch } from "@/types/discovery";
import { logger } from "@/lib/logger";

const API_BASE_URL = "/api/external";

export class ExternalApiOfflineError extends Error {
  constructor(message = "External API is offline") {
    super(message);
    this.name = "ExternalApiOfflineError";
  }
}

class ApiService {
  private externalApiOnline: boolean | null = null;

  setExternalApiOnlineStatus(isOnline: boolean) {
    this.externalApiOnline = isOnline;
  }

  async request<T>(endpoint: string, options?: RequestInit, config?: { allowWhenOffline?: boolean }): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    if (!config?.allowWhenOffline && this.externalApiOnline === false) {
      throw new ExternalApiOfflineError();
    }

    try {
      const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${details}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error("API request failed", error, { endpoint: normalizedEndpoint, method: options?.method ?? "GET" });
      throw error;
    }
  }

  /**
   * Check API status
   */
  async checkStatus(): Promise<ApiStatus> {
    try {
      const response = await this.request<ApiStatus>(
        "/status",
        { signal: AbortSignal.timeout(8_000) },
        { allowWhenOffline: true },
      );

      return { ...response, online: true };
    } catch (error) {
      logger.error("Erro ao consultar status da API", error);
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

  /**
   * Fetch the enriched discovery feed (TMDB trending + Apache highlights + PirateBay torrents).
   * Served from the backend Redis cache — typically responds in < 1s when warm.
   */
  async getDiscoveryFeed(page = 1, category: DiscoveryCategory = "all"): Promise<DiscoveryFeed> {
    const p = new URLSearchParams({ page: String(page), category });
    return this.request<DiscoveryFeed>(`/media/v1/discovery/feed?${p.toString()}`);
  }

  /**
   * Fetch the best-matching torrents for a specific media title + year from the backend.
   * Returns { torrents: [] } — never an error — when nothing is found.
   */
  async getTorrentsForMedia(
    title: string,
    year?: number,
    mediaType?: "movie" | "tv",
  ): Promise<{ torrents: TorrentMatch[] }> {
    const p = new URLSearchParams({ title });
    if (year) p.append("year", String(year));
    if (mediaType) p.append("mediaType", mediaType);
    return this.request<{ torrents: TorrentMatch[] }>(
      `/media/v1/discovery/torrents?${p.toString()}`,
    );
  }

  /**
   * Proxy a raw torrent search query through the backend to apibay.org.
   * Used as the primary search path when the backend is online (RF-09).
   */
  async searchTorrentsViaBackend(query: string): Promise<{ torrents: TorrentMatch[] }> {
    return this.request<{ torrents: TorrentMatch[] }>(
      `/media/v1/discovery/search?query=${encodeURIComponent(query)}`,
    );
  }
}

export const apiService = new ApiService();
