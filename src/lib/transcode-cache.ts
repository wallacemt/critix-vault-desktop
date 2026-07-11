import "server-only";
import { createHash } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { stat, rm, readdir } from "fs/promises";

export function getTranscodeCacheDir(): string {
  const dataDir = process.env.CRITIX_DATA_DIR;
  return dataDir ? join(dataDir, "transcodes") : join(tmpdir(), "critix_tc_cache");
}

export function transcodeHash(resolved: string, audioStream: number): string {
  return createHash("sha1").update(`${resolved}:a${audioStream}`).digest("hex");
}

export async function getTranscodeCacheSize(): Promise<number> {
  const dir = getTranscodeCacheDir();
  try {
    const files = await readdir(dir);
    const sizes = await Promise.all(
      files.map((f) => stat(join(dir, f)).then((s) => s.size).catch(() => 0)),
    );
    return sizes.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

// Tries audio streams 0-15 — covers virtually all multi-track files. Mirrors the
// cache-hit check in /api/hls/start (findCachedTranscode): a cache file only counts
// if it's at least as new as the source, so a re-downloaded/replaced file correctly
// reports as not-yet-transcoded.
export async function isFileTranscoded(filePath: string): Promise<boolean> {
  const dir = getTranscodeCacheDir();
  let srcMtimeMs: number;
  try {
    srcMtimeMs = (await stat(filePath)).mtimeMs;
  } catch {
    return false;
  }
  for (let audioStream = 0; audioStream < 16; audioStream++) {
    const hash = transcodeHash(filePath, audioStream);
    try {
      const cacheStat = await stat(join(dir, `${hash}.mp4`));
      if (srcMtimeMs <= cacheStat.mtimeMs) return true;
    } catch {
      // this audio stream has no cached transcode — try the next one
    }
  }
  return false;
}

// Tries audio streams 0-15 — covers virtually all multi-track files.
export async function deleteTranscodeForFile(filePath: string): Promise<void> {
  const dir = getTranscodeCacheDir();
  const hashes = Array.from({ length: 16 }, (_, i) => transcodeHash(filePath, i));
  await Promise.all(hashes.map((h) => rm(join(dir, `${h}.mp4`), { force: true }).catch(() => undefined)));
}

export async function deleteAllTranscodes(): Promise<void> {
  const dir = getTranscodeCacheDir();
  try {
    const files = await readdir(dir);
    await Promise.all(
      files.filter((f) => f.endsWith(".mp4")).map((f) => rm(join(dir, f), { force: true }).catch(() => undefined)),
    );
  } catch {
    // cache dir may not exist yet
  }
}
