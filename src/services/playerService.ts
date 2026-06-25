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

// In dev mode the Next.js server runs on localhost:3000; in production it runs
// on 127.0.0.1:1422. Using window.location.origin works correctly in both cases.
const BASE = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:1422";

// Vidstack uses canPlayType() to choose a loader. Chrome returns "" for
// "video/x-matroska" even though it CAN play H.264-in-MKV via FFmpeg.
// Mapping those formats to "video/mp4" forces the HTML5 Video loader, which
// then plays the stream successfully regardless of the actual container.
const PLAYER_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/mp4",
  ".mkv": "video/mp4",
  ".avi": "video/mp4",
  ".webm": "video/webm",
};

export function getMimeType(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  const ext = dot >= 0 ? filePath.slice(dot).toLowerCase() : "";
  return PLAYER_MIME[ext] ?? "video/mp4";
}

export function buildStreamUrl(filePath: string): string {
  return `${BASE}/api/stream?path=${encodeURIComponent(filePath)}`;
}

export function buildSubtitleUrl(filePath: string): string {
  return `${BASE}/api/subtitle?path=${encodeURIComponent(filePath)}`;
}

/** URL to extract an embedded subtitle stream (by relative index) from a media file to VTT. */
export function buildEmbeddedSubtitleUrl(filePath: string, relativeIndex: number): string {
  return `${BASE}/api/subtitle?path=${encodeURIComponent(filePath)}&stream=${relativeIndex}`;
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

// ── Audio codec probing & HLS transcoding ────────────────────────────────────

export interface SubtitleStreamInfo {
  relativeIndex: number;
  codec: string;
  language: string | null;
  title: string | null;
}

export interface AudioStreamInfo {
  relativeIndex: number;
  codec: string;
  language: string | null;
  title: string | null;
  channels: number;
  needsTranscode: boolean;
}

export interface AudioProbeResult {
  audioCodec: string | null;
  needsTranscode: boolean;
  ffprobeAvailable: boolean;
  subtitleStreams: SubtitleStreamInfo[];
  audioStreams: AudioStreamInfo[];
}

export async function probeAudio(filePath: string): Promise<AudioProbeResult> {
  try {
    const resp = await fetch(
      `${BASE}/api/probe?path=${encodeURIComponent(filePath)}`,
      { cache: "no-store" },
    );
    if (!resp.ok) {
      console.error(`[probeAudio] HTTP ${resp.status} for ${filePath}`);
      return { audioCodec: null, needsTranscode: false, ffprobeAvailable: false, subtitleStreams: [], audioStreams: [] };
    }
    return resp.json() as Promise<AudioProbeResult>;
  } catch (err) {
    console.error("[probeAudio] Request failed:", err);
    return { audioCodec: null, needsTranscode: false, ffprobeAvailable: false, subtitleStreams: [], audioStreams: [] };
  }
}

export interface HlsSession {
  sessionId: string;
  hlsUrl: string;
}

export async function startHlsSession(
  filePath: string,
  /** Relative index of the audio stream to transcode (from probe's audioStreams[]). */
  audioStream: number = 0,
  signal?: AbortSignal,
): Promise<HlsSession | null> {
  try {
    const url = new URL(`${BASE}/api/hls/start`);
    url.searchParams.set("path", filePath);
    url.searchParams.set("audioStream", String(audioStream));
    const resp = await fetch(url.toString(), { method: "POST", signal });
    if (!resp.ok) {
      console.error(`[startHlsSession] HTTP ${resp.status}:`, await resp.text().catch(() => ""));
      return null;
    }
    return resp.json() as Promise<HlsSession>;
  } catch (err) {
    // AbortError is expected when the player unmounts mid-transcode — not a real error.
    if (err instanceof DOMException && err.name === "AbortError") return null;
    console.error("[startHlsSession] Request failed:", err);
    return null;
  }
}

export async function stopHlsSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${BASE}/api/hls/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Best-effort; server-side prune will clean up after 2 h.
  }
}

// ── Watch history ─────────────────────────────────────────────────────────────

export async function saveProgress(opts: {
  mediaId: string;
  episodeId?: string;
  mediaType: "MOVIE" | "SERIES";
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
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
      seasonNumber: opts.seasonNumber,
      episodeNumber: opts.episodeNumber,
    }),
  });
}
