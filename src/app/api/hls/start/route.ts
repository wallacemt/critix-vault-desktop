import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { mkdir, rename, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID, createHash } from "crypto";
import { resolveAndGuardPath } from "@/lib/streaming";
import { findBinary } from "@/lib/find-binary";
import { setSession, getSession, pruneOldSessions, inFlightTranscodes } from "../sessions";

// Allow up to 10 minutes for transcoding large files.
// (Only relevant in serverless deploys; local Tauri server has no hard limit.)
export const maxDuration = 600;

function getTranscodeCacheDir(): string {
  const dataDir = process.env.CRITIX_DATA_DIR;
  return dataDir ? join(dataDir, "transcodes") : join(tmpdir(), "critix_tc_cache");
}

function transcodeHash(resolved: string, audioStream: number): string {
  return createHash("sha1").update(`${resolved}:a${audioStream}`).digest("hex");
}

async function findCachedTranscode(resolved: string, audioStream: number): Promise<string | null> {
  const hash = transcodeHash(resolved, audioStream);
  const cacheFile = join(getTranscodeCacheDir(), `${hash}.mp4`);
  try {
    const [srcStat, cacheStat] = await Promise.all([
      stat(resolved),
      stat(cacheFile),
    ]);
    // Cache is valid as long as the source file hasn't been modified since the transcode.
    if (srcStat.mtimeMs <= cacheStat.mtimeMs) return cacheFile;
  } catch {
    // Either the source or the cache file doesn't exist yet.
  }
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawPath = request.nextUrl.searchParams.get("path");

  const guardResult = await resolveAndGuardPath(rawPath);
  if ("error" in guardResult) {
    return NextResponse.json({ error: guardResult.error }, { status: guardResult.status });
  }

  const { resolved } = guardResult;

  const audioStreamParam = request.nextUrl.searchParams.get("audioStream");
  const audioStream = audioStreamParam !== null && !isNaN(parseInt(audioStreamParam, 10))
    ? parseInt(audioStreamParam, 10)
    : 0;

  const durationParam = request.nextUrl.searchParams.get("durationSeconds");
  const durationSeconds = durationParam !== null && !isNaN(parseFloat(durationParam))
    ? parseFloat(durationParam)
    : undefined;

  pruneOldSessions();

  // Hoist hash so it's available for both the cache-hit path and the in-flight guard below.
  const hash = transcodeHash(resolved, audioStream);

  // ── Check persistent cache ────────────────────────────────────────────────
  // Cache key includes the audio stream index so different language selections
  // get separate transcoded files.
  const cachedPath = await findCachedTranscode(resolved, audioStream);
  if (cachedPath) {
    const sessionId = `cached${hash}`;
    setSession(sessionId, {
      process: null,
      dir: null,
      filePath: resolved,
      outputPath: cachedPath,
      startedAt: Date.now(),
      cached: true,
    });
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      sessionId,
      hlsUrl: `${origin}/api/hls/${sessionId}/video`,
    });
  }

  // ── No cache — run FFmpeg ─────────────────────────────────────────────────

  // DEF-002: If another request is already transcoding the same content, await the
  // existing FFmpeg process instead of starting a second one on the same temp file.
  const inFlight = inFlightTranscodes.get(hash);
  if (inFlight) {
    try {
      const result = await inFlight;
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Transcoding failed (shared attempt)" }, { status: 500 });
    }
  }

  const ffmpegPath = await findBinary("ffmpeg");
  if (!ffmpegPath) {
    return NextResponse.json({ error: "FFmpeg not found in PATH" }, { status: 503 });
  }

  const cacheDir = getTranscodeCacheDir();
  await mkdir(cacheDir, { recursive: true });

  // Accept a client-provided sessionId so the client can poll progress before the
  // long-running transcode completes. Fall back to server-generated UUID if not provided.
  const sessionId = request.nextUrl.searchParams.get("sessionId") || randomUUID();

  // DEF-002: Unique temp path per session — prevents two concurrent sessions (that somehow
  // bypass the in-flight guard) from writing to and corrupting the same temp file.
  const tempPath = join(cacheDir, `${hash}-${sessionId}.tmp.mp4`);
  const outputPath = join(cacheDir, `${hash}.mp4`);

  // Register in-flight before spawning FFmpeg so any concurrent request arriving
  // between now and the first await will join instead of starting a duplicate.
  let resolveInFlight!: (r: { sessionId: string; hlsUrl: string }) => void;
  let rejectInFlight!: (e: unknown) => void;
  const inFlightPromise = new Promise<{ sessionId: string; hlsUrl: string }>((res, rej) => {
    resolveInFlight = res;
    rejectInFlight = rej;
  });
  inFlightTranscodes.set(hash, inFlightPromise);

  // -map 0:v:0          → first video stream (copy, no re-encode)
  // -map 0:a:<stream>   → the user-selected audio stream only
  // -movflags +faststart → moov atom at front for immediate seeking on full-file serve
  // -progress pipe:1    → write progress stats to stdout so we can track completion %
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-progress", "pipe:1",
    "-stats_period", "2",
    "-i", resolved,
    "-map", "0:v:0",
    "-map", `0:a:${audioStream}`,
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-y",
    tempPath,
  ];

  const ffmpeg = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });

  ffmpeg.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
  });

  // Register session with dir=null so stopSession never deletes the shared cache directory.
  // The tempPath file is harmless if incomplete: it's overwritten on the next attempt via -y.
  setSession(sessionId, {
    process: ffmpeg,
    dir: null,
    filePath: resolved,
    outputPath: tempPath,
    startedAt: Date.now(),
    progress: 0,
    durationSeconds,
  });

  // Parse -progress pipe:1 output to update session progress percentage.
  // FFmpeg writes key=value lines; out_time_ms/out_time_us give elapsed microseconds.
  // DEF-009: also handle `out_time_us` (some FFmpeg builds) and tolerate `N/A` early values.
  if (ffmpeg.stdout && durationSeconds) {
    let buf = "";
    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        // out_time_ms and out_time_us are both microseconds despite the _ms suffix on one.
        const match = line.match(/^out_time_(?:ms|us)=(.+)$/);
        if (!match) continue;
        const raw = match[1].trim();
        if (raw === "N/A") continue; // FFmpeg emits N/A on the first progress frame — skip
        const val = parseInt(raw, 10);
        if (isNaN(val) || val < 0) continue;
        const elapsedSec = val / 1_000_000;
        const pct = Math.min(99, Math.round((elapsedSec / durationSeconds) * 100));
        const s = getSession(sessionId);
        if (s) setSession(sessionId, { ...s, progress: pct });
      }
    });
  }

  // Kill FFmpeg immediately if the client disconnects (user closes the player page).
  request.signal.addEventListener("abort", () => {
    const s = getSession(sessionId);
    if (s?.process) {
      try { s.process.kill("SIGTERM"); } catch {}
    }
  });

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg.on("close", (code) => {
        // DEF-004: only exit code 0 is success. code===null means signal kill (SIGTERM/SIGKILL)
        // which produces an incomplete file — must not be promoted to the persistent cache.
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code ?? "null (signal kill)"}`));
      });
      ffmpeg.on("error", reject);
    });
  } catch (err) {
    // FFmpeg was killed or failed — clean up temp file and don't write cache.
    inFlightTranscodes.delete(hash);
    rejectInFlight(err);
    import("fs/promises").then((fs) => fs.rm(tempPath, { force: true }).catch(() => undefined));
    return NextResponse.json({ error: "Transcoding interrupted or failed" }, { status: 500 });
  }

  // Check if client disconnected before FFmpeg finished.
  if (request.signal.aborted) {
    inFlightTranscodes.delete(hash);
    rejectInFlight(new Error("Client disconnected"));
    return NextResponse.json({ error: "Client disconnected" }, { status: 499 });
  }

  // DEF-002: If a concurrent session finished first, its output is already the final file.
  // In that case skip our rename but still clean up our temp.
  let finalExists = false;
  try {
    await stat(outputPath);
    finalExists = true;
  } catch { /* final doesn't exist yet */ }

  if (finalExists) {
    import("fs/promises").then((fs) => fs.rm(tempPath, { force: true }).catch(() => undefined));
  } else {
    await rename(tempPath, outputPath);
  }

  // Update session to point at the stable final path.
  setSession(sessionId, {
    process: null,
    dir: null,
    filePath: resolved,
    outputPath,
    startedAt: Date.now(),
    cached: true,
  });

  const origin = new URL(request.url).origin;
  const responsePayload = {
    sessionId,
    hlsUrl: `${origin}/api/hls/${sessionId}/video`,
  };

  // Resolve the in-flight promise so any concurrent waiter gets the result.
  resolveInFlight(responsePayload);
  inFlightTranscodes.delete(hash);

  return NextResponse.json(responsePayload);
}
