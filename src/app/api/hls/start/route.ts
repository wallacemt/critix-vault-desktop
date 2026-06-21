import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { mkdir, rename, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID, createHash } from "crypto";
import { resolveAndGuardPath } from "@/lib/streaming";
import { findBinary } from "@/lib/find-binary";
import { setSession, pruneOldSessions } from "../sessions";

// Allow up to 10 minutes for transcoding large files.
// (Only relevant in serverless deploys; local Tauri server has no hard limit.)
export const maxDuration = 600;

function getTranscodeCacheDir(): string {
  const dataDir = process.env.CRITIX_DATA_DIR;
  return dataDir ? join(dataDir, "transcodes") : join(tmpdir(), "critix_tc_cache");
}

async function findCachedTranscode(resolved: string): Promise<string | null> {
  const hash = createHash("sha1").update(resolved).digest("hex");
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

  pruneOldSessions();

  // ── Check persistent cache ────────────────────────────────────────────────
  const cachedPath = await findCachedTranscode(resolved);
  if (cachedPath) {
    // Use a stable session ID derived from the hash so repeated requests hit the same entry.
    const hash = createHash("sha1").update(resolved).digest("hex");
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
  const ffmpegPath = await findBinary("ffmpeg");
  if (!ffmpegPath) {
    return NextResponse.json({ error: "FFmpeg not found in PATH" }, { status: 503 });
  }

  const cacheDir = getTranscodeCacheDir();
  await mkdir(cacheDir, { recursive: true });

  const hash = createHash("sha1").update(resolved).digest("hex");
  const sessionId = randomUUID();

  // Write to a temp file first; rename to cache on success (avoids partial cache files).
  const tempPath = join(cacheDir, `${hash}.tmp.mp4`);
  const outputPath = join(cacheDir, `${hash}.mp4`);

  // -map 0:v:0  → first video stream (copy, no re-encode)
  // -map 0:a    → ALL audio streams (transcoded to AAC so every language track survives)
  // -movflags +faststart → moov atom at front for immediate seeking on full-file serve
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-i", resolved,
    "-map", "0:v:0",
    "-map", "0:a",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-y",
    tempPath,
  ];

  const ffmpeg = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });

  ffmpeg.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
  });

  // Register session immediately so cleanup works even if the client navigates away.
  setSession(sessionId, {
    process: ffmpeg,
    dir: cacheDir,    // used for cleanup only if !cached
    filePath: resolved,
    outputPath: tempPath,
    startedAt: Date.now(),
  });

  await new Promise<void>((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
    ffmpeg.on("error", reject);
  });

  // Rename temp → final cache file; update session to point at the stable path.
  await rename(tempPath, outputPath);
  setSession(sessionId, {
    process: null,
    dir: null,
    filePath: resolved,
    outputPath,
    startedAt: Date.now(),
    cached: true,
  });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    sessionId,
    hlsUrl: `${origin}/api/hls/${encodeURIComponent(sessionId)}/video`,
  });
}
