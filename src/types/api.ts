import { EpisodeInfo } from "./serie";

// API Response Types
export interface ApiStatus {
  online: boolean;
  version?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}

export interface GenreDTO {
  id: number;
  name: string;
}

// Re-matching result
export interface RematchResult {
  success: boolean;
  matched: number;
  unmatched: number;
  episodes: EpisodeInfo[];
  errors?: string[];
}

export interface MediaSearchResult {
  id: string;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  original_name?: string;

  original_title?: string;
}
