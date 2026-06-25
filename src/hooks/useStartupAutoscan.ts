/**
 * useStartupAutoscan
 *
 * Runs once per app lifecycle (not per component mount) and diffs every
 * registered folder against the database. If new media files are found the
 * hook surfaces them so the caller can show a non-blocking notification.
 *
 * The module-scoped guard (`hasRunThisSession`) survives React remounts and
 * Next.js soft-navigations, ensuring the scan never fires twice in one
 * browser session.
 */

import { useEffect, useRef, useState } from "react";
import { tauriService } from "@/services/tauri";
import { folderScanService } from "@/services/folderScanService";
import { getMovies, getSeries, getFolders, saveMovies, saveSeries } from "@/services/databaseService";
import { useApiConnectivity } from "@/context/apiConnectivityContext";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutoscanStatus =
  | "idle"             // disabled or not yet started
  | "scanning"         // background scan in progress
  | "found-items"      // new media found — show notification
  | "no-items"         // scan done, nothing new — stay silent
  | "offline-warning"  // new files found but API unreachable
  | "added"            // user confirmed; media persisted
  | "dismissed";       // user chose to ignore

export interface AutoscanState {
  status: AutoscanStatus;
  newMovies: Movie[];
  newSeries: Series[];
  unmatchedCount: number;
  confirm: () => Promise<void>;
  dismiss: () => void;
}

// ─── Session guard ─────────────────────────────────────────────────────────────
// Defined at module scope so it is shared across all hook instances and
// survives component remounts / Next.js client-side navigations.
let hasRunThisSession = false;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStartupAutoscan(): AutoscanState {
  const { isOnline } = useApiConnectivity();

  const [status, setStatus] = useState<AutoscanStatus>("idle");
  const [newMovies, setNewMovies] = useState<Movie[]>([]);
  const [newSeries, setNewSeries] = useState<Series[]>([]);
  const [unmatchedCount, setUnmatchedCount] = useState(0);

  // Ref that always holds the latest isOnline value, preventing stale-closure
  // reads inside the async runScan() body.
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  // Cached baseline snapshots so confirm() doesn't need to re-fetch from DB.
  const existingMoviesRef = useRef<Movie[]>([]);
  const existingSeriesRef = useRef<Series[]>([]);

  // Snapshot of scan results kept in refs so confirm() is immune to
  // re-render stale-closure issues.
  const newMoviesRef = useRef<Movie[]>([]);
  const newSeriesRef = useRef<Series[]>([]);

  useEffect(() => {
    if (hasRunThisSession) return;

    // Set the guard synchronously before any await to prevent a second
    // invocation from a concurrent render while this one is in-flight.
    hasRunThisSession = true;

    runScan();

    async function runScan() {
      try {
        const settings = await tauriService.getSettings();

        if (!settings.auto_scan_on_startup) {
          setStatus("idle");
          return;
        }

        setStatus("scanning");

        const [existingMovies, existingSeries, foldersToScan] = await Promise.all([
          getMovies(),
          getSeries(),
          getFolders(),
        ]);

        // Cache baselines for use in confirm().
        existingMoviesRef.current = existingMovies;
        existingSeriesRef.current = existingSeries;

        // Scan every registered folder in parallel — autoscan is best-effort
        // so individual folder errors are swallowed and counted as zero results.
        const scanPromises = foldersToScan.map((folder) =>
          folderScanService
            .scanAndMatchFolder(folder.id, folder.path, undefined, existingMovies, existingSeries)
            .catch((err) => {
              console.error(`[autoscan] Failed to scan folder "${folder.path}":`, err);
              return { movies: [], series: [], unmatchedFiles: [], totalProcessed: 0, foundFilePaths: [] };
            }),
        );

        const results = await Promise.all(scanPromises);

        const aggregatedMovies = results.flatMap((r) => r.movies);
        const aggregatedSeries = results.flatMap((r) => r.series);
        const aggregatedUnmatched = results.reduce((sum, r) => sum + r.unmatchedFiles.length, 0);

        setNewMovies(aggregatedMovies);
        setNewSeries(aggregatedSeries);
        setUnmatchedCount(aggregatedUnmatched);

        newMoviesRef.current = aggregatedMovies;
        newSeriesRef.current = aggregatedSeries;

        const hasNewMedia = aggregatedMovies.length + aggregatedSeries.length > 0;

        if (!isOnlineRef.current && aggregatedUnmatched > 0) {
          setStatus("offline-warning");
        } else if (!hasNewMedia) {
          setStatus("no-items");
        } else {
          setStatus("found-items");
        }
      } catch (err) {
        // Autoscan must never crash the app — degrade silently.
        console.error("[autoscan] Unexpected error during startup scan:", err);
        setStatus("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // isOnline is intentionally not in the dep array: the scan runs once at
    // session start; isOnlineRef is used inside runScan() to get a fresh read.
  }, []);

  const confirm = async (): Promise<void> => {
    try {
      if (newMoviesRef.current.length > 0) {
        await saveMovies([...existingMoviesRef.current, ...newMoviesRef.current]);
      }
      if (newSeriesRef.current.length > 0) {
        await saveSeries([...existingSeriesRef.current, ...newSeriesRef.current]);
      }
      setStatus("added");
    } catch (err) {
      console.error("[autoscan] Failed to persist new media:", err);
      // Retain the found-items status so the user can try again.
    }
  };

  const dismiss = (): void => {
    setStatus("dismissed");
  };

  return { status, newMovies, newSeries, unmatchedCount, confirm, dismiss };
}
