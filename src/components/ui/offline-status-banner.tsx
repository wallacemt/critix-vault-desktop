"use client";

import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

const RECONNECTED_VISIBILITY_MS = 4_000;

export function OfflineStatusBanner() {
  const { hasChecked, isOnline, lastError } = useApiConnectivity();
  const pathname = usePathname();
  const previousOnlineRef = useRef<boolean | null>(null);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const previousOnline = previousOnlineRef.current;
    if (previousOnline === false && isOnline) {
      setShowReconnected(true);
      const timer = window.setTimeout(() => {
        setShowReconnected(false);
      }, RECONNECTED_VISIBILITY_MS);
      previousOnlineRef.current = isOnline;
      return () => window.clearTimeout(timer);
    }

    previousOnlineRef.current = isOnline;
  }, [isOnline]);

  if (!hasChecked || pathname === "/") {
    return null;
  }

  if (isOnline && !showReconnected) {
    return null;
  }

  const offlineActive = !isOnline;

  return (
    <div className="fixed top-4 left-1/2 z-[80] -translate-x-1/2 px-4">
      <div
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md ${
          offlineActive
            ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
            : "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
        }`}
      >
        {offlineActive ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        <span>
          {offlineActive
            ? `Modo offline ativo   `
            : "Conexao com API externa restabelecida"}
        </span>
      </div>
    </div>
  );
}
