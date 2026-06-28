/**
 * Watch History API Routes
 * RESTful endpoints for tracking watch progress
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { deleteTranscodeForFile } from "@/lib/transcode-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/watch-history?mediaId={optional}&episodeId={optional}&limit={optional}
 * Get watch history for specific media, episode, or recent watches
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");
    const episodeId = searchParams.get("episodeId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const db = await prisma();

    // Build where clause based on parameters
    const where: any = {};
    if (episodeId) {
      where.episodeId = episodeId;
    } else if (mediaId) {
      where.mediaId = mediaId;
    }

    const history = await db.watchHistory.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { watchedAt: "desc" },
      take: limit,
    });

    const transformed = history.map((h) => ({
      id: h.id,
      mediaId: h.mediaId,
      mediaType: h.mediaType,
      episodeId: h.episodeId,
      seasonNumber: h.seasonNumber,
      episodeNumber: h.episodeNumber,
      watchedAt: h.watchedAt,
      progress: h.progress,
      completed: h.completed,
      positionSeconds: h.positionSeconds,
      durationSeconds: h.durationSeconds,
    }));

    return NextResponse.json(transformed, { status: 200 });
  } catch (error) {
    console.error("Failed to get watch history:", error);
    return NextResponse.json({ error: "Failed to get watch history" }, { status: 500 });
  }
}

/**
 * POST /api/watch-history
 * Add or update watch history
 * Body: { mediaId: string, mediaType: 'MOVIE' | 'SERIES', episodeId?: string, seasonNumber?: number, episodeNumber?: number, progress?: number, completed?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { mediaId, mediaType, episodeId, seasonNumber, episodeNumber, progress, completed, positionSeconds, durationSeconds } = await request.json();

    const normalizedEpisodeId =
      episodeId === undefined || episodeId === null || episodeId === "" ? null : String(episodeId);

    const normalizedSeasonNumber =
      seasonNumber === undefined || seasonNumber === null || seasonNumber === "" ? null : Number(seasonNumber);

    const normalizedEpisodeNumber =
      episodeNumber === undefined || episodeNumber === null || episodeNumber === "" ? null : Number(episodeNumber);

    if (!mediaId || !mediaType) {
      return NextResponse.json({ error: "mediaId and mediaType are required" }, { status: 400 });
    }

    const db = await prisma();

    if (normalizedEpisodeId && (normalizedSeasonNumber == null || normalizedEpisodeNumber == null)) {
      return NextResponse.json(
        { error: "seasonNumber and episodeNumber are required when episodeId is provided" },
        { status: 400 },
      );
    }

    if (normalizedEpisodeId && (Number.isNaN(normalizedSeasonNumber) || Number.isNaN(normalizedEpisodeNumber))) {
      return NextResponse.json(
        { error: "seasonNumber and episodeNumber must be valid numbers when episodeId is provided" },
        { status: 400 },
      );
    }

    if (!normalizedEpisodeId && mediaType !== "MOVIE") {
      return NextResponse.json({ error: "Series/anime watch updates must include episodeId" }, { status: 400 });
    }

    // Find existing entry
    // For episodes, match by episodeId; for movies, match by mediaId + mediaType
    const whereClause = normalizedEpisodeId
      ? { episodeId: normalizedEpisodeId }
      : { mediaId, mediaType: "MOVIE", episodeId: null };

    const existing = await db.watchHistory.findFirst({
      where: whereClause,
      orderBy: { watchedAt: "desc" },
    });

    let result;

    if (existing) {
      // Update existing entry
      result = await db.watchHistory.update({
        where: { id: existing.id },
        data: {
          progress: progress ?? existing.progress,
          completed: completed ?? (progress && progress >= 100) ?? existing.completed,
          positionSeconds: positionSeconds ?? existing.positionSeconds,
          durationSeconds: durationSeconds ?? existing.durationSeconds,
          watchedAt: new Date(),
        },
      });
    } else {
      // Create new entry
      result = await db.watchHistory.create({
        data: {
          mediaId,
          mediaType,
          episodeId: normalizedEpisodeId,
          seasonNumber: normalizedEpisodeId ? normalizedSeasonNumber : null,
          episodeNumber: normalizedEpisodeId ? normalizedEpisodeNumber : null,
          progress: progress || null,
          completed: completed || false,
          positionSeconds: positionSeconds ?? null,
          durationSeconds: durationSeconds ?? null,
          watchedAt: new Date(),
        },
      });
    }

    // Auto-delete transcode cache when media is marked as completed.
    if (completed) {
      const db2 = await prisma();
      let filePath: string | null | undefined;
      if (mediaType === "MOVIE") {
        const movie = await db2.movie.findUnique({ where: { id: mediaId }, select: { filePath: true } });
        filePath = movie?.filePath;
      } else if (normalizedEpisodeId) {
        const episode = await db2.episode.findUnique({ where: { id: normalizedEpisodeId }, select: { filePath: true } });
        filePath = episode?.filePath;
      }
      if (filePath) deleteTranscodeForFile(filePath).catch(() => undefined);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to update watch history:", error);
    return NextResponse.json({ error: "Failed to update watch history" }, { status: 500 });
  }
}

/**
 * DELETE /api/watch-history?mediaId={mediaId}&episodeId={optional}
 * Clear watch history for a media or specific episode
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");
    const episodeId = searchParams.get("episodeId");

    if (!mediaId && !episodeId) {
      return NextResponse.json({ error: "mediaId or episodeId is required" }, { status: 400 });
    }

    const db = await prisma();

    // Delete by episodeId if provided, otherwise by mediaId
    if (episodeId) {
      await db.watchHistory.deleteMany({
        where: { episodeId },
      });
    } else if (mediaId) {
      await db.watchHistory.deleteMany({
        where: { mediaId },
      });
    }

    return NextResponse.json({ message: "Watch history cleared successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to clear watch history:", error);
    return NextResponse.json({ error: "Failed to clear watch history" }, { status: 500 });
  }
}

/**
 * GET /api/watch-history/recent
 * Get recently watched media
 */
export async function getRecentlyWatched() {
  try {
    const db = await prisma();

    const history = await db.watchHistory.findMany({
      where: { completed: true },
      orderBy: { watchedAt: "desc" },
      take: 10,
      distinct: ["mediaId"],
    });

    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    console.error("Failed to get recently watched:", error);
    return NextResponse.json({ error: "Failed to get recently watched" }, { status: 500 });
  }
}
