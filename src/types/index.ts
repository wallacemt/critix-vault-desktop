/**
 * Core type definitions for Critix Vault
 */

// Media Types
export type MediaType = "MOVIE" | "SERIES" | "ANIME";
export type MediaStatus = "UNMATCHED" | "MATCHED" | "ERROR";

// Base Media Interface
export interface Media {
  id: string;
  type: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  status: MediaStatus;
  filePath: string;
  folderId: string;
  isWatched?: boolean; // Loaded from watch history
}

// Movie Interface
export interface Movie extends Media {
  type: "MOVIE";
  duration?: number;
  trailer?: string;
  releaseDate?: string;

  // TMDB Extended fields
  genres?: string[]; // Array of genre names
  imdbId?: string;
  tagline?: string;
  budget?: number;
  revenue?: number;
  voteCount?: number;
  popularity?: number;
  images?: string[]; // Array of image URLs
  videos?: TMDBVideo[]; // Array of video objects
  cast?: TMDBCast[]; // Array of cast members
  crew?: TMDBCrew[]; // Array of crew members
}

// TMDB Video Interface
export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string; // YouTube, Vimeo, etc.
  type: string; // Trailer, Teaser, Clip, etc.
  official: boolean;
}

// TMDB Cast Interface
export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profilePath?: string;
  order: number;
}

// TMDB Crew Interface
export interface TMDBCrew {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath?: string;
}

// Episode Interface
export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview?: string;
  stillPath?: string;
  airDate?: string;
  duration?: number;
  filePath?: string;
  available: boolean;
}

// Season Interface
export interface Season {
  id: string;
  seasonNumber: number;
  name: string;
  overview?: string;
  poster?: string;
  episodeCount: number;
  episodes: Episode[];
  available: boolean;
  downloadedEpisodes: number;
}

// Series Interface
export interface Series extends Media {
  type: "SERIES" | "ANIME";

  seasons: Season[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  trailer?: string;
  firstAirDate?: string;
  lastAirDate?: string;

  // TMDB Extended fields
  genres?: string[]; // Array of genre names
  imdbId?: string;
  tagline?: string;
  voteCount?: number;
  popularity?: number;
  images?: string[]; // Array of image URLs
  videos?: TMDBVideo[]; // Array of video objects
  cast?: TMDBCast[]; // Array of cast members
  crew?: TMDBCrew[]; // Array of crew members
  networks?: string[]; // Array of network names
  productionCompanies?: string[]; // Array of production companies
}

// Folder Interface
export interface Folder {
  id: string;
  path: string;
  name: string;
  mediaCount: number;
  addedAt: string;
  lastScanned?: string;
}

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

export interface ScanResult {
  folderId: string;
  movies: Movie[];
  series: Series[];
  unmatched: UnmatchedFile[];
  totalFiles: number;
  processedFiles: number;
}

export interface UnmatchedFile {
  filePath: string;
  fileName: string;
  reason: string;
}

// UI State Types
export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
