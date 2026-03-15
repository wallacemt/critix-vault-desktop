/**
 * Settings Info API Route
 * Returns storage information about the SQLite database
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getDatabaseFilePath } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPath = getDatabaseFilePath();

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

    return successResponse({
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
    logger.error("Failed to get settings info", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to get settings info");
  }
}
