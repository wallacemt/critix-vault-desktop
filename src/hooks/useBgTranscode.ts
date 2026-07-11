"use client";

import { useEffect, useRef, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import type { Media } from "@/types/media";
import type { Series } from "@/types/serie";

export const BG_TRANSCODE_KEY = "critix_bg_transcode";

const AT_RISK = new Set([".mkv", ".avi", ".mov", ".ts", ".m2ts"]);

export function isAtRisk(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return AT_RISK.has(ext);
}

/**
 * Push file paths onto the server-side background transcode queue
 * (same singleton the library-wide auto-scan uses — see startQueue in
 * app/api/bg-transcode/queue.ts). Non-AT_RISK paths are filtered out since
 * the queue would just probe and skip them anyway.
 */
export async function queueTranscodePaths(paths: string[]): Promise<void> {
  const atRisk = paths.filter(isAtRisk);
  if (atRisk.length === 0) return;
  // ponytail: startQueue() no-ops if a queue is already running (single global
  // queue, no append) — a click while one is in flight is silently dropped.
  // Add a merge-into-running-queue path if that turns out to matter in practice.
  await fetch("/api/bg-transcode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: atRisk }),
  });
}

/** Collect all AT_RISK file paths from the media list (movies + series episodes). */
export function collectAtRiskPaths(media: Media[]): string[] {
  const paths: string[] = [];
  for (const item of media) {
    if (item.type === "MOVIE") {
      if (item.filePath && isAtRisk(item.filePath)) paths.push(item.filePath);
    } else {
      const series = item as Series;
      for (const season of series.seasons ?? []) {
        for (const episode of season.episodes ?? []) {
          if (episode.filePath && isAtRisk(episode.filePath)) paths.push(episode.filePath);
        }
      }
    }
  }
  return paths;
}

export interface BgTranscodeStatus {
  active: boolean;
  total: number;
  done: number;
  current: string | null;
}

const IDLE: BgTranscodeStatus = { active: false, total: 0, done: 0, current: null };

/**
 * Auto-starts the server-side background transcode queue for the whole
 * library when the user has the auto-scan setting enabled. Status display is
 * handled separately by useBgTranscodeStatus (mounted once at the app layout
 * level) so it stays visible regardless of this setting — a manual
 * "Pré-processar" click elsewhere pushes onto the same server queue and
 * should show progress even if library-wide auto-scan is off.
 *
 * No "stop when disabled" effect here: `enabled` is read once from
 * localStorage by the caller (LibraryLayout) and never changes within a
 * mount, so such an effect could only ever fire once — right as this hook
 * mounts with the setting off (the default) — which would unconditionally
 * DELETE the shared server-side queue on every navigation to the library
 * page, killing an unrelated manually-queued transcode in progress.
 */
export function useBgTranscodeAutoStart(media: Media[], enabled: boolean): void {
  // Guard: only send the start request once per media batch.
  const startedRef = useRef(false);

  // Start queue once when enabled and media has loaded.
  useEffect(() => {
    if (!enabled || media.length === 0 || startedRef.current) return;

    const paths = collectAtRiskPaths(media);
    if (paths.length === 0) return;

    startedRef.current = true;
    fetch("/api/bg-transcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    }).catch(console.error);
  // media dep is safe here: we only send one fetch (startedRef guard), so
  // re-running this effect on a new media reference cannot cause a render loop.
  }, [enabled, media]);
}

/**
 * Subscribes to the server-side background transcode queue over SSE
 * (GET /api/bg-transcode streams instead of returning one-shot JSON).
 * Mounted once at the app layout level so the queue status/panel is visible
 * on every route, not just the library page — the queue itself is a
 * server-side singleton fed both by library-wide auto-scan
 * (useBgTranscodeAutoStart) and by manual per-title "Pré-processar" clicks
 * (queueTranscodePaths), so this subscription must not depend on either trigger.
 */
export function useBgTranscodeStatus(): BgTranscodeStatus {
  return useSSE<BgTranscodeStatus>("/api/bg-transcode", IDLE);
}

/**
 * Batch-checks which of the given file paths already have a completed audio
 * transcode cached on disk, so episode/movie cards can show an "áudio pronto"
 * badge without the user opening the player. Only AT_RISK paths are ever
 * queried — everything else is web-compatible already and never transcodes.
 *
 * Pass `refreshToken` (e.g. the `done` counter from useBgTranscodeStatus) to
 * re-check after the background queue finishes another file, so badges flip
 * to "ready" live instead of only after a page reload.
 */
export function useTranscodeStatus(paths: string[], refreshToken?: unknown): Record<string, boolean> {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const atRiskPaths = paths.filter(isAtRisk);
  const pathsKey = atRiskPaths.slice().sort().join("|");

  useEffect(() => {
    if (atRiskPaths.length === 0) {
      setStatuses({});
      return;
    }

    let cancelled = false;
    fetch("/api/transcode-cache/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: atRiskPaths }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { statuses?: Record<string, boolean> } | null) => {
        if (!cancelled && data?.statuses) setStatuses(data.statuses);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  // atRiskPaths is intentionally excluded: pathsKey is its stable serialization,
  // and re-deriving it every render would otherwise re-fetch on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey, refreshToken]);

  return statuses;
}
