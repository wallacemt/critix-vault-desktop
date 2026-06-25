import { execFile } from "child_process";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { resolveAndGuardPath } from "@/lib/streaming";
import { findBinary } from "@/lib/find-binary";

const execFileAsync = promisify(execFile);

// Codecs that Chromium/WebView2 cannot decode natively (no built-in support).
const UNSUPPORTED_CODECS = new Set([
  "dts",
  "ac3",
  "eac3",
  "truehd",
  "mlp",
  "aac_latm",
  "wmapro",
  "wma",
  "wmalossless",
  "mp1",
  "mp2",
]);

// Container extensions that might embed unsupported codecs.
const AT_RISK_EXTS = new Set([".mkv", ".avi", ".mov", ".ts", ".m2ts"]);

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

// In-memory probe cache — codecs don't change while the app is running.
const g = globalThis as unknown as { _probeCache?: Map<string, AudioProbeResult> };
if (!g._probeCache) g._probeCache = new Map();
const probeCache: Map<string, AudioProbeResult> = g._probeCache;

const SAFE_RESULT = (available: boolean): AudioProbeResult => ({
  audioCodec: null,
  needsTranscode: false,
  ffprobeAvailable: available,
  subtitleStreams: [],
  audioStreams: [],
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawPath = request.nextUrl.searchParams.get("path");

  const guardResult = await resolveAndGuardPath(rawPath);
  if ("error" in guardResult) {
    return NextResponse.json({ error: guardResult.error }, { status: guardResult.status });
  }

  const { resolved } = guardResult;

  // Skip probing for containers that are always web-compatible.
  const ext = resolved.slice(resolved.lastIndexOf(".")).toLowerCase();
  if (!AT_RISK_EXTS.has(ext)) {
    return NextResponse.json(SAFE_RESULT(false));
  }

  // Return cached result if available.
  const cached = probeCache.get(resolved);
  if (cached) return NextResponse.json(cached);

  const ffprobePath = await findBinary("ffprobe");
  if (!ffprobePath) {
    console.error("[probe] ffprobe not found — install FFmpeg and restart the app");
    return NextResponse.json(SAFE_RESULT(false));
  }

  // One call to get all streams (audio + subtitles).
  const ffprobeArgs = [
    "-v", "quiet",
    "-print_format", "json",
    "-show_streams",
    resolved,
  ];

  try {
    const { stdout } = await execFileAsync(ffprobePath, ffprobeArgs, { timeout: 12_000 });
    const info = JSON.parse(stdout) as {
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        channels?: number;
        tags?: { language?: string; title?: string };
      }>;
    };

    const allStreams = info.streams ?? [];

    // Audio streams: all are returned for UI; per-stream needsTranscode flag drives selection.
    let audioRelIndex = 0;
    const audioStreams: AudioStreamInfo[] = [];
    for (const s of allStreams) {
      if (s.codec_type !== "audio") continue;
      const codec = s.codec_name ?? "unknown";
      audioStreams.push({
        relativeIndex: audioRelIndex++,
        codec,
        language: s.tags?.language ?? null,
        title: s.tags?.title ?? null,
        channels: s.channels ?? 2,
        needsTranscode: UNSUPPORTED_CODECS.has(codec.toLowerCase()),
      });
    }

    const firstAudioCodec = audioStreams[0]?.codec ?? null;
    // True if ANY audio stream uses an unsupported codec — not just stream 0.
    // This ensures multi-track files with mixed codecs (e.g. eng-aac + por-ac3) still
    // show the audio-selection modal and transcode the user's chosen track.
    const needsTranscode = audioStreams.some((s) => UNSUPPORTED_CODECS.has(s.codec.toLowerCase()));

    // Subtitle streams: skip image-based formats that can't be converted to VTT.
    let subtitleRelIndex = 0;
    const subtitleStreams: SubtitleStreamInfo[] = [];
    for (const s of allStreams) {
      if (s.codec_type !== "subtitle") continue;
      const codec = s.codec_name?.toLowerCase() ?? "";
      if (codec === "hdmv_pgs_subtitle" || codec === "dvd_subtitle" || codec === "dvbsub") {
        subtitleRelIndex++;
        continue;
      }
      subtitleStreams.push({
        relativeIndex: subtitleRelIndex++,
        codec: s.codec_name ?? "unknown",
        language: s.tags?.language ?? null,
        title: s.tags?.title ?? null,
      });
    }

    console.log(
      `[probe] ${resolved} → codec=${firstAudioCodec} needsTranscode=${needsTranscode} ` +
      `audio=${audioStreams.length} subs=${subtitleStreams.length}`,
    );

    const result: AudioProbeResult = {
      audioCodec: firstAudioCodec,
      needsTranscode,
      ffprobeAvailable: true,
      subtitleStreams,
      audioStreams,
    };

    probeCache.set(resolved, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[probe] ffprobe execution failed:", err);
    return NextResponse.json(SAFE_RESULT(false));
  }
}
