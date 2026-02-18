/**
 * API DTOs for Backend Communication
 * These types match the backend responses
 */


// Season Details Response
export interface SeasonDetailsDTO {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  episodes: EpisodeDTO[];
  air_date: string;
}

// Episode Response
export interface EpisodeDTO  {
  id: string;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string;
  air_date: string;
  runtime: number;
  vote_average: number;
}

// Series Details Response
export interface SeriesDetailsDTO {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  vote_average: number;
  status: string;
  type: string;
  seasons: SeasonSummaryDTO[];
}

// Season Summary (from series details)
export interface SeasonSummaryDTO {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  episode_count: number;
  air_date: string;
}

// Movie Details Response
export interface MovieDetailsDTO {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  genres: GenreDTO[];
}

export interface GenreDTO {
  id: number;
  name: string;
}

// Episode Info parsed from filename
export interface EpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  originalFilename: string;
  filePath: string;
}

// Re-matching result
export interface RematchResult {
  success: boolean;
  matched: number;
  unmatched: number;
  episodes: EpisodeInfo[];
  errors?: string[];
}

// Episode file binding
export interface EpisodeFileBinding {
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  filePath: string;
  matched: boolean;
  episodeTitle?: string;
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
