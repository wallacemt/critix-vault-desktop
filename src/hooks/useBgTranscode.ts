"use client";

import { useEffect, useRef, useState } from "react";
import type { Media } from "@/types/media";
import type { Series } from "@/types/serie";

export const BG_TRANSCODE_KEY = "critix_bg_transcode";

const AT_RISK = new Set([".mkv", ".avi", ".mov", ".ts", ".m2ts"]);

function isAtRisk(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return AT_RISK.has(ext);
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
 * Thin client wrapper around the server-side background transcode queue
 * (POST /api/bg-transcode to start, DELETE to stop, GET to poll status).
 *
 * The actual long-running work runs in the Next.js server process as a module
 * singleton — completely outside React's lifecycle, no update-depth issues.
 */
export function useBgTranscode(media: Media[], enabled: boolean): BgTranscodeStatus {
  const [status, setStatus] = useState<BgTranscodeStatus>(IDLE);
  // Guard: only send the start request once per media batch.
  const startedRef = useRef(false);

  // Start queue once when enabled and media has loaded.
  // No setStatus here — the poll effect below handles state updates.
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
  // media dep is safe here: we only send one fetch (startedRef guard), never call setStatus,
  // so re-running this effect on a new media reference cannot cause a render loop.
  }, [enabled, media]);

  // Stop when disabled.
  // enabled is initialized from localStorage once and never changes — this effect
  // runs once on mount. setStatus(IDLE) here is safe (single stable trigger).
  useEffect(() => {
    if (enabled) return;
    startedRef.current = false;
    fetch("/api/bg-transcode", { method: "DELETE" }).catch(console.error);
    setStatus(IDLE);
  }, [enabled]);

  // Poll status every 3 s while enabled.
  // Dep is [enabled] only (stable) — setStatus from poll results cannot feed back
  // into deps, so there is no render loop possible here.
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        try {
          const res = await fetch("/api/bg-transcode");
          if (res.ok && !cancelled) {
            setStatus((await res.json()) as BgTranscodeStatus);
          }
        } catch {
          // network hiccup — keep polling
        }
        if (!cancelled) await new Promise<void>((r) => setTimeout(r, 3000));
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [enabled]);

  return status;
}
