import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { AsyncState } from "@/types/utils";
import { useCallback, useState } from "react";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

/**
 * Hook to load demo data from TMDB trending
 */
export function useDemoData() {
  const { isOnline, retryConnection } = useApiConnectivity();
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
    if (!isOnline) {
      const offlineError = "Modo offline ativo. O conteudo de demonstracao requer conexao com a API externa.";
      setState({ data: { movies: [], series: [] }, loading: false, error: offlineError });
      return { movies: [], series: [] };
    }

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
  }, [isOnline]);

  return {
    movies: state.data?.movies || [],
    series: state.data?.series || [],
    loading: state.loading,
    error: state.error,
    loadDemo,
    isOnline,
    retryConnection,
  };
}
