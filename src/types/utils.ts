import { Movie } from "./movie";
import { Series } from "./serie";

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

export type AppTabs = "all" | "movies" | "series" | "watched";
