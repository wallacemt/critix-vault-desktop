/**
 * Settings Backup API Route
 * Export and import database content as JSON
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type BackupCollections = {
  folders: unknown[];
  movies: unknown[];
  series: unknown[];
  watchHistory: unknown[];
  userActions: unknown[];
};

type Summary = {
  folders: {
    processed: number;
    restored: number;
    skipped: Array<{ id: string; reason: string }>;
  };
  movies: {
    processed: number;
    restored: number;
    skipped: Array<{ id: string; reason: string }>;
  };
  series: {
    processed: number;
    restored: number;
    skipped: Array<{ id: string; reason: string }>;
  };
  seasons: {
    processed: number;
    restored: number;
    skipped: Array<{ id: string; reason: string }>;
  };
  episodes: {
    processed: number;
    restored: number;
    skipped: Array<{ id: string; reason: string }>;
  };
  watchHistory: {
    processed: number;
    restored: number;
    skipped: Array<{ id: string; reason: string }>;
  };
  userActions: {
    processed: number;
    restored: number;
    skipped: Array<{ id: string; reason: string }>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecordArray(value: unknown[]): Array<Record<string, unknown>> {
  return value.filter(isRecord);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asInteger(value: unknown): number | null {
  const parsed = asNumber(value);
  if (parsed == null) {
    return null;
  }
  const intVal = Math.trunc(parsed);
  return Number.isFinite(intVal) ? intVal : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "sim"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "nao", "não"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function asDate(value: unknown, fallback: Date = new Date()): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return fallback;
}

function extractName(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value.name === "string") {
    return value.name;
  }

  return null;
}

function normalizeGenresJson(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const names = parsed.map(extractName).filter((name): name is string => !!name && name.trim().length > 0);
        return names.length > 0 ? JSON.stringify(names) : null;
      }
      const single = extractName(parsed);
      return single ? JSON.stringify([single]) : null;
    } catch {
      return JSON.stringify([trimmed]);
    }
  }

  if (Array.isArray(value)) {
    const names = value.map(extractName).filter((name): name is string => !!name && name.trim().length > 0);
    return names.length > 0 ? JSON.stringify(names) : null;
  }

  return null;
}

function normalizeJsonField(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function extractBackupData(rawBackup: unknown): BackupCollections | null {
  if (!isRecord(rawBackup)) {
    return null;
  }

  const data = isRecord(rawBackup.data) ? (rawBackup.data as Record<string, unknown>) : rawBackup;

  const hasAnyCollection = ["folders", "movies", "series", "watchHistory", "userActions", "userActionHistory"].some(
    (key) => Array.isArray(data[key]),
  );

  if (!hasAnyCollection) {
    return null;
  }

  return {
    folders: Array.isArray(data.folders) ? (data.folders as unknown[]) : [],
    movies: Array.isArray(data.movies) ? (data.movies as unknown[]) : [],
    series: Array.isArray(data.series) ? (data.series as unknown[]) : [],
    watchHistory: Array.isArray(data.watchHistory) ? (data.watchHistory as unknown[]) : [],
    userActions: Array.isArray(data.userActions)
      ? (data.userActions as unknown[])
      : Array.isArray(data.userActionHistory)
        ? (data.userActionHistory as unknown[])
        : [],
  };
}

/**
 * GET /api/settings/backup
 * Export all data as JSON
 */
export async function GET() {
  try {
    const db = await prisma();

    const [folders, movies, series, watchHistory, userActions] = await Promise.all([
      db.folder.findMany(),
      db.movie.findMany(),
      db.series.findMany({
        include: { seasons: { include: { episodes: true } } },
      }),
      db.watchHistory.findMany(),
      db.userActionHistory.findMany(),
    ]);

    const backup = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      data: {
        folders,
        movies,
        series,
        watchHistory,
        userActions,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error("Falha ao exportar dados:", error);
    return NextResponse.json({ error: "Nao foi possivel exportar os dados." }, { status: 500 });
  }
}

/**
 * POST /api/settings/backup
 * Import/restore data from JSON backup
 */
export async function POST(request: NextRequest) {
  try {
    const backup = await request.json();
    const parsed = extractBackupData(backup);

    if (!parsed) {
      return NextResponse.json({ error: "Formato de backup invalido." }, { status: 400 });
    }

    const db = await prisma();
    const folders = asRecordArray(parsed.folders);
    const movies = asRecordArray(parsed.movies);
    const series = asRecordArray(parsed.series);
    const watchHistory = asRecordArray(parsed.watchHistory);
    const userActions = asRecordArray(parsed.userActions);

    const summary: Summary = {
      folders: { processed: folders.length, restored: 0, skipped: [] },
      movies: { processed: movies.length, restored: 0, skipped: [] },
      series: { processed: series.length, restored: 0, skipped: [] },
      seasons: { processed: 0, restored: 0, skipped: [] },
      episodes: { processed: 0, restored: 0, skipped: [] },
      watchHistory: { processed: watchHistory.length, restored: 0, skipped: [] },
      userActions: { processed: userActions.length, restored: 0, skipped: [] },
    };

    await db.$transaction(async (tx) => {
      const existingFolders = await tx.folder.findMany({
        select: { id: true, path: true },
      });

      const folderById = new Map(existingFolders.map((folder) => [folder.id, folder]));
      const folderByPath = new Map(existingFolders.map((folder) => [folder.path.toLowerCase(), folder]));
      const folderIdMap = new Map<string, string>();

      for (const folder of folders) {
        const sourceId = asString(folder.id) ?? crypto.randomUUID();
        const folderPath = asString(folder.path);
        const folderName = asString(folder.name) ?? "Pasta importada";

        if (!folderPath) {
          summary.folders.skipped.push({ id: sourceId, reason: "Folder sem path valido" });
          continue;
        }

        const pathKey = folderPath.toLowerCase();
        const byPath = folderByPath.get(pathKey);
        const byId = folderById.get(sourceId);

        if (byPath) {
          await tx.folder.update({
            where: { id: byPath.id },
            data: {
              name: folderName,
              path: folderPath,
              mediaCount: asInteger(folder.mediaCount) ?? 0,
              addedAt: asDate(folder.addedAt),
            },
          });

          folderIdMap.set(sourceId, byPath.id);
          summary.folders.restored += 1;
          continue;
        }

        if (byId) {
          await tx.folder.update({
            where: { id: byId.id },
            data: {
              name: folderName,
              path: folderPath,
              mediaCount: asInteger(folder.mediaCount) ?? 0,
              addedAt: asDate(folder.addedAt),
            },
          });

          folderByPath.set(pathKey, { id: byId.id, path: folderPath });
          folderIdMap.set(sourceId, byId.id);
          summary.folders.restored += 1;
          continue;
        }

        await tx.folder.create({
          data: {
            id: sourceId,
            name: folderName,
            path: folderPath,
            mediaCount: asInteger(folder.mediaCount) ?? 0,
            addedAt: asDate(folder.addedAt),
          },
        });

        folderById.set(sourceId, { id: sourceId, path: folderPath });
        folderByPath.set(pathKey, { id: sourceId, path: folderPath });
        folderIdMap.set(sourceId, sourceId);
        summary.folders.restored += 1;
      }

      const resolveFolderId = (value: unknown): string | null => {
        const sourceId = asString(value);
        if (!sourceId) {
          return null;
        }

        return folderIdMap.get(sourceId) ?? (folderById.has(sourceId) ? sourceId : null);
      };

      for (const movie of movies) {
        const movieId = asString(movie.id);
        if (!movieId) {
          summary.movies.skipped.push({ id: "unknown", reason: "Filme sem id valido" });
          continue;
        }

        const mappedFolderId = resolveFolderId(movie.folderId);
        if (!mappedFolderId) {
          summary.movies.skipped.push({ id: movieId, reason: "Pasta referenciada nao encontrada" });
          continue;
        }

        await tx.movie.upsert({
          where: { id: movieId },
          create: {
            id: movieId,
            title: asString(movie.title) ?? "Sem titulo",
            originalTitle: asString(movie.originalTitle),
            overview: asString(movie.overview),
            poster: asString(movie.poster),
            backdrop: asString(movie.backdrop),
            rating: asNumber(movie.rating),
            year: asInteger(movie.year),
            releaseDate: asString(movie.releaseDate),
            status: asString(movie.status) ?? "UNMATCHED",
            type: asString(movie.type) ?? "MOVIE",
            filePath: asString(movie.filePath) ?? "",
            duration: asInteger(movie.duration),
            trailer: asString(movie.trailer),
            genres: normalizeGenresJson(movie.genres),
            imdbId: asString(movie.imdbId),
            tagline: asString(movie.tagline),
            budget: asInteger(movie.budget),
            revenue: asInteger(movie.revenue),
            voteCount: asInteger(movie.voteCount),
            popularity: asNumber(movie.popularity),
            images: normalizeJsonField(movie.images),
            videos: normalizeJsonField(movie.videos),
            cast: normalizeJsonField(movie.cast),
            crew: normalizeJsonField(movie.crew),
            folderId: mappedFolderId,
            createdAt: asDate(movie.createdAt),
          },
          update: {
            title: asString(movie.title) ?? "Sem titulo",
            originalTitle: asString(movie.originalTitle),
            overview: asString(movie.overview),
            poster: asString(movie.poster),
            backdrop: asString(movie.backdrop),
            rating: asNumber(movie.rating),
            year: asInteger(movie.year),
            releaseDate: asString(movie.releaseDate),
            status: asString(movie.status) ?? "UNMATCHED",
            type: asString(movie.type) ?? "MOVIE",
            filePath: asString(movie.filePath) ?? "",
            duration: asInteger(movie.duration),
            trailer: asString(movie.trailer),
            genres: normalizeGenresJson(movie.genres),
            imdbId: asString(movie.imdbId),
            tagline: asString(movie.tagline),
            budget: asInteger(movie.budget),
            revenue: asInteger(movie.revenue),
            voteCount: asInteger(movie.voteCount),
            popularity: asNumber(movie.popularity),
            images: normalizeJsonField(movie.images),
            videos: normalizeJsonField(movie.videos),
            cast: normalizeJsonField(movie.cast),
            crew: normalizeJsonField(movie.crew),
            folderId: mappedFolderId,
          },
        });

        summary.movies.restored += 1;
      }

      for (const item of series) {
        const seriesId = asString(item.id);
        if (!seriesId) {
          summary.series.skipped.push({ id: "unknown", reason: "Serie sem id valido" });
          continue;
        }

        const mappedFolderId = resolveFolderId(item.folderId);
        if (!mappedFolderId) {
          summary.series.skipped.push({ id: seriesId, reason: "Pasta referenciada nao encontrada" });
          continue;
        }

        const upsertedSeries = await tx.series.upsert({
          where: { id: seriesId },
          create: {
            id: seriesId,
            title: asString(item.title) ?? "Sem titulo",
            originalTitle: asString(item.originalTitle),
            overview: asString(item.overview),
            poster: asString(item.poster),
            backdrop: asString(item.backdrop),
            rating: asNumber(item.rating),
            year: asInteger(item.year),
            firstAirDate: asString(item.firstAirDate),
            lastAirDate: asString(item.lastAirDate),
            status: asString(item.status) ?? "UNMATCHED",
            type: asString(item.type) ?? "SERIES",
            filePath: asString(item.filePath) ?? "",
            folderPath: asString(item.folderPath),
            folderId: mappedFolderId,
            numberOfSeasons: asInteger(item.numberOfSeasons) ?? 0,
            numberOfEpisodes: asInteger(item.numberOfEpisodes) ?? 0,
            duration: asInteger(item.duration),
            trailer: asString(item.trailer),
            genres: normalizeGenresJson(item.genres),
            imdbId: asString(item.imdbId),
            tagline: asString(item.tagline),
            voteCount: asInteger(item.voteCount),
            popularity: asNumber(item.popularity),
            images: normalizeJsonField(item.images),
            videos: normalizeJsonField(item.videos),
            cast: normalizeJsonField(item.cast),
            crew: normalizeJsonField(item.crew),
            networks: normalizeJsonField(item.networks),
            productionCompanies: normalizeJsonField(item.productionCompanies),
            createdAt: asDate(item.createdAt),
          },
          update: {
            title: asString(item.title) ?? "Sem titulo",
            originalTitle: asString(item.originalTitle),
            overview: asString(item.overview),
            poster: asString(item.poster),
            backdrop: asString(item.backdrop),
            rating: asNumber(item.rating),
            year: asInteger(item.year),
            firstAirDate: asString(item.firstAirDate),
            lastAirDate: asString(item.lastAirDate),
            status: asString(item.status) ?? "UNMATCHED",
            type: asString(item.type) ?? "SERIES",
            filePath: asString(item.filePath) ?? "",
            folderPath: asString(item.folderPath),
            folderId: mappedFolderId,
            numberOfSeasons: asInteger(item.numberOfSeasons) ?? 0,
            numberOfEpisodes: asInteger(item.numberOfEpisodes) ?? 0,
            duration: asInteger(item.duration),
            trailer: asString(item.trailer),
            genres: normalizeGenresJson(item.genres),
            imdbId: asString(item.imdbId),
            tagline: asString(item.tagline),
            voteCount: asInteger(item.voteCount),
            popularity: asNumber(item.popularity),
            images: normalizeJsonField(item.images),
            videos: normalizeJsonField(item.videos),
            cast: normalizeJsonField(item.cast),
            crew: normalizeJsonField(item.crew),
            networks: normalizeJsonField(item.networks),
            productionCompanies: normalizeJsonField(item.productionCompanies),
          },
        });

        summary.series.restored += 1;

        const seasonsRaw = Array.isArray(item.seasons) ? asRecordArray(item.seasons as unknown[]) : [];
        summary.seasons.processed += seasonsRaw.length;

        for (const season of seasonsRaw) {
          const seasonNumber = asInteger(season.seasonNumber) ?? asInteger(season.season_number);
          if (seasonNumber == null) {
            summary.seasons.skipped.push({
              id: asString(season.id) ?? `series:${seriesId}:unknown-season`,
              reason: "Temporada sem numero valido",
            });
            continue;
          }

          const seasonData = await tx.season.upsert({
            where: {
              seriesId_seasonNumber: {
                seriesId,
                seasonNumber,
              },
            },
            create: {
              seasonNumber,
              name: asString(season.name) ?? `Temporada ${seasonNumber}`,
              overview: asString(season.overview),
              folderPath: asString(season.folderPath),
              poster: asString(season.poster),
              episodeCount: asInteger(season.episodeCount) ?? 0,
              available: asBoolean(season.available, false),
              downloadedEpisodes: asInteger(season.downloadedEpisodes) ?? 0,
              seriesId,
            },
            update: {
              name: asString(season.name) ?? `Temporada ${seasonNumber}`,
              overview: asString(season.overview),
              folderPath: asString(season.folderPath),
              poster: asString(season.poster),
              episodeCount: asInteger(season.episodeCount) ?? 0,
              available: asBoolean(season.available, false),
              downloadedEpisodes: asInteger(season.downloadedEpisodes) ?? 0,
            },
          });

          summary.seasons.restored += 1;

          const episodesRaw = Array.isArray(season.episodes) ? asRecordArray(season.episodes as unknown[]) : [];
          summary.episodes.processed += episodesRaw.length;

          for (const ep of episodesRaw) {
            const episodeNumber = asInteger(ep.episode_number) ?? asInteger(ep.episodeNumber);
            if (episodeNumber == null) {
              summary.episodes.skipped.push({
                id: asString(ep.id) ?? `series:${seriesId}:season:${seasonNumber}:unknown-episode`,
                reason: "Episodio sem numero valido",
              });
              continue;
            }

            const epSeasonNumber = asInteger(ep.season_number) ?? asInteger(ep.seasonNumber) ?? seasonNumber;

            await tx.episode.upsert({
              where: {
                seasonId_episodeNumber: {
                  seasonId: seasonData.id,
                  episodeNumber,
                },
              },
              create: {
                episodeNumber,
                seasonNumber: epSeasonNumber,
                title: asString(ep.title) ?? asString(ep.name) ?? `Episodio ${episodeNumber}`,
                overview: asString(ep.overview),
                stillPath: asString(ep.still_path) ?? asString(ep.stillPath),
                airDate: asString(ep.air_date) ?? asString(ep.airDate),
                duration: asInteger(ep.duration) ?? asInteger(ep.runtime),
                filePath: asString(ep.filePath),
                available: asBoolean(ep.available, false),
                seasonId: seasonData.id,
              },
              update: {
                seasonNumber: epSeasonNumber,
                title: asString(ep.title) ?? asString(ep.name) ?? `Episodio ${episodeNumber}`,
                overview: asString(ep.overview),
                stillPath: asString(ep.still_path) ?? asString(ep.stillPath),
                airDate: asString(ep.air_date) ?? asString(ep.airDate),
                duration: asInteger(ep.duration) ?? asInteger(ep.runtime),
                filePath: asString(ep.filePath),
                available: asBoolean(ep.available, false),
              },
            });

            summary.episodes.restored += 1;
          }
        }
      }

      for (const entry of watchHistory) {
        const id = asString(entry.id);
        if (!id) {
          summary.watchHistory.skipped.push({ id: "unknown", reason: "Historico sem id valido" });
          continue;
        }

        await tx.watchHistory.upsert({
          where: { id },
          create: {
            id,
            mediaId: asString(entry.mediaId),
            mediaType: asString(entry.mediaType) ?? "MOVIE",
            episodeId: asString(entry.episodeId),
            seasonNumber: asInteger(entry.seasonNumber),
            episodeNumber: asInteger(entry.episodeNumber),
            watchedAt: asDate(entry.watchedAt),
            progress: asNumber(entry.progress),
            completed: asBoolean(entry.completed, false),
          },
          update: {
            mediaId: asString(entry.mediaId),
            mediaType: asString(entry.mediaType) ?? "MOVIE",
            episodeId: asString(entry.episodeId),
            seasonNumber: asInteger(entry.seasonNumber),
            episodeNumber: asInteger(entry.episodeNumber),
            watchedAt: asDate(entry.watchedAt),
            progress: asNumber(entry.progress),
            completed: asBoolean(entry.completed, false),
          },
        });

        summary.watchHistory.restored += 1;
      }

      for (const action of userActions) {
        const id = asString(action.id);
        if (!id) {
          summary.userActions.skipped.push({ id: "unknown", reason: "Acao sem id valido" });
          continue;
        }

        await tx.userActionHistory.upsert({
          where: { id },
          create: {
            id,
            actionType: asString(action.actionType) ?? "TAB_VIEW",
            folderId: asString(action.folderId),
            mediaId: asString(action.mediaId),
            mediaType: asString(action.mediaType),
            timestamp: asDate(action.timestamp),
          },
          update: {
            actionType: asString(action.actionType) ?? "TAB_VIEW",
            folderId: asString(action.folderId),
            mediaId: asString(action.mediaId),
            mediaType: asString(action.mediaType),
            timestamp: asDate(action.timestamp),
          },
        });

        summary.userActions.restored += 1;
      }
    });

    return NextResponse.json({
      message: "Backup importado com sucesso",
      summary,
    });
  } catch (error) {
    console.error("Falha ao importar dados:", error);
    return NextResponse.json({ error: "Nao foi possivel importar o backup." }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/backup
 * Clear all app data
 */
export async function DELETE() {
  try {
    const db = await prisma();

    await db.userActionHistory.deleteMany();
    await db.watchHistory.deleteMany();
    await db.series.deleteMany();
    await db.movie.deleteMany();
    await db.folder.deleteMany();

    return NextResponse.json({ message: "Todos os dados foram removidos com sucesso" });
  } catch (error) {
    console.error("Falha ao limpar dados:", error);
    return NextResponse.json({ error: "Nao foi possivel limpar os dados." }, { status: 500 });
  }
}
