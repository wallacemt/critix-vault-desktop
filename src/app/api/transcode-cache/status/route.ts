import { NextRequest, NextResponse } from "next/server";
import { resolveAndGuardPath } from "@/lib/streaming";
import { isFileTranscoded } from "@/lib/transcode-cache";

export const dynamic = "force-dynamic";

/**
 * Batch-checks which of the given file paths already have a completed,
 * up-to-date audio transcode in the persistent cache. Used to render the
 * "audio ready" badge on episode/movie cards without opening the player.
 * Keyed by the raw input path (not the resolved one) so callers can match
 * results back against their own Episode/Movie objects directly.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as { paths?: unknown } | null;
  const paths = Array.isArray(body?.paths) ? body!.paths.filter((p): p is string => typeof p === "string") : null;

  if (!paths) {
    return NextResponse.json({ error: "Missing paths array" }, { status: 400 });
  }

  const statuses: Record<string, boolean> = {};

  await Promise.all(
    paths.map(async (rawPath) => {
      const guardResult = await resolveAndGuardPath(rawPath);
      statuses[rawPath] = "error" in guardResult ? false : await isFileTranscoded(guardResult.resolved);
    }),
  );

  return NextResponse.json({ statuses });
}
