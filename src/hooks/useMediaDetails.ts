import { apiService } from "@/services/api";
import { AsyncState, Movie, Series } from "@/types";
import { useEffect, useState } from "react";

/**
 * Hook to manage media details
 */
export function useMediaDetails(mediaId: string | null, type: "movie" | "series") {
  const [state, setState] = useState<AsyncState<Movie | Series>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!mediaId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const loadDetails = async () => {
      setState({ data: null, loading: true, error: null });
      try {
        const details = await apiService.getMediaDetails(mediaId, type);
        if (!cancelled) {
          setState({ data: details as Movie | Series, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          const errorMessage = error instanceof Error ? error.message : "Failed to load media details";
          setState({ data: null, loading: false, error: errorMessage });
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [mediaId, type]);

  return state;
}
