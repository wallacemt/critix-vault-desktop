"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiService, ExternalApiOfflineError } from "@/services/api";
import { tauriService, type TorrentResult } from "@/services/tauri";
import {
  DiscoveryCategory,
  DiscoveryFeed,
  DiscoveryFilters,
  DiscoveryItem,
  TorrentMatch,
} from "@/types/discovery";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

const VIEW_MODE_KEY = "discovery-view-mode";
const TRACKERS = [
  "udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce",
  "udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce",
  "udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce",
];

export function buildMagnet(torrent: TorrentMatch): string {
  const trackerString = TRACKERS.map((t) => `&tr=${t}`).join("");
  return `magnet:?xt=urn:btih:${torrent.infoHash}&dn=${encodeURIComponent(torrent.name)}${trackerString}`;
}

/** Converts the raw Rust TorrentResult shape to the unified TorrentMatch shape. */
function normalizeRustTorrent(r: TorrentResult): TorrentMatch {
  return {
    id: r.id,
    name: r.name,
    infoHash: r.info_hash,
    seeders: parseInt(r.seeders, 10) || 0,
    leechers: parseInt(r.leechers, 10) || 0,
    sizeBytes: parseInt(r.size, 10) || 0,
    category: r.category,
    quality: null,
    addedAt: r.added,
  };
}

function loadViewMode(): "grid" | "list" {
  if (typeof window === "undefined") return "grid";
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return stored === "list" ? "list" : "grid";
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  category: "all",
  genre: null,
  year: null,
  quality: null,
};

export interface TorrentDiscoveryState {
  feed: DiscoveryFeed | null;
  feedLoading: boolean;
  feedError: string | null;
  degraded: boolean;
  filters: DiscoveryFilters;
  setFilters: (filters: DiscoveryFilters) => void;
  filteredItems: DiscoveryItem[];
  page: number;
  loadMore: () => Promise<void>;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  searchResults: TorrentMatch[];
  searchLoading: boolean;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  activeQuery: string;
  handleDownload: (torrent: TorrentMatch) => Promise<void>;
  fetchTorrentsForItem: (item: DiscoveryItem) => Promise<TorrentMatch[]>;
  reset: () => void;
}

export function useTorrentDiscovery(): TorrentDiscoveryState {
  const { isOnline } = useApiConnectivity();

  const [feed, setFeed] = useState<DiscoveryFeed | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [filters, setFiltersState] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [viewMode, setViewModeState] = useState<"grid" | "list">(loadViewMode);
  const [searchResults, setSearchResults] = useState<TorrentMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");

  // Track whether the initial feed load has been attempted to avoid duplicate calls
  const initialLoadAttempted = useRef(false);

  const loadFeed = useCallback(
    async (targetPage: number, category: DiscoveryCategory, append: boolean) => {
      if (!isOnline) {
        setDegraded(true);
        setFeedLoading(false);
        return;
      }
      try {
        const result = await apiService.getDiscoveryFeed(targetPage, category);
        setFeed((prev) => {
          if (!append || !prev) return result;
          return {
            ...result,
            items: [...prev.items, ...result.items],
          };
        });
        setDegraded(result.partial);
        setFeedError(null);
      } catch (err) {
        if (err instanceof ExternalApiOfflineError || !isOnline) {
          setDegraded(true);
          setFeedError(null);
        } else {
          const msg = err instanceof Error ? err.message : "Erro ao carregar o feed";
          setFeedError(msg);
          setDegraded(true);
        }
      } finally {
        setFeedLoading(false);
      }
    },
    [isOnline],
  );

  // Initial load
  useEffect(() => {
    if (initialLoadAttempted.current) return;
    initialLoadAttempted.current = true;
    loadFeed(1, filters.category, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load when connectivity is restored after degraded state
  useEffect(() => {
    if (isOnline && degraded && !feed) {
      setFeedLoading(true);
      loadFeed(1, filters.category, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const setFilters = useCallback(
    (newFilters: DiscoveryFilters) => {
      setFiltersState(newFilters);
      // If category changed, reload from page 1
      if (newFilters.category !== filters.category) {
        setPage(1);
        setFeedLoading(true);
        setFeed(null);
        loadFeed(1, newFilters.category, false);
      }
    },
    [filters.category, loadFeed],
  );

  const setViewMode = useCallback((mode: "grid" | "list") => {
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!feed || page >= feed.totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadFeed(nextPage, filters.category, true);
  }, [feed, page, filters.category, loadFeed]);

  const filteredItems: DiscoveryItem[] = (() => {
    const items = feed?.items ?? [];
    return items.filter((item) => {
      if (filters.genre && !item.genres.some((g) => g.name === filters.genre)) return false;
      if (filters.year && item.year !== filters.year) return false;
      if (filters.quality && !item.torrents.some((t) => t.quality === filters.quality)) return false;
      return true;
    });
  })();

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setActiveQuery(trimmed);
      setSearchLoading(true);
      try {
        if (isOnline && !degraded) {
          const res = await apiService.searchTorrentsViaBackend(trimmed);
          setSearchResults(res.torrents);
        } else {
          // Fallback: Rust → apibay directly
          const raw = await tauriService.searchTorrents(trimmed);
          setSearchResults(raw.map(normalizeRustTorrent));
        }
      } catch {
        // If backend search failed mid-session, fall back to Rust
        try {
          const raw = await tauriService.searchTorrents(trimmed);
          setSearchResults(raw.map(normalizeRustTorrent));
        } catch (fallbackErr) {
          const msg =
            fallbackErr instanceof Error
              ? fallbackErr.message
              : "Erro ao buscar torrents";
          setSearchResults([]);
          setFeedError(msg);
        }
      } finally {
        setSearchLoading(false);
      }
    },
    [isOnline, degraded],
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setActiveQuery("");
  }, []);

  const handleDownload = useCallback(async (torrent: TorrentMatch) => {
    const magnet = buildMagnet(torrent);
    await tauriService.interceptTorrentLink(magnet);
  }, []);

  const fetchTorrentsForItem = useCallback(
    async (item: DiscoveryItem): Promise<TorrentMatch[]> => {
      if (!isOnline) return [];
      try {
        const res = await apiService.getTorrentsForMedia(
          item.title,
          item.year ?? undefined,
          item.mediaType,
        );
        return res.torrents;
      } catch {
        return [];
      }
    },
    [isOnline],
  );

  const reset = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(1);
    setFeed(null);
    setSearchResults([]);
    setActiveQuery("");
    setFeedLoading(true);
    loadFeed(1, "all", false);
  }, [loadFeed]);

  return {
    feed,
    feedLoading,
    feedError,
    degraded,
    filters,
    setFilters,
    filteredItems,
    page,
    loadMore,
    viewMode,
    setViewMode,
    searchResults,
    searchLoading,
    search,
    clearSearch,
    activeQuery,
    handleDownload,
    fetchTorrentsForItem,
    reset,
  };
}
