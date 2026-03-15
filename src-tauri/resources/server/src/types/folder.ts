

// Folder Interface
export interface Folder {
  id: string;
  path: string;
  name: string;
  mediaCount: number;
  addedAt: string;
  lastScanned?: string;
}
export interface FolderPreview {
  path: string;
  name: string;
  fileCount: number;
  estimatedMovies: number;
  estimatedSeries: number;
}