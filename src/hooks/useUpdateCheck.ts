/**
 * useUpdateCheck
 *
 * Silently checks for a new native update once on mount (Tauri runtime only)
 * and exposes enough state to show a non-blocking "update available" nudge —
 * the automatic counterpart to the manual "Verificar atualizações" button in
 * Settings, which uses the same @tauri-apps/plugin-updater APIs.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface NativeUpdate {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
  downloadAndInstall: (onEvent: (event: { event: string; data?: any }) => void) => Promise<void>;
}

export type UpdateCheckStatus = "idle" | "checking" | "available" | "none" | "error";

const isTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface UpdateCheckState {
  status: UpdateCheckStatus;
  update: NativeUpdate | null;
  dismissed: boolean;
  installing: boolean;
  installProgress: number | null;
  dismiss: () => void;
  install: () => Promise<void>;
}

export function useUpdateCheck(): UpdateCheckState {
  const [status, setStatus] = useState<UpdateCheckStatus>("idle");
  const [update, setUpdate] = useState<NativeUpdate | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<number | null>(null);
  const updateRef = useRef<NativeUpdate | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let cancelled = false;
    setStatus("checking");

    (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const result = (await check()) as NativeUpdate | null;
        if (cancelled) return;

        if (result) {
          updateRef.current = result;
          setUpdate(result);
          setStatus("available");
        } else {
          setStatus("none");
        }
      } catch (err) {
        // Non-fatal: silent check, no UI to fall back to besides staying quiet.
        console.warn("[useUpdateCheck] Silent check failed:", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  const install = useCallback(async () => {
    const current = updateRef.current;
    if (!current) return;

    setInstalling(true);
    setInstallProgress(0);

    try {
      let downloaded = 0;
      let total = 0;

      await current.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = Number(event.data?.contentLength ?? 0);
          downloaded = 0;
          setInstallProgress(0);
        } else if (event.event === "Progress") {
          downloaded += Number(event.data?.chunkLength ?? 0);
          if (total > 0) {
            setInstallProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          }
        } else if (event.event === "Finished") {
          setInstallProgress(100);
        }
      });

      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      console.error("[useUpdateCheck] Install failed:", err);
      setInstalling(false);
      setInstallProgress(null);
      throw err;
    }
  }, []);

  return { status, update, dismissed, installing, installProgress, dismiss, install };
}
