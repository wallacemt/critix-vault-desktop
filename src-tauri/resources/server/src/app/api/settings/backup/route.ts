/**
 * Settings Backup API Route
 * Export and import database content as JSON
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function extractBackupData(rawBackup: unknown): {
  folders: unknown[];
  movies: unknown[];
  series: unknown[];
  watchHistory: unknown[];
  userActions: unknown[];
} | null {
  if (!rawBackup || typeof rawBackup !== "object") {
    return null;
  }

  const backupObj = rawBackup as Record<string, unknown>;
  const data =
    backupObj.data && typeof backupObj.data === "object" ? (backupObj.data as Record<string, unknown>) : backupObj;

  const hasAnyCollection = ["folders", "movies", "series", "watchHistory", "userActions", "userActionHistory"].some(
    (key) => Array.isArray(data[key]),
  );
  if (!hasAnyCollection) {
    return null;
  }

  return {
    folders: Array.isArray(data.folders) ? (data.folders as unknown[]) : [],
    movies: Array.isArray(data.movies) ? (data.movies as unknown[]) : [],
    series: Array.isArray(data.series) ? (data.series as unknown[]) : [],
    watchHistory: Array.isArray(data.watchHistory) ? (data.watchHistory as unknown[]) : [],
    userActions: Array.isArray(data.userActions)
      ? (data.userActions as unknown[])
      : Array.isArray(data.userActionHistory)
        ? (data.userActionHistory as unknown[])
        : [],
  };
}

/**
 * GET /api/settings/backup
 * Export all data as JSON
 */
export async function GET() {
  try {
    const db = await prisma();

    const [folders, movies, series, watchHistory, userActions] = await Promise.all([
      db.folder.findMany(),
      db.movie.findMany(),
      db.series.findMany({
        include: { seasons: { include: { episodes: true } } },
      }),
      db.watchHistory.findMany(),
      db.userActionHistory.findMany(),
    ]);

    const backup = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      data: {
        folders,
        movies,
        series,
        watchHistory,
        userActions,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error("Failed to export data:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}

/**
 * POST /api/settings/backup
 * Import/restore data from JSON backup
 */
export async function POST(request: NextRequest) {
  try {
    const backup = await request.json();
    const parsed = extractBackupData(backup);

    if (!parsed) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    const db = await prisma();
    const folders = parsed.folders as Array<Record<string, any>>;
    const movies = parsed.movies as Array<Record<string, any>>;
    const series = parsed.series as Array<Record<string, any>>;
    const watchHistory = parsed.watchHistory as Array<Record<string, any>>;
    const userActions = parsed.userActions as Array<Record<string, any>>;

    const summary = {
      folders: { processed: folders.length, restored: 0 },
      movies: { processed: movies.length, restored: 0, skipped: [] as Array<{ id: string; reason: string }> },
      series: { processed: series.length, restored: 0, skipped: [] as Array<{ id: string; reason: string }> },
      watchHistory: {
        processed: watchHistory.length,
        restored: 0,
        skipped: [] as Array<{ id: string; reason: string }>,
      },
      userActions: {
        processed: userActions.length,
        restored: 0,
        skipped: [] as Array<{ id: string; reason: string }>,
      },
    };

    await db.$transaction(async (tx) => {
      // Restore folders first (required for foreign keys)
      for (const folder of folders) {
        await tx.folder.upsert({
          where: { id: folder.id },
          create: {
            id: folder.id,
            name: folder.name,
            path: folder.path,
            mediaCount: folder.mediaCount ?? 0,
            addedAt: folder.addedAt ? new Date(folder.addedAt) : new Date(),
          },
          update: {
            name: folder.name,
            path: folder.path,
            mediaCount: folder.mediaCount ?? 0,
          },
        });
        summary.folders.restored += 1;
      }

      const existingFolders = await tx.folder.findMany({ select: { id: true } });
      const folderIdSet = new Set(existingFolders.map((folder) => folder.id));

      for (const movie of movies) {
        if (!movie.folderId || !folderIdSet.has(movie.folderId)) {
          summary.movies.skipped.push({ id: movie.id, reason: "Missing referenced folder" });
          continue;
        }

        await tx.movie.upsert({
          where: { id: movie.id },
          create: {
            id: movie.id,
            title: movie.title,
            originalTitle: movie.originalTitle,
            overview: movie.overview,
            poster: movie.poster,
            backdrop: movie.backdrop,
            rating: movie.rating,
            year: movie.year,
            releaseDate: movie.releaseDate,
            status: movie.status || "UNMATCHED",
            type: movie.type || "MOVIE",
            filePath: movie.filePath || "",
            duration: movie.duration,
            trailer: movie.trailer,
            folderId: movie.folderId,
          },
          update: { title: movie.title, status: movie.status },
        });
        summary.movies.restored += 1;
      }

      for (const s of series) {
        if (!s.folderId || !folderIdSet.has(s.folderId)) {
          summary.series.skipped.push({ id: s.id, reason: "Missing referenced folder" });
          continue;
        }

        await tx.series.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            title: s.title,
            originalTitle: s.originalTitle,
            overview: s.overview,
            poster: s.poster,
            backdrop: s.backdrop,
            rating: s.rating,
            year: s.year,
            status: s.status || "UNMATCHED",
            type: s.type || "SERIES",
            filePath: s.filePath || "",
            folderId: s.folderId,
            numberOfSeasons: s.numberOfSeasons || 0,
            numberOfEpisodes: s.numberOfEpisodes || 0,
          },
          update: { title: s.title, status: s.status },
        });
        summary.series.restored += 1;
      }

      for (const entry of watchHistory) {
        if (!entry.id) {
          summary.watchHistory.skipped.push({ id: "unknown", reason: "Missing id" });
          continue;
        }

        await tx.watchHistory.upsert({
          where: { id: entry.id },
          create: {
            id: entry.id,
            mediaId: entry.mediaId ?? null,
            mediaType: entry.mediaType || "MOVIE",
            episodeId: entry.episodeId ?? null,
            seasonNumber: entry.seasonNumber ?? null,
            episodeNumber: entry.episodeNumber ?? null,
            watchedAt: entry.watchedAt ? new Date(entry.watchedAt) : new Date(),
            progress: entry.progress ?? null,
            completed: Boolean(entry.completed),
          },
          update: {
            mediaId: entry.mediaId ?? null,
            mediaType: entry.mediaType || "MOVIE",
            episodeId: entry.episodeId ?? null,
            seasonNumber: entry.seasonNumber ?? null,
            episodeNumber: entry.episodeNumber ?? null,
            watchedAt: entry.watchedAt ? new Date(entry.watchedAt) : new Date(),
            progress: entry.progress ?? null,
            completed: Boolean(entry.completed),
          },
        });

        summary.watchHistory.restored += 1;
      }

      for (const action of userActions) {
        if (!action.id) {
          summary.userActions.skipped.push({ id: "unknown", reason: "Missing id" });
          continue;
        }

        await tx.userActionHistory.upsert({
          where: { id: action.id },
          create: {
            id: action.id,
            actionType: action.actionType || "TAB_VIEW",
            folderId: action.folderId ?? null,
            mediaId: action.mediaId ?? null,
            mediaType: action.mediaType ?? null,
            timestamp: action.timestamp ? new Date(action.timestamp) : new Date(),
          },
          update: {
            actionType: action.actionType || "TAB_VIEW",
            folderId: action.folderId ?? null,
            mediaId: action.mediaId ?? null,
            mediaType: action.mediaType ?? null,
            timestamp: action.timestamp ? new Date(action.timestamp) : new Date(),
          },
        });

        summary.userActions.restored += 1;
      }
    });

    return NextResponse.json({
      message: "Data imported successfully",
      summary,
    });
  } catch (error) {
    console.error("Failed to import data:", error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/backup
 * Clear all app data
 */
export async function DELETE() {
  try {
    const db = await prisma();

    // Delete in order to respect foreign key constraints
    await db.userActionHistory.deleteMany();
    await db.watchHistory.deleteMany();
    // Episodes and seasons cascade from series
    await db.series.deleteMany();
    await db.movie.deleteMany();
    await db.folder.deleteMany();

    return NextResponse.json({ message: "All data cleared successfully" });
  } catch (error) {
    console.error("Failed to clear data:", error);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
