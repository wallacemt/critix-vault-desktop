/**
 * Movies API Routes
 * RESTful endpoints for movie management
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * GET /api/movie?movieId={movieId}
 * Get all movies or filter by folderId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("movieId");

    if (!movieId) {
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
    }
    const db = await prisma();

    const movie = await db.movie.findFirst({
      where: { id: movieId },
    });

    if (!movie) {
      return NextResponse.json({ error: "movie not found" }, { status: 404 });
    }

    const isWatched = await db.watchHistory.findFirst({ where: { mediaId: movie.id } });
    // Transform to frontend format
    const transformed = {
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
      isWatched: isWatched !== null,
      // TMDB Extended Fields
      genres: movie.genres ? JSON.parse(movie.genres).map((genre: string) => ({ name: genre })) : undefined,
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
    };

    return NextResponse.json(transformed, { status: 200 });
  } catch (error) {
    console.error("Failed to get movies:", error);
    return NextResponse.json({ error: `Failed to get movies: ${error}` }, { status: 500 });
  }
}
