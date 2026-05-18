import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Used by the Tauri Rust backend to confirm the server is ready:
// - better-sqlite3 native addon is loaded (no longer blocking the event loop)
// - Prisma client is initialized and the database schema is applied
// Returns 200 when ready, 500 if Prisma failed to initialize.
export async function GET() {
  try {
    await prisma();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "init failed" },
      { status: 500 },
    );
  }
}
