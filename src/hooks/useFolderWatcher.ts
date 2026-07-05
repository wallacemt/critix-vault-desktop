/**
 * useFolderWatcher
 *
 * Mirrors useStartupAutoscan's scan/match/notify flow, but triggered by
 * filesystem changes instead of app startup. The Rust side (src-tauri/src/watcher.rs)
 * watches every registered folder via the `notify` crate and emits a
 * "library-folder-changed" Tauri event (folder root paths) once changes settle.
 *
 * New media found this way goes through the exact same confirm/dismiss
 * notification as autoscan — reusing folderScanService.scanAndMatchFolder and
 * <AutoscanNotification> — so nothing about the existing review-before-adding
 * UX changes; this hook only adds a new trigger for it.
 */

import { useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { tauriService } from "@/services/tauri";
import { folderScanService } from "@/services/folderScanService";
import { getMovies, getSeries, saveMovies, saveSeries } from "@/services/databaseService";
import { useFoldersContext } from "@/context/foldersContext";
import type { AutoscanStatus } from "./useStartupAutoscan";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";

export interface FolderWatcherState {
  status: AutoscanStatus;
  newMovies: Movie[];
  newSeries: Series[];
  unmatchedCount: number;
  confirm: () => Promise<void>;
  dismiss: () => void;
}

const normPath = (p: string) => p.replace(/\\/g, "/").toLowerCase();

export function useFolderWatcher(): FolderWatcherState {
  const { folders } = useFoldersContext();

  const [status, setStatus] = useState<AutoscanStatus>("idle");
  const [newMovies, setNewMovies] = useState<Movie[]>([]);
  const [newSeries, setNewSeries] = useState<Series[]>([]);
  const [unmatchedCount, setUnmatchedCount] = useState(0);

  // Always-fresh reads inside the event handler below, which is registered
  // once and must not close over a stale folder list.
  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  const existingMoviesRef = useRef<Movie[]>([]);
  const existingSeriesRef = useRef<Series[]>([]);
  const newMoviesRef = useRef<Movie[]>([]);
  const newSeriesRef = useRef<Series[]>([]);

  // Serializes change-event handling: if two folders change within the same
  // debounce window, this queues the second batch after the first instead of
  // running scanAndMatchFolder concurrently and clobbering the shared
  // notification state (found-items from batch 1 getting overwritten mid-confirm).
  const processingChain = useRef<Promise<void>>(Promise.resolve());

  // (Re)register the native watcher with the current folder list — on mount,
  // and every time a folder is added or removed. Cheap to call: the Rust side
  // just replaces its watch set. Reads the setting fresh each time so a
  // toggle flip that happens between folder-list changes (e.g. right after
  // startup) is still honored on the next add/remove or app restart — the
  // Settings page itself also calls watchFolders directly for instant effect.
  useEffect(() => {
    let cancelled = false;
    tauriService
      .getSettings()
      .then((settings) => {
        if (cancelled) return;
        const paths = settings.auto_scan_on_change ? folders.map((f) => f.path) : [];
        return tauriService.watchFolders(paths);
      })
      .catch((err) => console.error("[folder-watcher] Failed to (re)start watcher:", err));
    return () => {
      cancelled = true;
    };
  }, [folders]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;

    async function handleChangedPaths(changedPaths: string[]) {
      if (cancelled) return;
      const affected = foldersRef.current.filter((f) =>
        changedPaths.some((p) => normPath(p) === normPath(f.path)),
      );
      if (affected.length === 0) return;

      try {
        setStatus("scanning");

        const [existingMovies, existingSeries] = await Promise.all([getMovies(), getSeries()]);
        existingMoviesRef.current = existingMovies;
        existingSeriesRef.current = existingSeries;

        // Same per-folder error-swallow convention as useStartupAutoscan: one
        // folder failing to rescan must not block the others.
        const results = await Promise.all(
          affected.map((folder) =>
            folderScanService
              .scanAndMatchFolder(folder.id, folder.path, undefined, existingMovies, existingSeries)
              .catch((err) => {
                console.error(`[folder-watcher] Failed to rescan folder "${folder.path}":`, err);
                return { movies: [], series: [], unmatchedFiles: [], totalProcessed: 0, foundFilePaths: [] };
              }),
          ),
        );

        if (cancelled) return;

        const aggregatedMovies = results.flatMap((r) => r.movies);
        const aggregatedSeries = results.flatMap((r) => r.series);
        const aggregatedUnmatched = results.reduce((sum, r) => sum + r.unmatchedFiles.length, 0);

        setNewMovies(aggregatedMovies);
        setNewSeries(aggregatedSeries);
        setUnmatchedCount(aggregatedUnmatched);
        newMoviesRef.current = aggregatedMovies;
        newSeriesRef.current = aggregatedSeries;

        setStatus(aggregatedMovies.length + aggregatedSeries.length > 0 ? "found-items" : "no-items");
      } catch (err) {
        // A change-triggered rescan must never crash the app — same contract
        // useStartupAutoscan already holds for the startup path.
        console.error("[folder-watcher] Unexpected error during change-triggered scan:", err);
        setStatus("idle");
      }
    }

    listen<string[]>("library-folder-changed", (event) => {
      processingChain.current = processingChain.current.then(() => handleChangedPaths(event.payload));
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
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
      console.error("[folder-watcher] Failed to persist new media:", err);
    }
  };

  const dismiss = (): void => setStatus("dismissed");

  return { status, newMovies, newSeries, unmatchedCount, confirm, dismiss };
}
