/**
 * Settings Backup API Route
 * Export and import database content as JSON
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    if (!backup?.data) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    const db = await prisma();
    const { folders, movies, series } = backup.data;

    // Restore folders first (required for foreign keys)
    if (folders?.length) {
      for (const folder of folders) {
        await db.folder.upsert({
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
      }
    }

    // Restore movies
    if (movies?.length) {
      for (const movie of movies) {
        try {
          await db.movie.upsert({
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
        } catch {
          // Skip if folder doesn't exist
        }
      }
    }

    // Restore series
    if (series?.length) {
      for (const s of series) {
        try {
          await db.series.upsert({
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
        } catch {
          // Skip if folder doesn't exist
        }
      }
    }

    return NextResponse.json({ message: "Data imported successfully" });
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
