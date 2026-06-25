import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { getSession } from "../../sessions";

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

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { outputPath } = session;

  let fileSize: number;
  try {
    const info = await stat(outputPath);
    fileSize = info.size;
  } catch {
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
