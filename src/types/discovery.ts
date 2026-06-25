export interface TorrentMatch {
  id: string;
  name: string;
  infoHash: string;
  seeders: number;
  leechers: number;
  sizeBytes: number;
  category: string;
  quality: string | null;
  addedAt: string;
}

export interface DiscoveryItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  voteAverage: number | null;
  genres: Array<{ id: number; name: string | null }>;
  source: "trending" | "popular" | "apachetorrent";
  torrents: TorrentMatch[];
  trailerKey: string | null;
}

export interface DiscoveryFeed {
  items: DiscoveryItem[];
  page: number;
  totalPages: number;
  generatedAt: string;
  partial: boolean;
}

export type DiscoveryCategory = "all" | "movie" | "tv";

export interface DiscoveryFilters {
  category: DiscoveryCategory;
  genre: string | null;
  year: number | null;
  quality: string | null;
}
