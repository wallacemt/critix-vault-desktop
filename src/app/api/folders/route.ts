/**
 * Folders API Routes
 * RESTful endpoints for folder management
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/folders
 * Get all folders
 */
export async function GET() {
  try {
    const db = await prisma();
    const folders = await db.folder.findMany({
      orderBy: { addedAt: "desc" },
    });

    return successResponse(folders, 200);
  } catch (error) {
    logger.error("Failed to get folders", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to get folders");
  }
}

/**
 * POST /api/folders
 * Add a new folder
 * Body: { path: string, name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { path, name } = await request.json();

    if (!path || !name) {
      return errorResponse(400, "BAD_REQUEST", "Path and name are required");
    }

    const db = await prisma();

    // Check if folder already exists
    const existing = await db.folder.findFirst({
      where: { path },
    });

    if (existing) {
      return errorResponse(409, "CONFLICT", "Folder already exists");
    }

    // Create new folder
    const folder = await db.folder.create({
      data: {
        id: crypto.randomUUID(),
        path,
        name,
        mediaCount: 0,
        addedAt: new Date(),
      },
    });

    return successResponse(folder, 201);
  } catch (error) {
    logger.error("Failed to add folder", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to add folder");
  }
}

/**
 * DELETE /api/folders?id={folderId}
 * Remove a folder (cascade deletes media)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("id");

    if (!folderId) {
      return errorResponse(400, "BAD_REQUEST", "Folder ID is required");
    }

    const db = await prisma();

    // Delete folder (cascade deletes movies and series)
    await db.folder.delete({
      where: { id: folderId },
    });

    return successResponse({ message: "Folder deleted successfully" }, 200);
  } catch (error) {
    logger.error("Failed to delete folder", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to delete folder");
  }
}

/**
 * PATCH /api/folders
 * Update folder media count
 * Body: { folderId: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { folderId } = await request.json();

    if (!folderId) {
      return errorResponse(400, "BAD_REQUEST", "Folder ID is required");
    }

    const db = await prisma();

    // Count movies and series
    const movieCount = await db.movie.count({
      where: { folderId },
    });

    const seriesCount = await db.series.count({
      where: { folderId },
    });

    const totalCount = movieCount + seriesCount;

    // Update folder
    const folder = await db.folder.update({
      where: { id: folderId },
      data: { mediaCount: totalCount },
    });

    return successResponse(folder, 200);
  } catch (error) {
    logger.error("Failed to update folder", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to update folder");
  }
}
