import { createReadStream, stat } from "fs";
import { extname } from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveAndGuardPath } from "@/lib/streaming";

// Browser-compatible MIME types for the <video> element.
// Non-web-native containers (.mkv, .avi, .mov) are mapped to "video/mp4" so
// that Chromium/WebView2 accepts the stream via canPlayType. The actual bytes
// are still the original container; Chromium byte-sniffs the EBML/AVI header
// and selects the correct demuxer regardless of the declared type.
const MIME_TYPES: Record<string, string> = {
  ".mkv": "video/mp4",
  ".mp4": "video/mp4",
  ".avi": "video/mp4",
  ".mov": "video/mp4",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
};

function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? "video/octet-stream";
}

/** Wraps `fs.stat` in a Promise. Returns null if the file does not exist. */
function statFile(filePath: string): Promise<{ size: number } | null> {
  return new Promise((resolve) => {
    stat(filePath, (err, stats) => {
      if (err) {
        resolve(null);
      } else {
        resolve({ size: stats.size });
      }
    });
  });
}

/**
 * Pipes a Node.js ReadStream into a Web ReadableStream so it can be used
 * as a Next.js Response body.
 */
function nodeStreamToWebStream(
  nodeStream: ReturnType<typeof createReadStream>,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(
          typeof chunk === "string" ? Buffer.from(chunk) : chunk,
        );
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
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
  const fileMeta = await statFile(resolved);
  if (!fileMeta) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const contentType = getContentType(resolved);
  const totalSize = fileMeta.size;
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    // Multi-range requests (DEF-034) — not supported; browsers never send them
    // for <video> and serving them requires multipart/byteranges bodies.
    if (rangeHeader.includes(",")) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    // Parse "bytes=START-END" or "bytes=-N" (RFC 7233 suffix range).
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");

    let start: number;
    let end: number;

    if (startStr === "" && endStr) {
      // Suffix range: bytes=-N → last N bytes (DEF-033)
      const suffixLen = parseInt(endStr, 10);
      if (!Number.isInteger(suffixLen) || suffixLen <= 0) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${totalSize}` },
        });
      }
      start = Math.max(0, totalSize - suffixLen);
      end = totalSize - 1;
    } else {
      start = parseInt(startStr, 10);
      end = endStr ? parseInt(endStr, 10) : totalSize - 1;
    }

    // Validate parsed values before passing to createReadStream (LSF-2026-002).
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end < start ||
      end >= totalSize
    ) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    const chunkSize = end - start + 1;

    const nodeStream = createReadStream(resolved, { start, end });
    const body = nodeStreamToWebStream(nodeStream);

    return new NextResponse(body, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
      },
    });
  }

  // No Range header — stream the whole file.
  const nodeStream = createReadStream(resolved);
  const body = nodeStreamToWebStream(nodeStream);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
    },
  });
}
