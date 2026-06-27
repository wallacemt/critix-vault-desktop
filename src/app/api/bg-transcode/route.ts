import { NextRequest, NextResponse } from "next/server";
import { getQueueStatus, startQueue, stopQueue } from "./queue";

export async function GET() {
  return NextResponse.json(getQueueStatus());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { paths?: string[] };
  const paths = Array.isArray(body.paths) ? body.paths : [];
  const origin = new URL(request.url).origin;
  startQueue(paths, origin);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  stopQueue();
  return NextResponse.json({ ok: true });
}
