/**
 * Folder Scan Service
 * Handles scanning folders for media files and matching with Critix API
 */

import { tauriService } from "./tauri";
import { apiService } from "./api";
import { Movie, Series, MediaType, Episode, Season } from "@/types";

const MEDIA_EXTENSIONS = [".mkv", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"];

// Regex patterns for detecting series episodes
const EPISODE_PATTERNS = [
  /[Ss](\d{1,2})[Ee](\d{1,2})/, // S01E01, s01e01
  /[Ss](\d{1,2})[\.\-_ ]?[Ee](\d{1,2})/, // S01.E01, S01-E01, S01 E01
  /(\d{1,2})x(\d{1,2})/, // 1x01
  /[Ss]eason[\.\-_ ]?(\d{1,2})[\.\-_ ]+[Ee]pisode[\.\-_ ]?(\d{1,2})/i, // Season 1 Episode 1
  /[\-_ ](\d{2,3})(?:[\-_ \.]|$)/, // Anime style: "Series Name - 13", "Series Name 13"
  /[Ee]p[\.\-_ ]?(\d{1,3})/, // Ep.13, ep 13, Ep-13
  /[Ee]pisode[\.\-_ ]?(\d{1,3})/, // Episode 13, episode 13
];

interface EpisodeFile {
  filePath: string;
  fileName: string;
  seriesName: string;
  seasonNumber: number;
  episodeNumber: number;
}

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

export interface FolderPreview {
  path: string;
  name: string;
  fileCount: number;
  estimatedMovies: number;
  estimatedSeries: number;
}

class FolderScanService {
  /**
   * Preview folder contents before scanning
   * Returns file count and estimated media types
   */
  async previewFolder(folderPath: string): Promise<{
    fileCount: number;
    estimatedMovies: number;
    estimatedSeries: number;
  }> {
    try {
      const files = await this.scanFolderRecursive(folderPath);
      const mediaFiles = files.filter((file) => this.isMediaFile(file));

      const { episodeFiles, standaloneFiles } = this.categorizeFiles(mediaFiles, folderPath);
      const seriesGroups = this.groupEpisodesBySeries(episodeFiles);

      return {
        fileCount: mediaFiles.length,
        estimatedMovies: standaloneFiles.length,
        estimatedSeries: seriesGroups.size,
      };
    } catch (error) {
      console.error("Error previewing folder:", error);
      return {
        fileCount: 0,
        estimatedMovies: 0,
        estimatedSeries: 0,
      };
    }
  }

  /**
   * Scan a folder and match files with Critix API
   * @param existingMovies - Movies already in database to skip rescanning
   * @param existingSeries - Series already in database to skip rescanning
   */
  async scanAndMatchFolder(
    folderId: string,
    folderPath: string,
    onProgress?: (progress: ScanProgress) => void,
    existingMovies: Movie[] = [],
    existingSeries: Series[] = [],
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

      // Step 2: Filter out files that are already in the database (optimization)
      const existingFilePaths = new Set([
        ...existingMovies.map((m) => m.filePath),
        ...existingSeries.flatMap(
          (s) => s.seasons?.flatMap((season) => season.episodes?.map((ep) => ep.filePath) || []) || [],
        ),
      ]);

      const newMediaFiles = mediaFiles.filter((file) => !existingFilePaths.has(file));

      console.log(`📊 Scan optimization:`);
      console.log(`  - Total media files found: ${mediaFiles.length}`);
      console.log(`  - Already in database: ${mediaFiles.length - newMediaFiles.length}`);
      console.log(`  - New files to scan: ${newMediaFiles.length}`);

      // If no new files, return early with existing media
      if (newMediaFiles.length === 0) {
        console.log(`✅ No new files to scan, returning existing media`);
        onProgress?.({
          status: "complete",
          totalFiles: 0,
          processedFiles: 0,
          matchedMedia: existingMovies.length + existingSeries.length,
        });
        return {
          movies: [],
          series: [],
          unmatchedFiles: [],
          totalProcessed: 0,
        };
      }

      // Step 3: Separate episode files from standalone movies (only new files)
      const { episodeFiles, standaloneFiles } = this.categorizeFiles(newMediaFiles, folderPath);

      // Step 4: Group episode files by series
      const seriesGroups = this.groupEpisodesBySeries(episodeFiles);

      const totalToProcess = standaloneFiles.length + seriesGroups.size;

      onProgress?.({
        status: "matching",
        totalFiles: totalToProcess,
        processedFiles: 0,
        matchedMedia: 0,
      });

      let processed = 0;

      // Step 5: Process grouped series (one API call per series)
      for (const [seriesName, episodes] of seriesGroups) {
        onProgress?.({
          status: "matching",
          totalFiles: totalToProcess,
          processedFiles: processed,
          matchedMedia: result.movies.length + result.series.length,
          currentFile: seriesName,
        });

        try {
          const seriesInfo = await this.matchSeriesWithApi(seriesName, episodes, folderId);

          if (seriesInfo && !seriesInfo.isSerieResult) {
            result.movies.push(seriesInfo as Movie);
          }

          if (seriesInfo && seriesInfo.isSerieResult) {
            result.series.push(seriesInfo as Series);
          } else if (seriesInfo?.isSerieResult) {
            // Add all episode files as unmatched
            episodes.forEach((ep) => result.unmatchedFiles.push(ep.filePath));
          }
        } catch (error) {
          console.error(`Failed to match series: ${seriesName}`, error);
          episodes.forEach((ep) => result.unmatchedFiles.push(ep.filePath));
        }

        processed++;
        result.totalProcessed++;
      }

      // Step 6: Process standalone files (likely movies)
      for (const file of standaloneFiles) {
        const fileName = this.extractFileName(file);

        onProgress?.({
          status: "matching",
          totalFiles: totalToProcess,
          processedFiles: processed,
          matchedMedia: result.movies.length + result.series.length,
          currentFile: fileName,
        });

        const notInclude = ["promo", "Trailer"];
        if (
          !fileName.toLowerCase().includes(notInclude[0].toLowerCase()) &&
          !fileName.toLowerCase().includes(notInclude[1].toLowerCase())
        ) {
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

        processed++;
        result.totalProcessed++;
      }

      onProgress?.({
        status: "complete",
        totalFiles: totalToProcess,
        processedFiles: totalToProcess,
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
   * Categorize files into episode files and standalone files
   */
  private categorizeFiles(
    files: string[],
    baseFolderPath: string,
  ): { episodeFiles: EpisodeFile[]; standaloneFiles: string[] } {
    const episodeFiles: EpisodeFile[] = [];
    const standaloneFiles: string[] = [];

    for (const file of files) {
      const fileName = this.extractFileName(file);
      const episodeInfo = this.parseEpisodeInfo(fileName, file, baseFolderPath);

      if (episodeInfo) {
        episodeFiles.push(episodeInfo);
      } else {
        standaloneFiles.push(file);
      }
    }

    return { episodeFiles, standaloneFiles };
  }

  /**
   * Parse episode information from filename
   */
  private parseEpisodeInfo(fileName: string, filePath: string, baseFolderPath: string): EpisodeFile | null {
    for (const pattern of EPISODE_PATTERNS) {
      const match = fileName.match(pattern);

      if (match) {
        const seasonNumber = parseInt(match[1], 10);
        const episodeNumber = parseInt(match[2], 10);

        // Extract series name (everything before the episode pattern)
        let seriesName = fileName
          .substring(0, match.index)
          .replace(/[\.\-_]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // If series name is empty or too short, extract from folder name
        if (!seriesName || seriesName.length < 2) {
          seriesName = this.extractSeriesNameFromPath(filePath, baseFolderPath);
          console.log(`📁 Using folder name for series: "${seriesName}"`);
        }

        if (seriesName) {
          return {
            filePath,
            fileName,
            seriesName,
            seasonNumber,
            episodeNumber,
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract series name from folder path
   * Example: "C:/Series/Dexter - The Pirate Filmes/S01/episode.mkv" -> "Dexter"
   */
  private extractSeriesNameFromPath(filePath: string, baseFolderPath: string): string {
    // Get relative path
    const relativePath = filePath.replace(baseFolderPath, "").replace(/^[\\\/]+/, "");
    const pathSegments = relativePath.split(/[\\\/]/);

    // First segment after base folder is usually the series folder
    const seriesFolderName = pathSegments[0] || "";

    // Clean up folder name
    return seriesFolderName
      .replace(/The Pirate Filmes?/gi, "")
      .replace(/RARBG|YTS|EZTV|1337x/gi, "")
      .replace(/Season\s*\d+/gi, "")
      .replace(/S\d{2}/gi, "")
      .replace(/[\[\](){}]/g, "")
      .replace(/\d{4}$/g, "") // Remove year at end
      .replace(/[-_.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Group episode files by series name
   */
  private groupEpisodesBySeries(episodeFiles: EpisodeFile[]): Map<string, EpisodeFile[]> {
    const groups = new Map<string, EpisodeFile[]>();

    for (const episode of episodeFiles) {
      const normalizedName = episode.seriesName.toLowerCase();

      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }

      groups.get(normalizedName)!.push(episode);
    }

    return groups;
  }

  /**
   * Match series with API and create Series object with local episodes
   */
  private async matchSeriesWithApi(
    seriesName: string,
    episodes: EpisodeFile[],
    folderId: string,
  ): Promise<(Series & { isSerieResult: boolean }) | (Movie & { isSerieResult: boolean }) | null> {
    try {
      const cleanQuery = this.cleanMediaName(seriesName);
      console.log(`🎬 Searching series: "${cleanQuery}" with ${episodes.length} local episodes`);

      const searchResults: any = await apiService.searchMediaByTitle(cleanQuery);

      if (!searchResults) {
        console.log(`No results found for series: ${cleanQuery}`);
        return null;
      }

      // Prefer TV results for series
      const appType = searchResults.mediaType === "movie" ? "MOVIE" : "SERIES";

      if (appType === "MOVIE") {
        console.log(`⚠️ API returned movie for "${seriesName}", return for movie`);
        return { ...(searchResults as Movie), isSerieResult: false };
      }

      console.log(`✅ Series matched: ${seriesName} -> ${searchResults.details?.name || searchResults.details?.title}`);

      // Transform to Series with local episode info
      const series = this.transformToSeriesWithEpisodes(searchResults.details, episodes, folderId);

      return { ...series, isSerieResult: true };
    } catch (error) {
      console.error(`Failed to match series with API: ${seriesName}`, error);
      return null;
    }
  }

  /**
   * Transform API response to Series with local episodes mapped
   */
  private transformToSeriesWithEpisodes(apiData: any, localEpisodes: EpisodeFile[], folderId: string): Series {
    // Validate that we have an ID
    if (!apiData.id) {
      console.error("❌ API data missing ID:", apiData);
      throw new Error("Series API data is missing required ID field");
    }

    // Validate first_air_date for year
    const year = parseInt(apiData.first_air_date?.split("-")[0] || "0");
    if (!year || year === 0) {
      console.warn("⚠️ Series has invalid year, using current year:", apiData.name);
    }

    // Group local episodes by season
    const episodesBySeason = new Map<number, EpisodeFile[]>();

    for (const ep of localEpisodes) {
      if (!episodesBySeason.has(ep.seasonNumber)) {
        episodesBySeason.set(ep.seasonNumber, []);
      }
      episodesBySeason.get(ep.seasonNumber)!.push(ep);
    }

    // Build seasons array with available episodes
    const seasons: Season[] = (apiData.seasons || []).map((apiSeason: any) => {
      const localSeasonEpisodes = episodesBySeason.get(apiSeason.season_number) || [];
      const localEpisodeNumbers = new Set(localSeasonEpisodes.map((e) => e.episodeNumber));

      const episodes: Episode[] = localSeasonEpisodes.map((localEp) => ({
        id: `${apiData.id}-s${localEp.seasonNumber}e${localEp.episodeNumber}`,
        episodeNumber: localEp.episodeNumber,
        seasonNumber: localEp.seasonNumber,
        title: `Episódio ${localEp.episodeNumber}`,
        filePath: localEp.filePath,
        available: true,
      }));

      return {
        id: `${apiData.id}-s${apiSeason.season_number}`,
        seasonNumber: apiSeason.season_number,
        name: apiSeason.name || `Temporada ${apiSeason.season_number}`,
        overview: apiSeason.overview,
        poster: apiSeason.poster_path ? `https://image.tmdb.org/t/p/w500${apiSeason.poster_path}` : undefined,
        episodeCount: apiSeason.episode_count || 0,
        episodes: episodes.sort((a, b) => a.episode_number - b.episode_number),
        available: localSeasonEpisodes.length > 0,
        downloadedEpisodes: localSeasonEpisodes.length,
      };
    });

    // Calculate total available episodes
    const totalLocalEpisodes = localEpisodes.length;

    // Get the first episode file path as the series folder path
    const folderPath =
      localEpisodes.length > 0
        ? localEpisodes[0].filePath.substring(
            0,
            localEpisodes[0].filePath.lastIndexOf("/") !== -1
              ? localEpisodes[0].filePath.lastIndexOf("/")
              : localEpisodes[0].filePath.lastIndexOf("\\"),
          )
        : "";

    // Extract genres from TMDB data
    const genres = apiData.genres?.map((g: any) => g.name) || [];

    // Extract extended TMDB fields for series
    const imdbId = apiData.imdb_id || undefined;
    const tagline = apiData.tagline || undefined;
    const voteCount = apiData.vote_count || undefined;
    const popularity = apiData.popularity || undefined;

    // Extract networks and production companies
    const networks = apiData.networks?.map((n: any) => n.name) || [];
    const productionCompanies = apiData.production_companies?.map((p: any) => p.name) || [];

    // Extract images
    const images: string[] = [];
    if (apiData.backdrop_path) images.push(`https://image.tmdb.org/t/p/original${apiData.backdrop_path}`);
    if (apiData.poster_path) images.push(`https://image.tmdb.org/t/p/w500${apiData.poster_path}`);

    // Extract videos
    const videos =
      apiData.videos?.results?.map((v: any) => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official,
      })) || [];

    // Extract cast and crew
    const cast =
      apiData.credits?.cast?.slice(0, 20).map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
        order: c.order,
      })) || [];

    const crew =
      apiData.credits?.crew
        ?.filter((c: any) => c.job === "Director" || c.job === "Producer" || c.job === "Writer")
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          job: c.job,
          department: c.department,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
        })) || [];

    return {
      id: apiData.id.toString(),
      title: apiData.name || apiData.title || "Unknown",
      originalTitle: apiData.original_name || apiData.original_title,
      overview: apiData.overview,
      poster: apiData.poster_path ? `https://image.tmdb.org/t/p/w500${apiData.poster_path}` : undefined,
      backdrop: apiData.backdrop_path ? `https://image.tmdb.org/t/p/original${apiData.backdrop_path}` : undefined,
      rating: apiData.vote_average,
      year: year || new Date().getFullYear(),
      firstAirDate: apiData.first_air_date,
      lastAirDate: apiData.last_air_date,
      status: "MATCHED",
      type: "SERIES",
      folderId,
      filePath: folderPath,
      numberOfSeasons: apiData.number_of_seasons || seasons.length,
      numberOfEpisodes: apiData.number_of_episodes || 0,
      seasons: seasons.filter((s) => s.seasonNumber > 0),
      trailer: apiData.videos?.results?.[0]?.key
        ? `https://www.youtube.com/watch?v=${apiData.videos.results[0].key}`
        : undefined,
      genres,
      imdbId,
      tagline,
      voteCount,
      popularity,
      networks,
      productionCompanies,
      images,
      videos,
      cast,
      crew,
    } as Series;
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
    // Validate that we have an ID
    if (!apiData.id) {
      console.error("❌ API data missing ID:", apiData);
      throw new Error(`${type} API data is missing required ID field`);
    }

    // Extract genres from TMDB data
    const genres = apiData.genres?.map((g: any) => g.name) || [];

    // Extract extended TMDB fields
    const imdbId = apiData.imdb_id || undefined;
    const tagline = apiData.tagline || undefined;
    const budget = apiData.budget || undefined;
    const revenue = apiData.revenue || undefined;
    const voteCount = apiData.vote_count || undefined;
    const popularity = apiData.popularity || undefined;

    // Extract images (backdrops and posters)
    const images: string[] = [];
    if (apiData.backdrop_path) images.push(`https://image.tmdb.org/t/p/original${apiData.backdrop_path}`);
    if (apiData.poster_path) images.push(`https://image.tmdb.org/t/p/w500${apiData.poster_path}`);

    // Extract videos
    const videos =
      apiData.videos?.results?.map((v: any) => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official,
      })) || [];

    // Extract cast and crew
    const cast =
      apiData.credits?.cast?.slice(0, 20).map((c: any) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
        order: c.order,
      })) || [];

    const crew =
      apiData.credits?.crew
        ?.filter((c: any) => c.job === "Director" || c.job === "Producer" || c.job === "Writer")
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          job: c.job,
          department: c.department,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
        })) || [];

    const baseInfo = {
      id: apiData.id.toString(),
      title: apiData.title || apiData.name || "Unknown",
      originalTitle: apiData.original_title || apiData.original_name,
      overview: apiData.overview,
      poster: apiData.poster_path ? `https://image.tmdb.org/t/p/w500${apiData.poster_path}` : undefined,
      backdrop: apiData.backdrop_path ? `https://image.tmdb.org/t/p/original${apiData.backdrop_path}` : undefined,
      rating: apiData.vote_average,
      year: parseInt(apiData.release_date?.split("-")[0] || apiData.first_air_date?.split("-")[0] || "0", 10),
      releaseDate: apiData.release_date || apiData.first_air_date,
      status: "MATCHED" as const,
      type,
      folderId,
      genres,
      imdbId,
      tagline,
      budget,
      revenue,
      voteCount,
      popularity,
      images,
      videos,
      cast,
      crew,
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
