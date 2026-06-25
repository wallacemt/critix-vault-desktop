import { NextRequest, NextResponse } from "next/server";
import { createReadStream, stat } from "fs";
import { join } from "path";
import { getSession } from "../../sessions";

const MAX_WAIT_MS = 15_000; // max time to wait for a segment to appear
const POLL_INTERVAL_MS = 100;

/** Waits for a file to appear on disk (FFmpeg writes segments asynchronously). */
async function waitForFile(filePath: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const exists = await new Promise<boolean>((resolve) =>
      stat(filePath, (err) => resolve(!err)),
    );
    if (exists) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

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
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; file: string[] }> },
): Promise<NextResponse> {
  const { sessionId, file } = await params;
  const filename = file.join("/");

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.dir) {
    return NextResponse.json({ error: "Session has no segment directory" }, { status: 404 });
  }

  const filePath = join(session.dir, filename);
  const isPlaylist = filename.endsWith(".m3u8");
  const isSegment = filename.endsWith(".ts");

  if (!isPlaylist && !isSegment) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const appeared = await waitForFile(filePath, MAX_WAIT_MS);
  if (!appeared) {
    return NextResponse.json(
      { error: "Segment not ready — FFmpeg may still be starting" },
      { status: 503 },
    );
  }

  const contentType = isPlaylist
    ? "application/vnd.apple.mpegurl"
    : "video/mp2t";

  const stream = nodeStreamToWeb(createReadStream(filePath));

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Playlists change as FFmpeg appends segments; disable client caching.
      "Cache-Control": isPlaylist ? "no-cache, no-store" : "public, max-age=31536000",
    },
  });
}
