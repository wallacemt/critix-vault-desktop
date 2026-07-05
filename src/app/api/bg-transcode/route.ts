import { NextRequest, NextResponse } from "next/server";
import { getQueueStatus, startQueue, stopQueue } from "./queue";

export async function GET() {
  return NextResponse.json(getQueueStatus());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { paths?: string[] };
  const paths = Array.isArray(body.paths) ? body.paths : [];
  // See getRequestOrigin() in hls/start/route.ts: Next's standalone server has
  // trustHostHeader:false, so request.url's derived origin is hardcoded to
  // "localhost" regardless of the real Host header — use the raw header instead.
  const origin = `http://${request.headers.get("host") ?? new URL(request.url).host}`;
  startQueue(paths, origin);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  stopQueue();
  return NextResponse.json({ ok: true });
}
