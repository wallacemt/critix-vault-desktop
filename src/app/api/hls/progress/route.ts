import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../sessions";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Cached sessions (FFmpeg already done) report 100%.
  const progress = session.cached ? 100 : (session.progress ?? 0);
  return NextResponse.json({ progress });
}
