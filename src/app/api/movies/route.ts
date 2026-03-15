/**
 * Movies API Routes
 * RESTful endpoints for movie management
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { Movie } from "@/types/movie";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/movies?folderId={optional}
 * Get all movies or filter by folderId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    const db = await prisma();

    const movies = await db.movie.findMany({
      where: folderId ? { folderId } : undefined,
      orderBy: folderId ? { title: "asc" } : { createdAt: "desc" },
    });

    // Transform to frontend format
    const transformed = movies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle || undefined,
      overview: movie.overview || undefined,
      poster: movie.poster || undefined,
      backdrop: movie.backdrop || undefined,
      rating: movie.rating || undefined,
      year: movie.year || undefined,
      releaseDate: movie.releaseDate || undefined,
      status: movie.status as any,
      type: "MOVIE" as const,
      filePath: movie.filePath,
      folderId: movie.folderId,
      duration: movie.duration || undefined,
      trailer: movie.trailer || undefined,
      // TMDB Extended Fields
      genres: movie.genres
        ? JSON.parse(movie.genres).map((g: any) => (typeof g === "string" ? { name: g } : { name: g.name }))
        : undefined,
      imdbId: movie.imdbId || undefined,
      tagline: movie.tagline || undefined,
      budget: movie.budget || undefined,
      revenue: movie.revenue || undefined,
      voteCount: movie.voteCount || undefined,
      popularity: movie.popularity || undefined,
      images: movie.images ? JSON.parse(movie.images) : undefined,
      videos: movie.videos ? JSON.parse(movie.videos) : undefined,
      cast: movie.cast ? JSON.parse(movie.cast) : undefined,
      crew: movie.crew ? JSON.parse(movie.crew) : undefined,
    }));

    return successResponse(transformed, 200);
  } catch (error) {
    logger.error("Failed to get movies", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to get movies");
  }
}

/**
 * POST /api/movies
 * Save/update movies (bulk upsert)
 * Body: Movie[]
 */
export async function POST(request: NextRequest) {
  try {
    const movies: Movie[] = await request.json();

    if (!Array.isArray(movies)) {
      return errorResponse(400, "BAD_REQUEST", "Request body must be an array of movies");
    }

    const db = await prisma();

    // Validate that all folders exist
    const uniqueFolderIds = [...new Set(movies.map((m) => m.folderId))];
    const existingFolders = await db.folder.findMany({
      where: { id: { in: uniqueFolderIds } },
      select: { id: true },
    });
    const existingFolderIds = new Set(existingFolders.map((f) => f.id));

    // Filter out movies with invalid folder references
    const validMovies = movies.filter((movie) => {
      if (!existingFolderIds.has(movie.folderId)) {
        console.warn(`⚠️ Skipping movie "${movie.title}" - folder ${movie.folderId} not found`);
        return false;
      }
      return true;
    });

    if (validMovies.length === 0) {
      return errorResponse(400, "BAD_REQUEST", "No valid movies to save. All folder references are invalid.");
    }

    // Upsert each movie
    const results = await Promise.all(
      validMovies.map((movie) =>
        db.movie.upsert({
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
            status: movie.status,
            type: "MOVIE",
            filePath: movie.filePath,
            folderId: movie.folderId,
            duration: movie.duration,
            trailer: movie.trailer,
            genres: movie.genres
              ? JSON.stringify(movie.genres.map((g: any) => (typeof g === "string" ? g : g.name)))
              : undefined,
            cast: movie.cast ? JSON.stringify(movie.cast) : undefined,
            crew: movie.crew ? JSON.stringify(movie.crew) : undefined,
            images: movie.images ? JSON.stringify(movie.images) : undefined,
            videos: movie.videos ? JSON.stringify(movie.videos) : undefined,
            tagline: movie.tagline,
            imdbId: movie.imdbId,
            budget: movie.budget,
            revenue: movie.revenue,
            voteCount: movie.voteCount,
            popularity: movie.popularity,
          },
          update: {
            title: movie.title,
            originalTitle: movie.originalTitle,
            overview: movie.overview,
            poster: movie.poster,
            backdrop: movie.backdrop,
            rating: movie.rating,
            year: movie.year,
            releaseDate: movie.releaseDate,
            status: movie.status,
            filePath: movie.filePath,
            duration: movie.duration,
            trailer: movie.trailer,
            genres: movie.genres
              ? JSON.stringify(movie.genres.map((g: any) => (typeof g === "string" ? g : g.name)))
              : undefined,
            cast: movie.cast ? JSON.stringify(movie.cast) : undefined,
            crew: movie.crew ? JSON.stringify(movie.crew) : undefined,
            images: movie.images ? JSON.stringify(movie.images) : undefined,
            videos: movie.videos ? JSON.stringify(movie.videos) : undefined,
            tagline: movie.tagline,
            imdbId: movie.imdbId,
            budget: movie.budget,
            revenue: movie.revenue,
            voteCount: movie.voteCount,
            popularity: movie.popularity,
          },
        }),
      ),
    );

    return successResponse({ message: "Movies saved successfully", count: results.length }, 200);
  } catch (error) {
    logger.error("Failed to save movies", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to save movies");
  }
}

/**
 * DELETE /api/movies?id={movieId}
 * Remove a movie
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("id");

    if (!movieId) {
      return errorResponse(400, "BAD_REQUEST", "Movie ID is required");
    }

    const db = await prisma();

    await db.movie.delete({
      where: { id: movieId },
    });

    return successResponse({ message: "Movie deleted successfully" }, 200);
  } catch (error) {
    logger.error("Failed to delete movie", error);
    return errorResponse(500, "DATABASE_ERROR", "Failed to delete movie");
  }
}
