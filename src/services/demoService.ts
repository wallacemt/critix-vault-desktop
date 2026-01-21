/**
 * Demo Data Service
 * Converts TMDB trending data to app format for demo mode
 */

import { getTrendingMedia } from "./mediaService";
import { Media, Movie, Series } from "@/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

/**
 * Convert TMDB media to app Movie format
 */
function convertToMovie(tmdbMedia: any): Movie {
  return {
    id: `demo-movie-${tmdbMedia.id}`,
    type: "MOVIE",
    title: tmdbMedia.title || tmdbMedia.original_title || "Unknown",
    originalTitle: tmdbMedia.original_title,
    year: tmdbMedia.release_date ? new Date(tmdbMedia.release_date).getFullYear() : undefined,
    poster: tmdbMedia.poster_path ? `${TMDB_IMAGE_BASE}${tmdbMedia.poster_path}` : undefined,
    backdrop: tmdbMedia.backdrop_path ? `${TMDB_IMAGE_BASE}${tmdbMedia.backdrop_path}` : undefined,
    overview: tmdbMedia.overview,
    rating: tmdbMedia.vote_average,
    status: "MATCHED",
    filePath: "/demo/path/to/movie.mp4",
    folderId: "demo-folder",
    releaseDate: tmdbMedia.release_date,
  };
}

/**
 * Convert TMDB media to app Series format
 */
function convertToSeries(tmdbMedia: any): Series {
  return {
    id: `demo-series-${tmdbMedia.id}`,
    type: "SERIES",
    title: tmdbMedia.name || tmdbMedia.original_name || "Unknown",
    originalTitle: tmdbMedia.original_name,
    year: tmdbMedia.first_air_date ? new Date(tmdbMedia.first_air_date).getFullYear() : undefined,
    poster: tmdbMedia.poster_path ? `${TMDB_IMAGE_BASE}${tmdbMedia.poster_path}` : undefined,
    backdrop: tmdbMedia.backdrop_path ? `${TMDB_IMAGE_BASE}${tmdbMedia.backdrop_path}` : undefined,
    overview: tmdbMedia.overview,
    rating: tmdbMedia.vote_average,
    status: "MATCHED",
    filePath: "/demo/path/to/series/",
    folderId: "demo-folder",
    seasons: [],
    numberOfSeasons: 1,
    numberOfEpisodes: 10,
    firstAirDate: tmdbMedia.first_air_date,
  };
}

/**
 * Load demo data from TMDB trending
 */
export async function loadDemoData(): Promise<{ movies: Movie[]; series: Series[] }> {
  try {
    const trendingMedia = await getTrendingMedia();

    const movies: Movie[] = [];
    const series: Series[] = [];

    trendingMedia.forEach((media) => {
      if (media.media_type === "movie") {
        movies.push(convertToMovie(media));
      } else if (media.media_type === "tv") {
        series.push(convertToSeries(media));
      }
    });

    return { movies, series };
  } catch (error) {
    console.error("Failed to load demo data:", error);
    return { movies: [], series: [] };
  }
}

/**
 * Create a demo folder
 */
export function createDemoFolder() {
  return {
    id: "demo-folder",
    path: "/demo/trending",
    name: "🎬 Demo - Trending Content",
    mediaCount: 0,
    addedAt: new Date().toISOString(),
    lastScanned: new Date().toISOString(),
  };
}
