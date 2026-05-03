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

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T, context: { movieId: string; field: string }): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("Campo JSON invalido em movies", {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

function toGenreObjects(raw: string | null | undefined, movieId: string): Array<{ name: string }> | undefined {
  const parsed = parseJsonSafe<unknown[]>(raw, [], { movieId, field: "genres" });
  const normalized = parsed
    .map((item) => {
      if (typeof item === "string") {
        return { name: item };
      }
      if (item && typeof item === "object" && "name" in item && typeof (item as { name?: unknown }).name === "string") {
        return { name: (item as { name: string }).name };
      }
      return null;
    })
    .filter((item): item is { name: string } => item !== null);

  return normalized.length > 0 ? normalized : undefined;
}

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

    // @ts-ignore
    const transformed = movies.map((movie: any) => ({
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
      genres: toGenreObjects(movie.genres, movie.id),
      imdbId: movie.imdbId || undefined,
      tagline: movie.tagline || undefined,
      budget: movie.budget || undefined,
      revenue: movie.revenue || undefined,
      voteCount: movie.voteCount || undefined,
      popularity: movie.popularity || undefined,
      images: parseJsonSafe<unknown[]>(movie.images, [], { movieId: movie.id, field: "images" }),
      videos: parseJsonSafe<unknown[]>(movie.videos, [], { movieId: movie.id, field: "videos" }),
      cast: parseJsonSafe<unknown[]>(movie.cast, [], { movieId: movie.id, field: "cast" }),
      crew: parseJsonSafe<unknown[]>(movie.crew, [], { movieId: movie.id, field: "crew" }),
      createdAt: movie.createdAt.toISOString(),
      updatedAt: movie.updatedAt.toISOString(),
    }));

    return successResponse(transformed, 200);
  } catch (error) {
    logger.error("Falha ao carregar filmes", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel carregar os filmes.");
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
      return errorResponse(400, "BAD_REQUEST", "Corpo da requisicao deve ser um array de filmes.");
    }

    const db = await prisma();

    // Validate that all folders exist
    const uniqueFolderIds = [...new Set(movies.map((m) => m.folderId))];
    const existingFolders = await db.folder.findMany({
      where: { id: { in: uniqueFolderIds } },
      select: { id: true },
    });
    const existingFolderIds = new Set(existingFolders.map((f: { id: string }) => f.id));

    // Filter out movies with invalid folder references
    const validMovies = movies.filter((movie) => {
      if (!existingFolderIds.has(movie.folderId)) {
        console.warn(`⚠️ Skipping movie "${movie.title}" - folder ${movie.folderId} not found`);
        return false;
      }
      return true;
    });

    if (validMovies.length === 0) {
      return errorResponse(400, "BAD_REQUEST", "Nenhum filme valido para salvar. As pastas informadas nao existem.");
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

    return successResponse({ message: "Filmes salvos com sucesso", count: results.length }, 200);
  } catch (error) {
    logger.error("Falha ao salvar filmes", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel salvar os filmes.");
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
      return errorResponse(400, "BAD_REQUEST", "ID do filme e obrigatorio.");
    }

    const db = await prisma();

    await db.movie.delete({
      where: { id: movieId },
    });

    return successResponse({ message: "Filme removido com sucesso" }, 200);
  } catch (error) {
    logger.error("Falha ao remover filme", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel remover o filme.");
  }
}
