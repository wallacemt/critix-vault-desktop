/**
 * User Action History API Routes
 * RESTful endpoints for tracking user navigation history
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/user-actions?actionType={FOLDER_VIEW|MOVIE_VIEW|SERIES_VIEW}
 * Get last viewed item of a specific type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionType = searchParams.get("actionType");

    if (!actionType) {
      return NextResponse.json({ error: "actionType is required" }, { status: 400 });
    }

    const db = await prisma();

    const lastAction = await db.userActionHistory.findFirst({
      where: {
        actionType: actionType,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (!lastAction) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(
      {
        id: lastAction.id,
        actionType: lastAction.actionType,
        folderId: lastAction.folderId,
        mediaId: lastAction.mediaId,
        mediaType: lastAction.mediaType,
        timestamp: lastAction.timestamp,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to get user action:", error);
    return NextResponse.json({ error: "Failed to get user action" }, { status: 500 });
  }
}

/**
 * POST /api/user-actions
 * Save a user action
 * Body: { actionType: string, folderId?: string, mediaId?: string, mediaType?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { actionType, folderId, mediaId, mediaType } = await request.json();

    if (!actionType) {
      return NextResponse.json({ error: "actionType is required" }, { status: 400 });
    }

    const db = await prisma();

    const existingAction = await db.userActionHistory.findFirst({
      where: {
        actionType: actionType,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (existingAction) {
      await db.userActionHistory.delete({
        where: {
          id: existingAction.id,
        },
      });
    }

    const action = await db.userActionHistory.create({
      data: {
        actionType,
        folderId: folderId || null,
        mediaId: mediaId || null,
        mediaType: mediaType || null,
      },
    });

    return NextResponse.json(action, { status: 200 });
  } catch (error) {
    console.error("Failed to save user action:", error);
    return NextResponse.json({ error: "Failed to save user action" }, { status: 500 });
  }
}

/**
 * DELETE /api/user-actions
 * Cleanup old entries (keep last 100)
 */
export async function DELETE(request: NextRequest) {
  try {
    const db = await prisma();

    const allEntries = await db.userActionHistory.findMany({
      orderBy: {
        timestamp: "desc",
      },
      select: {
        id: true,
      },
    });

    if (allEntries.length > 100) {
      const idsToDelete = allEntries.slice(100).map((entry: { id: string }) => entry.id);

      await db.userActionHistory.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      });

      return NextResponse.json({ message: "Cleaned up old entries", count: idsToDelete.length }, { status: 200 });
    }

    return NextResponse.json({ message: "No cleanup needed" }, { status: 200 });
  } catch (error) {
    console.error("Failed to cleanup user actions:", error);
    return NextResponse.json({ error: "Failed to cleanup user actions" }, { status: 500 });
  }
}
