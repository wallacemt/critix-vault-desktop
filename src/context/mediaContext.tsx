"use client";
import { Movie, Series } from "@/types";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  SetStateAction,
  Dispatch,
} from "react";

type MediaContext = {
  movie: Movie | null;
  serie: Series | null;
  isLoading: boolean;
  setCurrentMovie: (movie: Movie) => void;
  setCurrentSerie: (serie: Series) => void;
  refreshMedia: (mediaId: string) => Promise<void>;
};

const MediaContext = createContext<MediaContext | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const [serie, setSerie] = useState<Series | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function setCurrentMovie(movie: Movie) {
    localStorage.setItem("currentMovieId", JSON.stringify(movie.id));
    setMovie(movie);
    setIsLoading(false);
  }
  async function setCurrentSerie(serie: Series) {
    localStorage.setItem("currentSerieId", JSON.stringify(serie.id));
    setSerie(serie);
    setIsLoading(false);
  }
  const refreshMedia = async (mediaId: string) => {
    const res = await fetch(`/api/movie?movieId=${mediaId}`);

    const movie = (await res.json()) as Movie;

    setCurrentMovie(movie);
  };

  useEffect(() => {
    if (localStorage.getItem("currentMovieId")) {
      const movieId = localStorage.getItem("currentMovieId") || "";
      refreshMedia(movieId);
    }
  }, []);

  return (
    <MediaContext.Provider
      value={{
        movie,
        serie,
        isLoading,

        setCurrentMovie,
        setCurrentSerie,
        refreshMedia,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}

export function useMediaContext() {
  const context = useContext(MediaContext);
  if (context === undefined) {
    throw new Error("useMedia must be used within an MediaProvider");
  }
  return context;
}
