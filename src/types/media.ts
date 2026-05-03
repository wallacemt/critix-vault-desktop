import { GenreDTO } from "./api";

// Media Types
export type MediaType = "MOVIE" | "SERIES" | "ANIME";
export type MediaStatus = "UNMATCHED" | "MATCHED" | "ERROR";

// Base Media Interface
export interface Media {
  id: string;
  type: MediaType;
  title: string;
  originalTitle?: string;
  genres?: GenreDTO[];
  year?: number;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  status: MediaStatus;
  filePath: string;
  folderId: string;
  duration?: number;
  isWatched?: boolean; // Loaded from watch history
  createdAt?: string;
  updatedAt?: string;
  lastWatchedAt?: string;
}
