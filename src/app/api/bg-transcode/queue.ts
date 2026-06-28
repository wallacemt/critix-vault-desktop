// Server-side background transcode queue singleton.
// Uses the globalThis pattern (same as hls/sessions.ts) to survive Next.js hot-reload.
import "server-only";

export interface BgQueueStatus {
  active: boolean;
  total: number;
  done: number;
  current: string | null;
}

const IDLE: BgQueueStatus = { active: false, total: 0, done: 0, current: null };

const g = globalThis as {
  _bgQueue?: {
    status: BgQueueStatus;
    abort: AbortController | null;
    running: boolean;
  };
};

if (!g._bgQueue) {
  g._bgQueue = { status: { ...IDLE }, abort: null, running: false };
}

const q = g._bgQueue;

export function getQueueStatus(): BgQueueStatus {
  return q.status;
}

export function stopQueue(): void {
  q.abort?.abort();
  q.abort = null;
  q.running = false;
  q.status = { ...IDLE };
}

export function startQueue(paths: string[], origin: string): void {
  if (q.running || paths.length === 0) return;

  q.running = true;
  q.abort = new AbortController();
  const signal = q.abort.signal;

  q.status = { active: true, total: paths.length, done: 0, current: null };

  (async () => {
    try {
      for (let i = 0; i < paths.length; i++) {
        if (signal.aborted) break;

        const filePath = paths[i];
        q.status = { ...q.status, current: filePath };

        try {
          // Probe first: skip files that don't need transcoding, select preferred audio stream.
          const probeUrl = new URL(`${origin}/api/probe`);
          probeUrl.searchParams.set("path", filePath);
          const probeRes = await fetch(probeUrl.toString(), { signal });
          if (!probeRes.ok) continue;

          const probe = (await probeRes.json()) as {
            needsTranscode: boolean;
            audioStreams: Array<{ relativeIndex: number; language: string | null; needsTranscode: boolean }>;
          };

          if (!probe.needsTranscode) {
            // File already has a browser-compatible audio codec — nothing to do.
            continue;
          }

          // Prefer Portuguese track; fall back to first track that needs transcode.
          const PT_LANGS = new Set(["por", "pt", "pt-BR", "pt-br"]);
          const preferred =
            probe.audioStreams.find((s) => s.needsTranscode && s.language && PT_LANGS.has(s.language)) ??
            probe.audioStreams.find((s) => s.needsTranscode) ??
            probe.audioStreams[0];

          const audioStream = preferred?.relativeIndex ?? 0;

          const url = new URL(`${origin}/api/hls/start`);
          url.searchParams.set("path", filePath);
          url.searchParams.set("audioStream", String(audioStream));
          // Fire-and-await: waits for FFmpeg to finish before moving to the next file.
          // This is intentional — sequential processing avoids saturating the CPU.
          await fetch(url.toString(), { method: "POST", signal });
        } catch {
          // Per-file errors are non-fatal; continue with the queue.
        }

        if (!signal.aborted) {
          q.status = { ...q.status, done: i + 1 };
        }
      }
    } finally {
      q.running = false;
      q.abort = null;
      if (!signal.aborted) {
        q.status = { active: false, total: paths.length, done: paths.length, current: null };
      }
    }
  })();
}
