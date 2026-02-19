import { GenreDTO } from "./api";
import { Media } from "./media";
import { TMDBCast, TMDBCrew, TMDBVideo } from "./tmdb";

// Movie Interface
export interface Movie extends Media {
  type: "MOVIE"

  trailer?: string;
  releaseDate?: string;

  // TMDB Extended fields

  imdbId?: string;
  tagline?: string;
  budget?: number;
  revenue?: number;
  voteCount?: number;
  popularity?: number;
  images?: string[]; // Array of image URLs
  videos?: TMDBVideo[]; // Array of video objects
  cast?: TMDBCast[]; // Array of cast members
  crew?: TMDBCrew[]; // Array of crew members
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