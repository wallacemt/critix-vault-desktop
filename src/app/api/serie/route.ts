/**
 * Movies API Routes
 * RESTful endpoints for movie management
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

/**
 * GET /api/serie?serieId={movieId}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serieId = searchParams.get("serieId");

    if (!serieId) {
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
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
      return NextResponse.json({ error: "movie not found" }, { status: 404 });
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
    };

    return NextResponse.json(transformed, { status: 200 });
  } catch (error) {
    console.error("Failed to get movies:", error);
    return NextResponse.json({ error: `Failed to get movies: ${error}` }, { status: 500 });
  }
}
