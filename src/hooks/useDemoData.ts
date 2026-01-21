import { AsyncState, Movie, Series } from "@/types";
import { useCallback, useState } from "react";

/**
 * Hook to load demo data from TMDB trending
 */
export function useDemoData() {
  const [state, setState] = useState<
    AsyncState<{
      movies: Movie[];
      series: Series[];
    }>
  >({
    data: null,
    loading: false,
    error: null,
  });

  const loadDemo = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const { loadDemoData } = await import("@/services/demoService");
      const demoData = await loadDemoData();

      setState({
        data: demoData,
        loading: false,
        error: null,
      });

      return demoData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load demo data";
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return {
    movies: state.data?.movies || [],
    series: state.data?.series || [],
    loading: state.loading,
    error: state.error,
    loadDemo,
  };
}
