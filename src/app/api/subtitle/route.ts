import { readFile, stat } from "fs/promises";
import { extname } from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveAndGuardPath } from "@/lib/streaming";

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawPath = request.nextUrl.searchParams.get("path");

  const guardResult = await resolveAndGuardPath(rawPath);
  if ("error" in guardResult) {
    return NextResponse.json(
      { error: guardResult.error },
      { status: guardResult.status },
    );
  }

  const { resolved } = guardResult;
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
