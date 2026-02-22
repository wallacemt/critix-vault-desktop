import type { TMDBImages, TMDBMedia, TMDBTrendingPostersResponse } from "@/types/tmdb";
import { apiService } from "./api";
import { EpisodeFileBinding, EpisodeInfo, SeasonDetailsDTO, SeriesDetailsDTO } from "@/types/serie";
import { RematchResult } from "@/types/api";

const getTrendingMedia = async (): Promise<TMDBMedia[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15 segundos de timeout

    const res = await apiService.request(`/media/v1/trending`, {
      cache: "default",
      signal: controller.signal,
      next: { revalidate: 3600 }, // Revalidar a cada hora
    });

    clearTimeout(timeoutId);

    return res as TMDBMedia[];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Timeout ao buscar trending media");
    } else {
      console.error(`Erro ao consultar trending: ${error}`);
    }
    // Retornar array vazio em caso de erro
    return [];
  }
};
const getTrendingRandomPosters = async (): Promise<TMDBTrendingPostersResponse[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15 segundos de timeout

    const res = await apiService.request(`/media/v1/trending/posters/random`, {
      cache: "default",
      signal: controller.signal,
      next: { revalidate: 3600 }, // Revalidar a cada hora
    });

    clearTimeout(timeoutId);

    return res as TMDBTrendingPostersResponse[];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Timeout ao buscar trending posters");
    } else {
      console.error(`Erro ao consultar trending posters: ${error}`);
    }
    // Retornar array vazio em caso de erro
    return [];
  }
};

export { getTrendingMedia, getTrendingRandomPosters };

/**
 * Parse episode filename to extract season and episode numbers
 * Supports patterns: S01E01, S1E1, 1x01, 1x1, Episode 01, Ep 01
 */
export function parseEpisodeFilename(filename: string): EpisodeInfo | null {
  const patterns = [
    // S01E01, S1E1
    /[Ss](\d{1,2})[Ee](\d{1,2})/,
    // 1x01, 1x1
    /(\d{1,2})[xX](\d{1,2})/,
    // Episode 01, Ep 01
    /[Ee]pisode\s*(\d{1,2})/i,
    /[Ee]p\s*(\d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      // For Episode/Ep patterns, assume season 1
      if (pattern.source.includes("episode") || pattern.source.includes("p\\s")) {
        return {
          seasonNumber: 1,
          episodeNumber: parseInt(match[1], 10),
          originalFilename: filename,
          filePath: "",
        };
      }
      return {
        seasonNumber: parseInt(match[1], 10),
        episodeNumber: parseInt(match[2], 10),
        originalFilename: filename,
        filePath: "",
      };
    }
  }

  return null;
}

/**
 * Fetch series details from API
 */
export async function fetchSeriesDetails(seriesId: string): Promise<SeriesDetailsDTO | null> {
  try {
    const response = await apiService.request(`/media/v1/tv/${seriesId}`);
    return response as SeriesDetailsDTO;
  } catch (error) {
    console.error(`Error fetching series details: ${error}`);
    return null;
  }
}

/**
 * Fetch season details from API
 */
export async function fetchSeasonDetails(seriesId: string, seasonNumber: number): Promise<SeasonDetailsDTO | null> {
  try {
    const response = await apiService.request(`/media/v1/tv/season/${seriesId}/${seasonNumber}`);
    return response as SeasonDetailsDTO;
  } catch (error) {
    console.error(`Error fetching season details: ${error}`);
    return null;
  }
}
/**
 * Fetch season details from API
 */
export async function fetchMediaImages(mediaId: string, mediaType: string): Promise<TMDBImages> {
  try {
    const response = await apiService.request(`/media/v1/${mediaType}/${mediaId}/images`);
    return response as TMDBImages;
  } catch (error) {
    console.error(`Error fetching season details: ${error}`);
    return {} as TMDBImages;
  }
}

/**
 * Re-match series episodes after series change
 */
export async function rematchSeriesEpisodes(
  oldSeriesId: string,
  newSeriesId: string,
  localFiles: string[],
): Promise<RematchResult> {
  try {
    // 1. Parse local files to extract episode info
    const parsedEpisodes: EpisodeInfo[] = [];
    for (const file of localFiles) {
      const episodeInfo = parseEpisodeFilename(file);
      if (episodeInfo) {
        episodeInfo.filePath = file;
        parsedEpisodes.push(episodeInfo);
      }
    }

    if (parsedEpisodes.length === 0) {
      return {
        success: false,
        matched: 0,
        unmatched: localFiles.length,
        episodes: [],
        errors: ["No episodes could be parsed from filenames"],
      };
    }

    // 2. Fetch new series details
    const seriesDetails = await fetchSeriesDetails(newSeriesId);
    if (!seriesDetails) {
      return {
        success: false,
        matched: 0,
        unmatched: parsedEpisodes.length,
        episodes: parsedEpisodes,
        errors: ["Failed to fetch series details"],
      };
    }

    // 3. Fetch season details for each unique season
    const uniqueSeasons = [...new Set(parsedEpisodes.map((ep) => ep.seasonNumber))];
    const seasonDetailsMap = new Map<number, SeasonDetailsDTO>();

    for (const seasonNum of uniqueSeasons) {
      const seasonDetails = await fetchSeasonDetails(newSeriesId, seasonNum);
      if (seasonDetails) {
        seasonDetailsMap.set(seasonNum, seasonDetails);
      }
    }

    // 4. Match episodes with API data
    let matched = 0;
    let unmatched = 0;

    for (const episode of parsedEpisodes) {
      const seasonDetails = seasonDetailsMap.get(episode.seasonNumber);
      if (seasonDetails) {
        const episodeExists = seasonDetails.episodes.some((ep) => ep.episode_number === episode.episodeNumber);
        if (episodeExists) {
          matched++;
        } else {
          unmatched++;
        }
      } else {
        unmatched++;
      }
    }

    return {
      success: true,
      matched,
      unmatched,
      episodes: parsedEpisodes,
    };
  } catch (error) {
    console.error(`Error re-matching episodes: ${error}`);
    return {
      success: false,
      matched: 0,
      unmatched: localFiles.length,
      episodes: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Create episode file bindings
 */
export async function createEpisodeBindings(seriesId: string, localFiles: string[]): Promise<EpisodeFileBinding[]> {
  const bindings: EpisodeFileBinding[] = [];
  const parsedEpisodes = localFiles
    .map((file) => {
      const info = parseEpisodeFilename(file);
      if (info) {
        info.filePath = file;
      }
      return info;
    })
    .filter((ep): ep is EpisodeInfo => ep !== null);

  // Fetch series details to get episode data
  const seriesDetails = await fetchSeriesDetails(seriesId);
  if (!seriesDetails) {
    return bindings;
  }

  for (const episode of parsedEpisodes) {
    // Fetch season details
    const seasonDetails = await fetchSeasonDetails(seriesId, episode.seasonNumber);
    if (seasonDetails) {
      const episodeData = seasonDetails.episodes.find((ep) => ep.episode_number === episode.episodeNumber);

      bindings.push({
        episodeId: episodeData ? `${episodeData.id}` : `${episode.seasonNumber}-${episode.episodeNumber}`,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        filePath: episode.filePath,
        matched: !!episodeData,
        episodeTitle: episodeData?.name,
      });
    } else {
      bindings.push({
        episodeId: `${episode.seasonNumber}-${episode.episodeNumber}`,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        filePath: episode.filePath,
        matched: false,
      });
    }
  }

  return bindings;
}
