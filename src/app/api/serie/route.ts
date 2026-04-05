/**
 * Series detail API Route
 * GET /api/serie?serieId={id}
 */

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function parseJsonSafe<T>(
  raw: string | null | undefined,
  fallback: T,
  context: { seriesId: string; field: string },
): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("Campo JSON invalido em detalhe de serie", {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

function toGenreObjects(raw: string | null | undefined, seriesId: string): Array<{ name: string }> | undefined {
  const parsed = parseJsonSafe<unknown[]>(raw, [], { seriesId, field: "genres" });
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
    const serieId = searchParams.get("serieId");

    if (!serieId) {
      return errorResponse(400, "BAD_REQUEST", "ID da serie e obrigatorio.");
    }

    const db = await prisma();

    const series = await db.series.findFirst({
      where: { id: serieId },
      include: {
        seasons: {
          include: {
            episodes: true,
          },
          orderBy: { seasonNumber: "asc" },
        },
      },
    });

    if (!series) {
      return errorResponse(404, "NOT_FOUND", "Serie nao encontrada.");
    }

    const transformed = {
      id: series.id,
      title: series.title,
      originalTitle: series.originalTitle || undefined,
      overview: series.overview || undefined,
      poster: series.poster || undefined,
      backdrop: series.backdrop || undefined,
      rating: series.rating || undefined,
      year: series.year || undefined,
      firstAirDate: series.firstAirDate || undefined,
      lastAirDate: series.lastAirDate || undefined,
      status: series.status as any,
      type: "SERIES" as const,
      filePath: series.filePath,
      folderPath: series.folderPath || undefined,
      folderId: series.folderId,
      numberOfSeasons: series.numberOfSeasons,
      numberOfEpisodes: series.numberOfEpisodes,
      duration: series.duration || undefined,
      trailer: series.trailer || undefined,
      genres: toGenreObjects(series.genres, series.id),
      imdbId: series.imdbId || undefined,
      tagline: series.tagline || undefined,
      voteCount: series.voteCount || undefined,
      popularity: series.popularity || undefined,
      images: parseJsonSafe<unknown[]>(series.images, [], { seriesId: series.id, field: "images" }),
      videos: parseJsonSafe<unknown[]>(series.videos, [], { seriesId: series.id, field: "videos" }),
      cast: parseJsonSafe<unknown[]>(series.cast, [], { seriesId: series.id, field: "cast" }),
      crew: parseJsonSafe<unknown[]>(series.crew, [], { seriesId: series.id, field: "crew" }),
      networks: parseJsonSafe<unknown[]>(series.networks, [], { seriesId: series.id, field: "networks" }),
      productionCompanies: parseJsonSafe<unknown[]>(series.productionCompanies, [], {
        seriesId: series.id,
        field: "productionCompanies",
      }),
      seasons: series.seasons.map((season) => ({
        id: season.id,
        seasonNumber: season.seasonNumber,
        name: season.name,
        overview: season.overview || undefined,
        poster: season.poster || undefined,
        episodeCount: season.episodeCount,
        available: season.available,
        downloadedEpisodes: season.downloadedEpisodes,
        episodes: season.episodes.map((ep) => ({
          id: ep.id,
          name: ep.title,
          title: ep.title,
          overview: ep.overview,
          episode_number: ep.episodeNumber,
          season_number: ep.seasonNumber,
          still_path: ep.stillPath,
          air_date: ep.airDate,
          runtime: ep.duration,
          duration: ep.duration,
          vote_average: 0,
          filePath: ep.filePath || undefined,
          available: ep.available,
        })),
      })),
    };

    return successResponse(transformed, 200);
  } catch (error) {
    logger.error("Falha ao carregar detalhes da serie", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel carregar os detalhes da serie.");
  }
}
