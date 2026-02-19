/**
 * Series API Routes
 * RESTful endpoints for series management
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { Series } from "@/types/serie";

export const dynamic = "force-dynamic";

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
      orderBy: folderId ? { title: "asc" } : { createdAt: "desc" },
    });

    // Transform to frontend format
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
      // TMDB Extended Fields
      genres: series.genres ? JSON.parse(series.genres) : undefined,
      imdbId: series.imdbId || undefined,
      tagline: series.tagline || undefined,
      voteCount: series.voteCount || undefined,
      popularity: series.popularity || undefined,
      images: series.images ? JSON.parse(series.images) : undefined,
      videos: series.videos ? JSON.parse(series.videos) : undefined,
      cast: series.cast ? JSON.parse(series.cast) : undefined,
      crew: series.crew ? JSON.parse(series.crew) : undefined,
      networks: series.networks ? JSON.parse(series.networks) : undefined,
      productionCompanies: series.productionCompanies ? JSON.parse(series.productionCompanies) : undefined,
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
          overview: ep.overview,
          episode_number: ep.episodeNumber,
          season_number: ep.seasonNumber,
          still_path: ep.stillPath,
          air_date: ep.airDate,
          runtime: ep.duration,
          vote_average: 0, // Not stored in database
        })),
      })),
    }));

    return NextResponse.json(transformed, { status: 200 });
  } catch (error) {
    console.error("Failed to get series:", error);
    return NextResponse.json({ error: "Failed to get series" }, { status: 500 });
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
      return NextResponse.json({ error: "Request body must be an array of series" }, { status: 400 });
    }

    const db = await prisma();

    // Validate that all folders exist
    const uniqueFolderIds = [...new Set(seriesList.map((s) => s.folderId))];
    const existingFolders = await db.folder.findMany({
      where: { id: { in: uniqueFolderIds } },
      select: { id: true },
    });
    const existingFolderIds = new Set(existingFolders.map((f) => f.id));

    // Filter out series with invalid folder references
    const validSeries = seriesList.filter((series) => {
      if (!existingFolderIds.has(series.folderId)) {
        console.warn(`⚠️ Skipping series "${series.title}" - folder ${series.folderId} not found`);
        return false;
      }
      return true;
    });

    if (validSeries.length === 0) {
      return NextResponse.json(
        { error: "No valid series to save. All folder references are invalid." },
        { status: 400 },
      );
    }

    // Process each series
    for (const series of validSeries) {
      // Upsert series
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
          // TMDB Extended Fields
          genres: series.genres ? JSON.stringify(series.genres) : null,
          imdbId: series.imdbId,
          tagline: series.tagline,
          voteCount: series.voteCount,
          popularity: series.popularity,
          images: series.images ? JSON.stringify(series.images) : null,
          videos: series.videos ? JSON.stringify(series.videos) : null,
          cast: series.cast ? JSON.stringify(series.cast) : null,
          crew: series.crew ? JSON.stringify(series.crew) : null,
          networks: series.networks ? JSON.stringify(series.networks) : null,
          productionCompanies: series.productionCompanies ? JSON.stringify(series.productionCompanies) : null,
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
          // TMDB Extended Fields
          genres: series.genres ? JSON.stringify(series.genres) : null,
          imdbId: series.imdbId,
          tagline: series.tagline,
          voteCount: series.voteCount,
          popularity: series.popularity,
          images: series.images ? JSON.stringify(series.images) : null,
          videos: series.videos ? JSON.stringify(series.videos) : null,
          cast: series.cast ? JSON.stringify(series.cast) : null,
          crew: series.crew ? JSON.stringify(series.crew) : null,
          networks: series.networks ? JSON.stringify(series.networks) : null,
          productionCompanies: series.productionCompanies ? JSON.stringify(series.productionCompanies) : null,
        },
      });

      // Handle seasons if provided
      if (series.seasons && series.seasons.length > 0) {
        for (const season of series.seasons) {
          // Upsert season
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
              poster: season.poster,
              episodeCount: season.episodeCount,
              available: season.available,
              downloadedEpisodes: season.downloadedEpisodes,
              seriesId: series.id,
            },
            update: {
              name: season.name,
              overview: season.overview,
              poster: season.poster,
              episodeCount: season.episodeCount,
              available: season.available,
              downloadedEpisodes: season.downloadedEpisodes,
            },
          });

          // Handle episodes if provided
          if (season.episodes && season.episodes.length > 0) {
            for (const episode of season.episodes) {
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
                  title: episode.name,
                  overview: episode.overview,
                  stillPath: episode.still_path,
                  airDate: episode.air_date,
                  duration: episode.runtime,
                  filePath: undefined,
                  available: false,
                  seasonId: seasonData.id,
                },
                update: {
                  title: episode.name,
                  overview: episode.overview,
                  stillPath: episode.still_path,
                  airDate: episode.air_date,
                  duration: episode.runtime,
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ message: "Series saved successfully", count: seriesList.length }, { status: 200 });
  } catch (error) {
    console.error("Failed to save series:", error);
    return NextResponse.json({ error: "Failed to save series" }, { status: 500 });
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
      return NextResponse.json({ error: "Series ID is required" }, { status: 400 });
    }

    const db = await prisma();

    await db.series.delete({
      where: { id: seriesId },
    });

    return NextResponse.json({ message: "Series deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete series:", error);
    return NextResponse.json({ error: "Failed to delete series" }, { status: 500 });
  }
}
