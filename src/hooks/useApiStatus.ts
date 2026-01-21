import { apiService } from "@/services/api";
import { ApiStatus, AsyncState } from "@/types";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook to check API status
 */
export function useApiStatus() {
  const [status, setStatus] = useState<AsyncState<ApiStatus>>({
    data: null,
    loading: true,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiService.checkStatus();
      setStatus({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to check API status";
      setStatus({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { ...status, retry: checkStatus };
}
