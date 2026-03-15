/**
 * Settings Info API Route
 * Returns storage information about the SQLite database
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "prisma", "critix.db");

    // Get DB file size
    let dbSize = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSize = stat.size;
    } catch {
      dbSize = 0;
    }

    // Get counts from DB
    const db = await prisma();
    const [folderCount, movieCount, seriesCount, watchHistoryCount, episodeCount] = await Promise.all([
      db.folder.count(),
      db.movie.count(),
      db.series.count(),
      db.watchHistory.count(),
      db.episode.count(),
    ]);

    return NextResponse.json({
      dbPath,
      dbSize,
      dataDirectory: path.dirname(dbPath),
      counts: {
        folders: folderCount,
        movies: movieCount,
        series: seriesCount,
        episodes: episodeCount,
        watchHistory: watchHistoryCount,
      },
    });
  } catch (error) {
    console.error("Failed to get settings info:", error);
    return NextResponse.json({ error: "Failed to get settings info" }, { status: 500 });
  }
}
