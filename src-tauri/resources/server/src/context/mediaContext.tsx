"use client";
import { userActionService } from "@/services/userActionService";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type MediaContext = {
  movie: Movie | null;
  serie: Series | null;
  isLoading: boolean;
  setCurrentMovie: (movie: Movie) => void;
  setCurrentSerie: (serie: Series) => void;
  refreshMedia: (mediaId: string, mediaType: "MOVIE" | "SERIES") => Promise<void>;
};

const MediaContext = createContext<MediaContext | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const [serie, setSerie] = useState<Series | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function setCurrentMovie(movie: Movie) {
    setMovie(movie);
    setIsLoading(false);
  }
  async function setCurrentSerie(serie: Series) {
    setSerie(serie);
    setIsLoading(false);
  }
  const refreshMedia = async (mediaId: string, mediaType: "MOVIE" | "SERIES") => {
    if (!mediaType) return;

    if (mediaType === "MOVIE") {
      const res = await fetch(`/api/movie?movieId=${mediaId}`);

      const movie = (await res.json()) as Movie;

      return setCurrentMovie(movie);
    }

    if (mediaType === "SERIES") {
      const res = await fetch(`/api/serie?serieId=${mediaId}`);

      const serie = (await res.json()) as Series;

      return setCurrentSerie(serie);
    }
  };

  useEffect(() => {
    const getUserActionHistory = async () => {
      try {
        const lastMedia = await userActionService.getLastViewedMedia();

        if (lastMedia) {
          refreshMedia(lastMedia.mediaId, lastMedia.mediaType);
        }
      } catch (error) {
        console.error(error);
      }
    };

    getUserActionHistory();
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
