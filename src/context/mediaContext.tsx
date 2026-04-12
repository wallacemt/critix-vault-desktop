"use client";
import { userActionService } from "@/services/userActionService";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ApiEnvelope<T> =
  | T
  | {
      success: boolean;
      data?: T;
      error?: {
        message?: string;
      };
    };

function extractApiData<T>(payload: ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "success" in payload && typeof payload.success === "boolean") {
    if (!payload.success) {
      throw new Error(payload.error?.message || "Falha na requisicao da API.");
    }
    return payload.data as T;
  }

  return payload as T;
}

export type WatchSession = {
  type: "movie" | "episode";
  mediaId: string;
  title: string;
  returnPath?: string;
  backdrop?: string;
  episodeId?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};

type TemporarySeriesSeasonMap = Record<string, number>;

type MediaContext = {
  movie: Movie | null;
  serie: Series | null;
  watchSession: WatchSession | null;
  isLoading: boolean;
  setCurrentMovie: (movie: Movie) => void;
  setCurrentSerie: (serie: Series) => void;
  setWatchSession: (watchSession: WatchSession | null) => void;
  clearWatchSession: () => void;
  refreshMedia: (mediaId: string, mediaType: "MOVIE" | "SERIES") => Promise<void>;
  getTemporarySeriesSeason: (seriesId: string) => number | undefined;
  setTemporarySeriesSeason: (seriesId: string, seasonNumber: number) => void;
  clearTemporarySeriesSeason: (seriesId: string) => void;
};

const MediaContext = createContext<MediaContext | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const [serie, setSerie] = useState<Series | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [watchSession, setWatchSession] = useState<WatchSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [temporarySeriesSeasons, setTemporarySeriesSeasons] = useState<TemporarySeriesSeasonMap>({});

  async function setCurrentMovie(movie: Movie) {
    setMovie(movie);
    setIsLoading(false);
  }
  async function setCurrentSerie(serie: Series) {
    setSerie(serie);
    setIsLoading(false);
  }

  function clearWatchSession() {
    setWatchSession(null);
  }

  function getTemporarySeriesSeason(seriesId: string): number | undefined {
    return temporarySeriesSeasons[seriesId];
  }

  function setTemporarySeriesSeason(seriesId: string, seasonNumber: number) {
    setTemporarySeriesSeasons((prev) => ({
      ...prev,
      [seriesId]: seasonNumber,
    }));
  }

  function clearTemporarySeriesSeason(seriesId: string) {
    setTemporarySeriesSeasons((prev) => {
      const next = { ...prev };
      delete next[seriesId];
      return next;
    });
  }

  const refreshMedia = async (mediaId: string, mediaType: "MOVIE" | "SERIES") => {
    if (!mediaType) return;

    if (mediaType === "MOVIE") {
      const res = await fetch(`/api/movie?movieId=${mediaId}`);

      const payload = (await res.json()) as ApiEnvelope<Movie>;
      const movie = extractApiData(payload);

      return setCurrentMovie(movie);
    }

    if (mediaType === "SERIES") {
      const res = await fetch(`/api/serie?serieId=${mediaId}`);

      const payload = (await res.json()) as ApiEnvelope<Series>;
      const serie = extractApiData(payload);

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
        watchSession,
        isLoading,

        setCurrentMovie,
        setCurrentSerie,
        setWatchSession,
        clearWatchSession,
        refreshMedia,
        getTemporarySeriesSeason,
        setTemporarySeriesSeason,
        clearTemporarySeriesSeason,
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
