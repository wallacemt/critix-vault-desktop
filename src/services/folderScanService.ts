/**
 * Folder Scan Service
 * Handles scanning folders for media files and matching with Critix API
 */

import { tauriService } from "./tauri";
import { apiService } from "./api";
import { Movie, Series, MediaType } from "@/types";

const MEDIA_EXTENSIONS = [".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"];

export interface ScanProgress {
  status: "scanning" | "matching" | "complete" | "error";
  totalFiles: number;
  processedFiles: number;
  matchedMedia: number;
  currentFile?: string;
  error?: string;
}

export interface ScanResult {
  movies: Movie[];
  series: Series[];
  unmatchedFiles: string[];
  totalProcessed: number;
}

class FolderScanService {
  /**
   * Scan a folder and match files with Critix API
   */
  async scanAndMatchFolder(
    folderId: string,
    folderPath: string,
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<ScanResult> {
    const result: ScanResult = {
      movies: [],
      series: [],
      unmatchedFiles: [],
      totalProcessed: 0,
    };

    try {
      // Step 1: Scan folder for media files
      onProgress?.({
        status: "scanning",
        totalFiles: 0,
        processedFiles: 0,
        matchedMedia: 0,
        currentFile: folderPath,
      });

      const files = await this.scanFolderRecursive(folderPath);
      const mediaFiles = files.filter((file) => this.isMediaFile(file));

      onProgress?.({
        status: "matching",
        totalFiles: mediaFiles.length,
        processedFiles: 0,
        matchedMedia: 0,
      });

      // Step 2: Match each file with Critix API
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const fileName = this.extractFileName(file);

        onProgress?.({
          status: "matching",
          totalFiles: mediaFiles.length,
          processedFiles: i,
          matchedMedia: result.movies.length + result.series.length,
          currentFile: fileName,
        });
        const notInclude = ["promo", "Trailer"];
        if (!fileName.includes(notInclude[0]) && !fileName.includes(notInclude[1])) {
          try {
            const mediaInfo = await this.matchWithApi(fileName, file, folderId);

            if (mediaInfo) {
              if (mediaInfo.type === "MOVIE") {
                result.movies.push(mediaInfo as Movie);
              } else if (mediaInfo.type === "SERIES") {
                result.series.push(mediaInfo as Series);
              }
            } else {
              result.unmatchedFiles.push(file);
            }
          } catch (error) {
            console.error(`Failed to match file: ${fileName}`, error);
            result.unmatchedFiles.push(file);
          }
        }

        result.totalProcessed++;
      }

      onProgress?.({
        status: "complete",
        totalFiles: mediaFiles.length,
        processedFiles: mediaFiles.length,
        matchedMedia: result.movies.length + result.series.length,
      });

      return result;
    } catch (error) {
      onProgress?.({
        status: "error",
        totalFiles: 0,
        processedFiles: 0,
        matchedMedia: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Recursively scan folder for all files
   */
  private async scanFolderRecursive(path: string): Promise<string[]> {
    // This will be implemented in Rust for better performance
    // For now, we'll use the existing scan_folder command
    try {
      const files = await tauriService.scanFolder(path);
      return files;
    } catch (error) {
      console.error("Failed to scan folder:", error);
      return [];
    }
  }

  /**
   * Check if file is a media file
   */
  private isMediaFile(filePath: string): boolean {
    return MEDIA_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext));
  }

  /**
   * Extract clean file name for matching
   */
  private extractFileName(filePath: string): string {
    // Get filename without path
    const parts = filePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1];

    // Remove extension
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");

    // Clean up common patterns
    return nameWithoutExt
      .replace(/[\[\(].*?[\]\)]/g, "") // Remove [720p], (2020), etc.
      .replace(/\d{3,4}p/gi, "") // Remove 1080p, 720p, etc.
      .replace(/\b(bluray|brrip|webrip|web-dl|hdtv|xvid|x264|x265|hevc)\b/gi, "") // Remove quality tags
      .replace(/[._-]/g, " ") // Replace separators with spaces
      .replace(/\s+/g, " ") // Remove multiple spaces
      .trim();
  }

  /**
   * Match file with Critix API using the correct endpoint
   */
  private async matchWithApi(fileName: string, filePath: string, folderId: string): Promise<Movie | Series | null> {
    try {
      // Clean the filename before searching
      const cleanQuery = this.cleanMediaName(fileName);

      console.log(`Searching for: "${cleanQuery}" (from: ${fileName})`);

      // Search for the media using the correct endpoint
      const searchResults: any = await apiService.searchMediaByTitle(cleanQuery);

      if (!searchResults) {
        console.log(`No results found for: ${cleanQuery}`);
        return null;
      }

      // Determine type from media_type field (movie or tv)
      const appType = searchResults.mediaType === "movie" ? "MOVIE" : "SERIES";

      console.log(`✅ Dados Encontrados para ${fileName}, ${searchResults.mediaType}`);

      // Transform API response to our internal format
      const mediaInfo = this.transformApiResponse(searchResults.details, appType, filePath, folderId);

      return mediaInfo;
    } catch (error) {
      console.error(`Failed to match with API: ${fileName}`, error);
      return null;
    }
  }

  /**
   * Clean media name for better API matching
   */
  private cleanMediaName(fileName: string): string {
    return fileName
      .replace(/[\.\-_]/g, " ") // Replace separators with spaces
      .replace(/\s+/g, " ") // Remove multiple spaces
      .trim();
  }

  /**
   * Transform API response to our internal Movie/Series format
   */
  private transformApiResponse(
    apiData: any,
    type: "MOVIE" | "SERIES",
    filePath: string,
    folderId: string,
  ): Movie | Series {
    const baseInfo = {
      id: apiData.id?.toString() || "",
      title: apiData.title || apiData.name || "Unknown",
      originalTitle: apiData.original_title || apiData.original_name,
      overview: apiData.overview,
      poster: apiData.poster_path ? `https://image.tmdb.org/t/p/w500${apiData.poster_path}` : undefined,
      backdrop: apiData.backdrop_path ? `https://image.tmdb.org/t/p/original${apiData.backdrop_path}` : undefined,
      rating: apiData.vote_average,
      year: apiData.release_date?.split("-")[0] || apiData.first_air_date?.split("-")[0],
      releaseDate: apiData.release_date || apiData.first_air_date,
      status: "MATCHED" as const,
      type,
      folderId,
    };

    if (type === "MOVIE") {
      return {
        ...baseInfo,
        duration: apiData.runtime,
        filePath,
        trailer: apiData.videos?.results?.[0]?.key
          ? `https://www.youtube.com/watch?v=${apiData.videos.results[0].key}`
          : undefined,
      } as Movie;
    } else {
      return {
        ...baseInfo,
        numberOfSeasons: apiData.number_of_seasons || 0,
        numberOfEpisodes: apiData.number_of_episodes || 0,
        filePath: "",
        folderPath: filePath,
        duration: apiData.episode_run_time?.[0],
        seasons: apiData.seasons?.map((season: any) => ({
          seasonNumber: season.season_number,
          episodeCount: season.episode_count,
          name: season.name,
          overview: season.overview,
          poster: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : undefined,
          episodes: [],
        })),
        trailer: apiData.videos?.results?.[0]?.key
          ? `https://www.youtube.com/watch?v=${apiData.videos.results[0].key}`
          : undefined,
      } as Series;
    }
  }
}

export const folderScanService = new FolderScanService();
