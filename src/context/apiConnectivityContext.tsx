"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiService } from "@/services/api";
import { ApiStatus } from "@/types/api";

const ONLINE_POLL_INTERVAL_MS = 60_000;
const OFFLINE_POLL_INTERVAL_MS = 10_000;

interface ApiConnectivityContextType {
  status: ApiStatus | null;
  isOnline: boolean;
  isChecking: boolean;
  hasChecked: boolean;
  lastError: string | null;
  retryConnection: () => Promise<ApiStatus>;
}

const ApiConnectivityContext = createContext<ApiConnectivityContextType | undefined>(undefined);

export function ApiConnectivityProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const previousOnlineState = useRef<boolean | null>(null);

  const checkStatus = useCallback(async (silent = false) => {
    if (!silent) {
      setIsChecking(true);
    }

    try {
      const result = await apiService.checkStatus();
      setStatus(result);
      setIsOnline(result.online);
      setLastError(result.online ? null : result.message || "External API is offline");
      setHasChecked(true);
      return result;
    } finally {
      if (!silent) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    const pollInterval = isOnline ? ONLINE_POLL_INTERVAL_MS : OFFLINE_POLL_INTERVAL_MS;

    const timer = window.setInterval(() => {
      checkStatus(true).catch(() => {
        // checkStatus never throws, but keep catch to avoid unhandled promise warnings.
      });
    }, pollInterval);

    return () => window.clearInterval(timer);
  }, [isOnline, checkStatus]);

  useEffect(() => {
    apiService.setExternalApiOnlineStatus(isOnline);

    const wasOnline = previousOnlineState.current;
    if (wasOnline !== null && wasOnline !== isOnline) {
      setStatus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          message: isOnline ? "Conexao com API externa restabelecida." : prev.message,
        };
      });
    }

    previousOnlineState.current = isOnline;
  }, [isOnline]);

  const value = useMemo<ApiConnectivityContextType>(
    () => ({
      status,
      isOnline,
      isChecking,
      hasChecked,
      lastError,
      retryConnection: () => checkStatus(false),
    }),
    [status, isOnline, isChecking, hasChecked, lastError, checkStatus],
  );

  return <ApiConnectivityContext.Provider value={value}>{children}</ApiConnectivityContext.Provider>;
}

export function useApiConnectivity() {
  const context = useContext(ApiConnectivityContext);
  if (!context) {
    throw new Error("useApiConnectivity must be used within an ApiConnectivityProvider");
  }
  return context;
}
