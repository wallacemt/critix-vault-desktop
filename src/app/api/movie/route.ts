/**
 * Movie detail API Route
 * GET /api/movie?movieId={id}
 */

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
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
    logger.warn("Campo JSON invalido em detalhe de filme", {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get("movieId");

    if (!movieId) {
      return errorResponse(400, "BAD_REQUEST", "ID do filme e obrigatorio.");
    }

    const db = await prisma();

    const movie = await db.movie.findFirst({
      where: { id: movieId },
    });

    if (!movie) {
      return errorResponse(404, "NOT_FOUND", "Filme nao encontrado.");
    }

    const isWatched = await db.watchHistory.findFirst({ where: { mediaId: movie.id } });

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
    };

    return successResponse(transformed, 200);
  } catch (error) {
    logger.error("Falha ao carregar detalhes do filme", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel carregar os detalhes do filme.");
  }
}
