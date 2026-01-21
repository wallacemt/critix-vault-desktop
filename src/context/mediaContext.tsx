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
  setSerie: Dispatch<SetStateAction<Series | null>>;
  setMovie: Dispatch<SetStateAction<Movie | null>>;
};

const MediaContext = createContext<MediaContext | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const [serie, setSerie] = useState<Series | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <MediaContext.Provider
      value={{
        movie,
        serie,
        isLoading,
        setSerie,
        setMovie,
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
