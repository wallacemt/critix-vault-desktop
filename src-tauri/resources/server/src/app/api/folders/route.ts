/**
 * Folders API Routes
 * RESTful endpoints for folder management
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json(folders, { status: 200 });
  } catch (error) {
    console.error("Failed to get folders:", error);
    return NextResponse.json({ error: `Failed to get folders: ${error}"` }, { status: 500 });
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
      return NextResponse.json({ error: "Path and name are required" }, { status: 400 });
    }

    const db = await prisma();

    // Check if folder already exists
    const existing = await db.folder.findFirst({
      where: { path },
    });

    if (existing) {
      return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
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

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Failed to add folder:", error);
    return NextResponse.json({ error: "Failed to add folder" }, { status: 500 });
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
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    const db = await prisma();

    // Delete folder (cascade deletes movies and series)
    await db.folder.delete({
      where: { id: folderId },
    });

    return NextResponse.json({ message: "Folder deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete folder:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
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
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
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

    return NextResponse.json(folder, { status: 200 });
  } catch (error) {
    console.error("Failed to update folder:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}
