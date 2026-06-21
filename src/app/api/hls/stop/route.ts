import { NextRequest, NextResponse } from "next/server";
import { stopSession } from "../sessions";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { sessionId } = (await request.json()) as { sessionId?: string };

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  await stopSession(sessionId);
  return NextResponse.json({ ok: true });
}
