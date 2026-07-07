import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../sessions";
import { sseFromSnapshot } from "@/lib/sse";

export const dynamic = "force-dynamic";

// SSE stream instead of one-shot JSON: pushes FFmpeg progress as it changes
// instead of the client re-fetching every couple seconds. If the client opens
// this right as the transcode starts, the session may not be registered yet —
// report 0 and let the next tick (500ms) pick it up once /api/hls/start sets it.
export async function GET(request: NextRequest): Promise<Response> {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  return sseFromSnapshot(
    request,
    () => {
      const session = getSession(sessionId);
      if (!session) return { progress: 0 };
      // Cached sessions (FFmpeg already done) report 100%.
      return { progress: session.cached ? 100 : (session.progress ?? 0) };
    },
    500,
  );
}
