/**
 * Watch History API Routes
 * RESTful endpoints for tracking watch progress
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/watch-history?mediaId={optional}&limit={optional}
 * Get watch history for specific media or recent watches
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const db = await prisma();

    const history = await db.watchHistory.findMany({
      where: mediaId ? { mediaId } : undefined,
      orderBy: { watchedAt: "desc" },
      take: limit,
    });

    const transformed = history.map((h) => ({
      id: h.id,
      mediaId: h.mediaId,
      mediaType: h.mediaType,
      watchedAt: h.watchedAt,
      progress: h.progress,
      completed: h.completed,
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
 * Body: { mediaId: string, mediaType: 'MOVIE' | 'SERIES', progress?: number, completed?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { mediaId, mediaType, progress, completed } = await request.json();

    if (!mediaId || !mediaType) {
      return NextResponse.json({ error: "mediaId and mediaType are required" }, { status: 400 });
    }


    console.log(`data: ${JSON.stringify({ mediaId, mediaType, progress, completed })}`);
    const db = await prisma();

    // Find existing entry
    const existing = await db.watchHistory.findFirst({
      where: { mediaId },
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
          watchedAt: new Date(),
        },
      });
    } else {
      // Create new entry
      result = await db.watchHistory.create({
        data: {
          mediaId,
          mediaType,
          progress: progress || null,
          completed: completed || false,
          watchedAt: new Date(),
        },
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to update watch history:", error);
    return NextResponse.json({ error: "Failed to update watch history" }, { status: 500 });
  }
}

/**
 * DELETE /api/watch-history?mediaId={mediaId}
 * Clear watch history for a media
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("mediaId");

    if (!mediaId) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    const db = await prisma();

    await db.watchHistory.deleteMany({
      where: { mediaId },
    });

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
