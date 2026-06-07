// @tauri-apps/api accesses the bare `location` global during module
// initialization — defer the import to first use, mirroring the pattern in tauri.ts.
let _invoke: typeof import("@tauri-apps/api/core").invoke | null = null;
const invoke: typeof import("@tauri-apps/api/core").invoke = async (cmd, args?, opts?) => {
  if (!_invoke) {
    _invoke = (await import("@tauri-apps/api/core")).invoke;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _invoke(cmd as string, args, opts) as any;
};

import type { SubtitleEntry } from "@/types/player";

const BASE = "http://127.0.0.1:1422";

export function buildStreamUrl(filePath: string): string {
  return `${BASE}/api/stream?path=${encodeURIComponent(filePath)}`;
}

export function buildSubtitleUrl(filePath: string): string {
  return `${BASE}/api/subtitle?path=${encodeURIComponent(filePath)}`;
}

export async function listSidecarSubtitles(videoPath: string): Promise<SubtitleEntry[]> {
  return invoke<SubtitleEntry[]>("list_sidecar_subtitles", { videoPath });
}

export interface ResumePoint {
  positionSeconds: number;
  progress: number;
}

export async function getResume(
  mediaId: string,
  episodeId?: string,
): Promise<ResumePoint | null> {
  const params = new URLSearchParams({ mediaId });
  if (episodeId) params.append("episodeId", episodeId);
  const resp = await fetch(`${BASE}/api/watch-history?${params}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const rows = (await resp.json()) as Array<{ positionSeconds?: number; progress?: number }>;
  const row = rows[0];
  if (!row) return null;
  return {
    positionSeconds: row.positionSeconds ?? 0,
    progress: row.progress ?? 0,
  };
}

export async function saveProgress(opts: {
  mediaId: string;
  episodeId?: string;
  mediaType: "MOVIE" | "SERIES";
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
}): Promise<void> {
  const progress =
    opts.durationSeconds > 0
      ? Math.round((opts.positionSeconds / opts.durationSeconds) * 100)
      : 0;

  await fetch(`${BASE}/api/watch-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mediaId: opts.mediaId,
      episodeId: opts.episodeId,
      mediaType: opts.mediaType,
      positionSeconds: opts.positionSeconds,
      durationSeconds: opts.durationSeconds,
      progress,
      completed: opts.completed,
    }),
  });
}
