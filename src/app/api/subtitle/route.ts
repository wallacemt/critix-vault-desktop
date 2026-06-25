import { readFile, stat } from "fs/promises";
import { extname } from "path";
import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { resolveAndGuardPath } from "@/lib/streaming";
import { findBinary } from "@/lib/find-binary";

// Allowlist of subtitle extensions (LSF-2026-003 — prevents serving arbitrary files)
const ALLOWED_SUBTITLE_EXTS = new Set([".srt", ".vtt"]);
// 5 MB is more than enough for any subtitle file (LSF-2026-003 — prevents heap exhaustion)
const SUBTITLE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Converts SRT subtitle content to WebVTT format.
 *
 * The only structural difference between the two formats is:
 *  1. VTT requires a "WEBVTT" header line.
 *  2. SRT uses a comma as the millisecond separator in timestamps ("00:00:00,000"),
 *     while VTT uses a dot ("00:00:00.000").
 *
 * Cue numbers and text content pass through unchanged.
 */
function srtToVtt(srtContent: string): string {
  const converted = srtContent
    // Replace comma-separated milliseconds in timestamps only.
    // The regex targets the exact SRT timestamp pattern to avoid clobbering
    // commas that appear in subtitle text.
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  return `WEBVTT\n\n${converted.trimStart()}`;
}

/** Extract an embedded subtitle stream from a media file to WebVTT via ffmpeg. */
async function extractEmbeddedSubtitle(
  filePath: string,
  relativeIndex: number,
): Promise<NextResponse> {
  const ffmpegPath = await findBinary("ffmpeg");
  if (!ffmpegPath) {
    return NextResponse.json({ error: "ffmpeg not found" }, { status: 503 });
  }

  return new Promise<NextResponse>((resolve) => {
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-i", filePath,
      "-map", `0:s:${relativeIndex}`,
      "-f", "webvtt",
      "pipe:1",
    ];

    const chunks: Buffer[] = [];
    const ffmpeg = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });

    ffmpeg.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));

    ffmpeg.on("close", (code) => {
      if (code !== 0 && code !== null) {
        resolve(NextResponse.json({ error: "Subtitle extraction failed" }, { status: 500 }));
        return;
      }
      const vtt = Buffer.concat(chunks).toString("utf-8");
      resolve(
        new NextResponse(vtt, {
          status: 200,
          headers: { "Content-Type": "text/vtt; charset=utf-8" },
        }),
      );
    });

    ffmpeg.on("error", () => {
      resolve(NextResponse.json({ error: "ffmpeg spawn failed" }, { status: 500 }));
    });
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawPath = request.nextUrl.searchParams.get("path");
  const streamParam = request.nextUrl.searchParams.get("stream");

  const guardResult = await resolveAndGuardPath(rawPath);
  if ("error" in guardResult) {
    return NextResponse.json(
      { error: guardResult.error },
      { status: guardResult.status },
    );
  }

  const { resolved } = guardResult;

  // ── Embedded subtitle extraction mode ─────────────────────────────────────
  if (streamParam !== null) {
    const relativeIndex = parseInt(streamParam, 10);
    if (!Number.isInteger(relativeIndex) || relativeIndex < 0) {
      return NextResponse.json({ error: "Invalid stream index" }, { status: 400 });
    }
    return extractEmbeddedSubtitle(resolved, relativeIndex);
  }

  // ── Sidecar file mode (original behaviour) ────────────────────────────────
  const ext = extname(resolved).toLowerCase();

  if (!ALLOWED_SUBTITLE_EXTS.has(ext)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  let fileSize: number;
  try {
    const fileStat = await stat(resolved);
    fileSize = fileStat.size;
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (fileSize > SUBTITLE_MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const content = await readFile(resolved, "utf-8");
  const vttContent = ext === ".srt" ? srtToVtt(content) : content;

  return new NextResponse(vttContent, {
    status: 200,
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
    },
  });
}
