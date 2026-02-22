export interface TMDBMedia {
  adult: boolean;
  backdrop_path: string;
  id: number;
  title?: string;
  original_title?: string;
  overview: string;
  poster_path: string;
  media_type: string;
  original_language: string;
  genre_ids: number[];
  popularity: number;
  release_date?: string;
  video?: boolean;
  vote_average: number;
  vote_count: number;
  name?: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];
}
export interface TMDBTrendingResponse {
  page: number;
  results: TMDBMedia[];
  total_pages: number;
  total_results: number;
}

export interface TMDBTrendingPostersResponse {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
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
  profile_path?: string;
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

export interface TMDBImageBase {
  aspect_ratio: number;
  height: number;
  iso_3166_1: string;
  iso_639_1: string;
  file_path: string;
  vote_average: number;
  vote_count: number;
  width: number;
}
export interface TMDBImages {
  backdrop: TMDBImageBase[];
  id: number;
  logo: TMDBImageBase[];
  poster: TMDBImageBase[];
}
