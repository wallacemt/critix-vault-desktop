import { NextRequest, NextResponse } from "next/server";
import { getTranscodeCacheSize, deleteTranscodeForFile, deleteAllTranscodes } from "@/lib/transcode-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const size = await getTranscodeCacheSize();
  return NextResponse.json({ size });
}

export async function DELETE(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (path) {
    await deleteTranscodeForFile(path);
  } else {
    await deleteAllTranscodes();
  }
  return NextResponse.json({ ok: true });
}
