/**
 * Series API Routes
 * RESTful endpoints for series management
 */

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import type { Series } from "@/types/serie";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type ParseContext = {
  seriesId: string;
  field: string;
};

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T, context: ParseContext): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("Campo JSON invalido em series", {
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

function serializeGenreNames(genres: unknown): string | undefined {
  if (!Array.isArray(genres)) {
    return undefined;
  }

  const names = genres
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "name" in item && typeof (item as { name?: unknown }).name === "string") {
        return (item as { name: string }).name;
      }

      return null;
    })
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return names.length > 0 ? JSON.stringify(names) : undefined;
}

/**
 * GET /api/series?folderId={optional}
 * Get all series or filter by folderId (includes seasons and episodes)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    const db = await prisma();

    const allSeries = await db.series.findMany({
      where: folderId ? { folderId } : undefined,
      include: {
        seasons: {
          include: {
            episodes: true,
          },
          orderBy: { seasonNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const transformed = allSeries.map((series) => ({
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
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
      seasons: series.seasons.map((season) => ({
        id: season.id,
        seasonNumber: season.seasonNumber,
        name: season.name,
        overview: season.overview || undefined,
        folderPath: season.folderPath || undefined,
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
    }));

    return successResponse(transformed, 200);
  } catch (error) {
    logger.error("Falha ao carregar series", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel carregar as series.");
  }
}

/**
 * POST /api/series
 * Save/update series (bulk upsert with seasons and episodes)
 * Body: Series[]
 */
export async function POST(request: NextRequest) {
  try {
    const seriesList: Series[] = await request.json();

    if (!Array.isArray(seriesList)) {
      return errorResponse(400, "BAD_REQUEST", "Corpo da requisicao deve ser um array de series.");
    }

    const db = await prisma();

    const uniqueFolderIds = [...new Set(seriesList.map((s) => s.folderId))];
    const existingFolders = await db.folder.findMany({
      where: { id: { in: uniqueFolderIds } },
      select: { id: true },
    });
    const existingFolderIds = new Set(existingFolders.map((f: { id: string }) => f.id));

    const validSeries = seriesList.filter((series) => {
      if (!existingFolderIds.has(series.folderId)) {
        logger.warn("Serie ignorada por pasta invalida", {
          seriesTitle: series.title,
          folderId: series.folderId,
        });
        return false;
      }
      return true;
    });

    if (validSeries.length === 0) {
      return errorResponse(400, "BAD_REQUEST", "Nenhuma serie valida para salvar. As pastas informadas nao existem.");
    }

    for (const series of validSeries) {
      await db.series.upsert({
        where: { id: series.id },
        create: {
          id: series.id,
          title: series.title,
          originalTitle: series.originalTitle,
          overview: series.overview,
          poster: series.poster,
          backdrop: series.backdrop,
          rating: series.rating,
          year: series.year,
          firstAirDate: series.firstAirDate,
          lastAirDate: series.lastAirDate,
          status: series.status,
          type: "SERIES",
          filePath: series.filePath,
          folderPath: series.folderPath,
          folderId: series.folderId,
          numberOfSeasons: series.numberOfSeasons,
          numberOfEpisodes: series.numberOfEpisodes,
          duration: series.duration,
          trailer: series.trailer,
          genres: serializeGenreNames(series.genres),
          cast: series.cast ? JSON.stringify(series.cast) : undefined,
          crew: series.crew ? JSON.stringify(series.crew) : undefined,
          images: series.images ? JSON.stringify(series.images) : undefined,
          videos: series.videos ? JSON.stringify(series.videos) : undefined,
          tagline: series.tagline,
          imdbId: series.imdbId,
          voteCount: series.voteCount,
          popularity: series.popularity,
          networks: series.networks ? JSON.stringify(series.networks) : undefined,
          productionCompanies: series.productionCompanies ? JSON.stringify(series.productionCompanies) : undefined,
        },
        update: {
          title: series.title,
          originalTitle: series.originalTitle,
          overview: series.overview,
          poster: series.poster,
          backdrop: series.backdrop,
          rating: series.rating,
          year: series.year,
          firstAirDate: series.firstAirDate,
          lastAirDate: series.lastAirDate,
          status: series.status,
          filePath: series.filePath,
          folderPath: series.folderPath,
          numberOfSeasons: series.numberOfSeasons,
          numberOfEpisodes: series.numberOfEpisodes,
          duration: series.duration,
          trailer: series.trailer,
          genres: serializeGenreNames(series.genres),
          cast: series.cast ? JSON.stringify(series.cast) : undefined,
          crew: series.crew ? JSON.stringify(series.crew) : undefined,
          images: series.images ? JSON.stringify(series.images) : undefined,
          videos: series.videos ? JSON.stringify(series.videos) : undefined,
          tagline: series.tagline,
          imdbId: series.imdbId,
          voteCount: series.voteCount,
          popularity: series.popularity,
          networks: series.networks ? JSON.stringify(series.networks) : undefined,
          productionCompanies: series.productionCompanies ? JSON.stringify(series.productionCompanies) : undefined,
        },
      });

      if (series.seasons && series.seasons.length > 0) {
        for (const season of series.seasons) {
          const seasonData = await db.season.upsert({
            where: {
              seriesId_seasonNumber: {
                seriesId: series.id,
                seasonNumber: season.seasonNumber,
              },
            },
            create: {
              seasonNumber: season.seasonNumber,
              name: season.name,
              overview: season.overview,
              folderPath: season.folderPath,
              poster: season.poster,
              episodeCount: season.episodeCount,
              available: season.available,
              downloadedEpisodes: season.downloadedEpisodes,
              seriesId: series.id,
            },
            update: {
              name: season.name,
              overview: season.overview,
              folderPath: season.folderPath,
              poster: season.poster,
              episodeCount: season.episodeCount,
              available: season.available,
              downloadedEpisodes: season.downloadedEpisodes,
            },
          });

          if (season.episodes && season.episodes.length > 0) {
            for (const episode of season.episodes) {
              const epNum = episode.episode_number;
              if (epNum == null || isNaN(epNum)) {
                logger.warn("Episodio ignorado por episode_number invalido", {
                  seriesId: series.id,
                  seasonNumber: season.seasonNumber,
                  filePath: episode.filePath,
                });
                continue;
              }

              await db.episode.upsert({
                where: {
                  seasonId_episodeNumber: {
                    seasonId: seasonData.id,
                    episodeNumber: episode.episode_number,
                  },
                },
                create: {
                  episodeNumber: episode.episode_number,
                  seasonNumber: episode.season_number,
                  title: episode.title || episode.name || "Unknown",
                  overview: episode.overview,
                  stillPath: episode.still_path,
                  airDate: episode.air_date,
                  duration: episode.duration ?? episode.runtime ?? null,
                  filePath: episode.filePath,
                  available: episode.available ?? !!episode.filePath,
                  seasonId: seasonData.id,
                },
                update: {
                  title: episode.title || episode.name || "Unknown",
                  overview: episode.overview,
                  stillPath: episode.still_path,
                  airDate: episode.air_date,
                  duration: episode.duration ?? episode.runtime ?? null,
                  filePath: episode.filePath,
                  available: episode.available ?? !!episode.filePath,
                },
              });
            }
          }
        }
      }
    }

    return successResponse({ message: "Series salvas com sucesso", count: validSeries.length }, 200);
  } catch (error) {
    logger.error("Falha ao salvar series", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel salvar as series.");
  }
}

/**
 * DELETE /api/series?id={seriesId}
 * Remove a series (cascade deletes seasons and episodes)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get("id");

    if (!seriesId) {
      return errorResponse(400, "BAD_REQUEST", "ID da serie e obrigatorio.");
    }

    const db = await prisma();

    await db.series.delete({
      where: { id: seriesId },
    });

    return successResponse({ message: "Serie removida com sucesso" }, 200);
  } catch (error) {
    logger.error("Falha ao remover serie", error);
    return errorResponse(500, "DATABASE_ERROR", "Nao foi possivel remover a serie.");
  }
}
