/**
 * DB Meta API Route
 * Returns a stable identity token for the current SQLite database instance
 * and the current watch history row count. Used by the client to detect
 * whether the database was wiped (e.g. MSIX update on Windows) and decide
 * whether to restore from the localStorage shadow cache.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await prisma();

    // Get or create the db_generation marker
    let meta = await db.meta.findUnique({ where: { key: "db_generation" } });
    if (!meta) {
      const { randomUUID } = await import("crypto");
      meta = await db.meta.create({
        data: { key: "db_generation", value: randomUUID() },
      });
    }

    const watchCount = await db.watchHistory.count();

    return NextResponse.json({ generation: meta.value, watchCount });
  } catch (error) {
    console.error("Failed to get db meta:", error);
    return NextResponse.json({ error: "Failed to get db meta" }, { status: 500 });
  }
}
