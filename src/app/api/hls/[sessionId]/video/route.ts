import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { getSession, setSession } from "../../sessions";
import { getTranscodeCacheDir } from "@/lib/transcode-cache";

function nodeStreamToWeb(
  readable: ReturnType<typeof createReadStream>,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      readable.on("data", (chunk) =>
        controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk),
      );
      readable.on("end", () => controller.close());
      readable.on("error", (err) => controller.error(err));
    },
    cancel() { readable.destroy(); },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const { sessionId } = await params;

  let session = getSession(sessionId);

  // Resilience: if the session was lost (e.g. server process restart) but the sessionId
  // is a known-cache pattern ("cached" + sha1-hex), reconstruct it from the cache dir.
  // This avoids a 404 → playerError overlay for files that are actually on disk.
  if (!session && sessionId.startsWith("cached") && /^cached[0-9a-f]{40}$/.test(sessionId)) {
    const hash = sessionId.slice(6);
    const outputPath = join(getTranscodeCacheDir(), `${hash}.mp4`);
    try {
      await stat(outputPath);
      // File exists — recreate the in-memory session so subsequent requests also work.
      setSession(sessionId, { process: null, dir: null, filePath: "", outputPath, startedAt: Date.now(), cached: true });
      session = getSession(sessionId)!;
      console.log(`[hls/video] Reconstructed lost cached session ${sessionId}`);
    } catch {
      // File not on disk either — genuine 404.
    }
  }

  if (!session) {
    console.error(`[hls/video] Session not found: ${sessionId}`);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { outputPath } = session;

  let fileSize: number;
  try {
    const info = await stat(outputPath);
    fileSize = info.size;
  } catch (err) {
    console.error(`[hls/video] File not found at ${outputPath}:`, err);
    return NextResponse.json({ error: "Transcoded file not ready" }, { status: 503 });
  }

  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    // Parse "bytes=start-end" (end is optional)
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    const rawStart = match?.[1] ? Number(match[1]) : 0;
    const rawEnd   = match?.[2] ? Number(match[2]) : fileSize - 1;

    const start = Math.max(0, rawStart);
    const end   = Math.min(fileSize - 1, rawEnd);

    if (start > end || start >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const stream = createReadStream(outputPath, { start, end });

    return new NextResponse(nodeStreamToWeb(stream), {
      status: 206,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Full file response (no Range header)
  const stream = createReadStream(outputPath);
  return new NextResponse(nodeStreamToWeb(stream), {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
