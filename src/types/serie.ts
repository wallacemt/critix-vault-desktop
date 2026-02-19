import { Media } from "./media";
import { TMDBCast, TMDBCrew, TMDBVideo } from "./tmdb";

// Episode Interface
export interface Episode extends EpisodeDTO {
  title: string;
  duration?: number;
  filePath?: string;
  available: boolean;
  isWatched?: boolean;
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
  folderPath?: string; // Path to the series folder

  // TMDB Extended fields
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
export interface EpisodeDTO {
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

// Episode Info parsed from filename
export interface EpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  originalFilename: string;
  filePath: string;
}
export interface EpisodeFileBinding {
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  filePath: string;
  matched: boolean;
  episodeTitle?: string;
}
