// server-only singleton that survives hot-reload in development
import "server-only";
import type { ChildProcess } from "child_process";
import { rm } from "fs/promises";

export interface HlsSession {
  process: ChildProcess | null;  // null for cached sessions (no FFmpeg running)
  dir: string | null;            // null for cached sessions
  filePath: string;
  outputPath: string;
  startedAt: number;
  cached?: boolean;              // true = file is in persistent cache, don't delete on stop
}

// globalThis guard keeps the Map across Next.js fast-refresh cycles.
const g = globalThis as unknown as { _hlsSessions?: Map<string, HlsSession> };
if (!g._hlsSessions) g._hlsSessions = new Map();
const sessions: Map<string, HlsSession> = g._hlsSessions;

export function getSession(id: string): HlsSession | undefined {
  return sessions.get(id);
}

export function setSession(id: string, session: HlsSession): void {
  sessions.set(id, session);
}

export async function stopSession(id: string): Promise<void> {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);

  // Cached sessions have no process to kill and no temp dir to clean up.
  if (s.cached) return;

  try { s.process?.kill("SIGTERM"); } catch {}
  const forceKill = setTimeout(() => {
    try { s.process?.kill("SIGKILL"); } catch {}
  }, 3_000);

  s.process?.once("exit", async () => {
    clearTimeout(forceKill);
    if (s.dir) await rm(s.dir, { recursive: true, force: true }).catch(() => undefined);
  });
}

/** Prune sessions older than 2 hours (safety valve for forgotten sessions). */
export function pruneOldSessions(): void {
  const cutoff = Date.now() - 2 * 60 * 60 * 1_000;
  for (const [id, s] of sessions) {
    if (s.startedAt < cutoff) stopSession(id);
  }
}
