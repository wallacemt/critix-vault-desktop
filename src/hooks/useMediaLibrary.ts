/**
 * Custom hooks for Critix Vault
 *
 * Uses SQLite database via API for persistent storage that survives app restarts.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { folderScanService } from "@/services/folderScanService";
import { apiService } from "@/services/api";
import { useFoldersContext } from "@/context/foldersContext";
import {
  getMovies,
  getSeries,
  removeMovie,
  removeSeries,
  saveMovies,
  saveSeries,
  getWatchHistory,
  markAsWatched,
  setSeriesEpisodesWatchStatus,
  type WatchHistory,
} from "@/services/databaseService";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { Media } from "@/types/media";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

/**
 * Hook to manage media library for a specific folder
 * Reads from database (persistent storage) and filters by folderId
 */
export function useMediaLibrary(folderId: string | null) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { folders } = useFoldersContext();
  const { isOnline } = useApiConnectivity();

  const loadMediaFromStorage = useCallback(async () => {
    if (!folderId) {
      console.log("⚠️ No folderId, clearing media");
      setMovies([]);
      setSeries([]);
      return;
    }

    setLoading(true);
    try {
      // Load media and watch history in parallel.
      const [allMovies, allSeries, watchHistory] = await Promise.all([getMovies(), getSeries(), getWatchHistory()]);

      console.log("📦 All movies in database:", allMovies.length);
      console.log("📦 All series in database:", allSeries.length);
      console.log("🔍 Filtering for folderId:", folderId);

      const movieHistoryById = new Map<string, WatchHistory[]>();
      const seriesHistoryById = new Map<string, WatchHistory[]>();

      for (const entry of watchHistory) {
        const targetMap = entry.mediaType === "MOVIE" ? movieHistoryById : seriesHistoryById;
        const entries = targetMap.get(entry.mediaId) || [];
        entries.push(entry);
        targetMap.set(entry.mediaId, entries);
      }

      // Filter by folder and enrich with watch status
      const filteredMovies = allMovies
        .filter((movie) => {
          const match = movie.folderId === folderId;
          if (match) console.log("✅ Movie matched:", movie.title);
          return match;
        })
        .map((movie) => {
          const history = movieHistoryById.get(movie.id) || [];
          const watchedHistory = history.filter((entry) => entry.completed && !entry.episodeId);

          const lastWatchedAt = watchedHistory.reduce<string | undefined>((latest, entry) => {
            const entryWatchedAt = new Date(entry.watchedAt as unknown as string).getTime();
            if (!Number.isFinite(entryWatchedAt)) return latest;

            if (!latest) return new Date(entryWatchedAt).toISOString();

            const latestMs = new Date(latest).getTime();
            return entryWatchedAt > latestMs ? new Date(entryWatchedAt).toISOString() : latest;
          }, undefined);

          return {
            ...movie,
            isWatched: watchedHistory.length > 0,
            lastWatchedAt,
          };
        });

      const filteredSeriesPromises = allSeries
        .filter((s) => {
          const match = s.folderId === folderId;
          if (match) console.log("✅ Series matched:", s.title);
          return match;
        })
        .map(async (seriesItem) => {
          // Calculate total episodes in the series
          const totalEpisodes = seriesItem.seasons.reduce((sum, season) => sum + (season.episodes?.length || 0), 0);
          const history = seriesHistoryById.get(seriesItem.id) || [];
          const watchedEpisodeKeys = new Set(
            history
              .filter((entry) => entry.completed && entry.episodeId)
              .map((entry) => `${entry.seasonNumber}-${entry.episodeNumber}`),
          );

          const lastWatchedAt = history.reduce<string | undefined>((latest, entry) => {
            const entryWatchedAt = new Date(entry.watchedAt as unknown as string).getTime();
            if (!Number.isFinite(entryWatchedAt)) return latest;

            if (!latest) return new Date(entryWatchedAt).toISOString();

            const latestMs = new Date(latest).getTime();
            return entryWatchedAt > latestMs ? new Date(entryWatchedAt).toISOString() : latest;
          }, undefined);

          // If no episodes, can't be watched
          if (totalEpisodes === 0) {
            return {
              ...seriesItem,
              isWatched: false,
              lastWatchedAt,
            };
          }

          const seasons = seriesItem.seasons.map((season) => ({
            ...season,
            episodes: (season.episodes || []).map((episode) => ({
              ...episode,
              isWatched: watchedEpisodeKeys.has(`${episode.season_number}-${episode.episode_number}`),
            })),
          }));

          // Series is watched only if ALL episodes are watched
          const isWatched = watchedEpisodeKeys.size === totalEpisodes && totalEpisodes > 0;

          return {
            ...seriesItem,
            seasons,
            isWatched,
            lastWatchedAt,
          };
        });

      const filteredSeries = await Promise.all(filteredSeriesPromises);

      console.log("🎬 Loaded movies for folder:", filteredMovies.length);
      console.log("📺 Loaded series for folder:", filteredSeries.length);

      setMovies(filteredMovies);
      setSeries(filteredSeries);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Nao foi possivel carregar as midias.";
      setError(errorMessage);
      setMovies([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  const scanFolder = async (folderPath: string) => {
    if (!folderId) return;

    if (!isOnline) {
      setError("Modo offline ativo. Reconecte para escanear pastas e buscar correspondencias online.");
      return;
    }

    // Get existing media for this folder (for intelligent rescan)
    const allMovies = await getMovies();
    const allSeries = await getSeries();
    const existingMovies = allMovies.filter((m) => m.folderId === folderId);
    const existingSeries = allSeries.filter((s) => s.folderId === folderId);
    const otherMovies = allMovies.filter((m) => m.folderId !== folderId);
    const otherSeries = allSeries.filter((s) => s.folderId !== folderId);

    try {
      setScanning(true);
      setScanProgress(0);
      setError(null);

      console.log("🔍 Starting folder scan:", folderPath);

      // Scan the folder using Rust + API — pass existing media so the service
      // skips files already in the database (incremental scan).
      const result = await folderScanService.scanAndMatchFolder(
        folderId,
        folderPath,
        (progress) => {
          const percent = progress.totalFiles > 0 ? (progress.processedFiles / progress.totalFiles) * 100 : 0;
          setScanProgress(percent);
          if ((progress.status === "error" || progress.status === "empty") && progress.error) {
            setError(progress.error);
          }
        },
        existingMovies,
        existingSeries,
      );

      console.log("✅ Scan complete:", result);

      const normPath = (p: string) => p.replace(/\\/g, "/").toLowerCase();

      // Find truly new media (not yet in database for this folder)
      const existingMovieIds = new Set(existingMovies.map((m) => m.id));
      const existingSeriesIds = new Set(existingSeries.map((s) => s.id));
      const newMovies = result.movies.filter((m) => !existingMovieIds.has(m.id));
      const newSeries = result.series.filter((s) => !existingSeriesIds.has(s.id));

      console.log("📊 Rescan analysis:");
      console.log(`  - Existing movies: ${existingMovies.length}, Existing series: ${existingSeries.length}`);
      console.log(`  - New movies: ${newMovies.length}, New series: ${newSeries.length}`);
      console.log(`  - Files found in folder: ${result.foundFilePaths.length}`);

      // Detect truly missing media using FILE PATHS — not IDs from scan result.
      // result.movies/series only contains newly matched files (existing are skipped
      // by the scan optimisation), so comparing IDs would falsely flag ALL existing
      // media as "missing". Instead, compare the actual paths that exist on disk.
      //
      // Only run this check when the folder was actually readable (foundFilePaths > 0).
      // An empty foundFilePaths means the folder scan failed or the folder is empty,
      // so we skip the missing-detection to avoid nuking the whole library.
      if (result.foundFilePaths.length > 0) {
        const scannedPaths = new Set(result.foundFilePaths.map(normPath));

        const missingMovies = existingMovies.filter((m) => m.filePath && !scannedPaths.has(normPath(m.filePath)));

        const missingSeries = existingSeries.filter((s) => {
          const episodePaths = (s.seasons || [])
            .flatMap((season) => (season.episodes || []).map((ep) => ep.filePath))
            .filter(Boolean) as string[];
          // A série só está "ausente" se TODOS os seus episódios sumiram da pasta.
          return episodePaths.length > 0 && episodePaths.every((p) => !scannedPaths.has(normPath(p)));
        });

        if (missingMovies.length > 0 || missingSeries.length > 0) {
          console.log("📝 Missing media (marking as watched automatically):");
          missingMovies.forEach((m) => console.log(`    🗑️  ${m.title}`));
          missingSeries.forEach((s) => console.log(`    🗑️  ${s.title}`));

          for (const movie of missingMovies) {
            try {
              await markAsWatched(movie.id, "MOVIE");
              console.log(`✅ Auto-marked missing movie as watched: ${movie.title}`);
            } catch (err) {
              console.error(`Failed to auto-mark movie as watched: ${movie.title}`, err);
            }
          }

          for (const s of missingSeries) {
            const episodes = (s.seasons || []).flatMap((season) =>
              (season.episodes || []).map((episode) => ({
                id: episode.id,
                seasonNumber: episode.season_number,
                episodeNumber: episode.episode_number,
              })),
            );
            if (episodes.length > 0) {
              try {
                await setSeriesEpisodesWatchStatus(s.id, episodes, true);
                console.log(`✅ Auto-marked missing series as watched: ${s.title}`);
              } catch (err) {
                console.error(`Failed to auto-mark series as watched: ${s.title}`, err);
              }
            }
          }
        }
      }

      // IMPORTANT: Keep ALL existing media + add only new ones
      // Do NOT remove missing media from database (they should be marked as watched instead)
      const moviesToSave = [...otherMovies, ...existingMovies, ...newMovies].filter((m) => {
        if (!m.id || m.id === "") {
          console.warn("⚠️ Skipping movie without ID:", m.title);
          return false;
        }
        return true;
      });

      const seriesToSave = [...otherSeries, ...existingSeries, ...newSeries]
        .filter((s) => {
          if (!s.id || s.id === "") {
            console.warn("⚠️ Skipping series without ID:", s.title);
            return false;
          }
          return true;
        })
        .map((s) => ({
          ...s,
          seasons: s.seasons || [],
          numberOfSeasons: s.numberOfSeasons || 0,
          numberOfEpisodes: s.numberOfEpisodes || 0,
        }));

      console.log("💾 Saving movies:", moviesToSave.length);
      console.log("💾 Saving series:", seriesToSave.length);
      console.log("📊 Final Summary:");
      console.log(`  - Total movies in library: ${moviesToSave.length}`);
      console.log(`  - Total series in library: ${seriesToSave.length}`);
      console.log(`  - Movies in this folder: ${existingMovies.length + newMovies.length}`);
      console.log(`  - Series in this folder: ${existingSeries.length + newSeries.length}`);
      console.log(`  - New added this scan: ${newMovies.length} movies, ${newSeries.length} series`);

      try {
        await saveMovies(moviesToSave);
        console.log("✅ Movies saved to database successfully");
      } catch (movieErr) {
        console.error("❌ Failed to save movies:", movieErr);
        throw movieErr;
      }

      try {
        await saveSeries(seriesToSave);
        console.log("✅ Series saved to database successfully");
      } catch (seriesErr) {
        console.error("❌ Failed to save series:", seriesErr);
        throw seriesErr;
      }

      // Reload from database
      await loadMediaFromStorage();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Nao foi possivel escanear a pasta.";
      console.error("❌ Scan error:", errorMessage);
      setError(errorMessage);
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  useEffect(() => {
    console.log("🔄 useMediaLibrary - folderId changed:", folderId);
    loadMediaFromStorage();
  }, [folderId, loadMediaFromStorage]);

  /**
   * Update a media item with new information from API
   * Used when user corrects an incorrect match
   */
  const updateMedia = useCallback(
    async (originalMedia: Media, newMediaId: string, newMediaType: "movie" | "tv"): Promise<void> => {
      if (!folderId) return;

      if (!isOnline) {
        throw new Error("Modo offline ativo. Reconecte para atualizar dados da midia.");
      }

      try {
        console.log(`🔄 Updating media: ${originalMedia.title} -> ID: ${newMediaId} (${newMediaType})`);

        // Fetch detailed info from API (includes credits, images, videos)
        const details = await apiService.getMediaDetailsById(newMediaId, newMediaType);

        if (!details) {
          throw new Error("Nao foi possivel buscar os detalhes da midia.");
        }

        const apiData = details as any;
        const newId = apiData.id?.toString() || newMediaId;

        // Build helper data
        const poster = apiData.poster_path ? `https://image.tmdb.org/t/p/w500${apiData.poster_path}` : undefined;
        const backdrop = apiData.backdrop_path
          ? `https://image.tmdb.org/t/p/original${apiData.backdrop_path}`
          : undefined;
        const genres = apiData.genres?.map((g: any) => ({ name: g.name || g })) ?? [];
        const cast =
          apiData.credits?.cast?.slice(0, 20).map((c: any) => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
          })) ?? [];
        const crew =
          apiData.credits?.crew
            ?.filter((c: any) => ["Director", "Producer", "Screenplay", "Writer"].includes(c.job))
            .slice(0, 10)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              job: c.job,
              department: c.department,
              profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
            })) ?? [];
        const images: string[] = [
          ...(apiData.images?.backdrops
            ?.slice(0, 10)
            .map((img: any) => `https://image.tmdb.org/t/p/original${img.file_path}`) ?? []),
          ...(apiData.images?.posters
            ?.slice(0, 5)
            .map((img: any) => `https://image.tmdb.org/t/p/w500${img.file_path}`) ?? []),
        ];
        const videos =
          apiData.videos?.results
            ?.filter((v: any) => v.type === "Trailer" || v.type === "Teaser")
            .slice(0, 5)
            .map((v: any) => ({ id: v.id, key: v.key, name: v.name, site: v.site, type: v.type })) ?? [];
        const firstVideo = videos[0];
        const trailer = firstVideo ? `https://www.youtube.com/watch?v=${firstVideo.key}` : undefined;

        // Always delete old record when:
        // - ID changed (different TMDB match)
        // - Type changed (movie → series or vice-versa)
        const idChanged = originalMedia.id !== newId;
        const typeChanged =
          (originalMedia.type === "MOVIE" && newMediaType === "tv") ||
          (originalMedia.type !== "MOVIE" && newMediaType === "movie");

        if (idChanged || typeChanged) {
          if (originalMedia.type === "MOVIE") {
            await removeMovie(originalMedia.id);
          } else {
            await removeSeries(originalMedia.id);
          }
        }

        const baseInfo = {
          id: newId,
          title: apiData.title || apiData.name || "Unknown",
          originalTitle: apiData.original_title || apiData.original_name,
          overview: apiData.overview,
          poster,
          backdrop,
          rating: apiData.vote_average,
          year: parseInt(apiData.release_date?.split("-")[0] || apiData.first_air_date?.split("-")[0] || "0"),
          status: "MATCHED" as const,
          folderId: originalMedia.folderId,
          filePath: originalMedia.filePath,
          genres,
          tagline: apiData.tagline,
          imdbId: apiData.imdb_id,
          voteCount: apiData.vote_count,
          popularity: apiData.popularity,
          images: images.length > 0 ? images : undefined,
          videos: videos.length > 0 ? videos : undefined,
          cast: cast.length > 0 ? cast : undefined,
          crew: crew.length > 0 ? crew : undefined,
          trailer,
        };

        if (newMediaType === "movie") {
          const updatedMovie: Movie = {
            ...baseInfo,
            type: "MOVIE",
            duration: apiData.runtime,
            releaseDate: apiData.release_date,
            budget: apiData.budget,
            revenue: apiData.revenue,
          };
          await saveMovies([updatedMovie]);
        } else {
          const updatedSeries: Series = {
            ...baseInfo,
            type: "SERIES",
            numberOfSeasons: apiData.number_of_seasons || 0,
            numberOfEpisodes: apiData.number_of_episodes || 0,
            firstAirDate: apiData.first_air_date,
            lastAirDate: apiData.last_air_date,
            networks: apiData.networks?.map((n: any) => n.name) ?? [],
            productionCompanies: apiData.production_companies?.map((p: any) => p.name) ?? [],
            seasons:
              apiData.seasons?.map((season: any) => ({
                id: `${newId}-s${season.season_number}`,
                seasonNumber: season.season_number,
                name: season.name,
                overview: season.overview,
                poster: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : undefined,
                episodeCount: season.episode_count,
                episodes: [],
                available: false,
                downloadedEpisodes: 0,
              })) ?? [],
          };
          await saveSeries([updatedSeries]);
        }

        // Reload from storage to update UI
        await loadMediaFromStorage();

        console.log("✅ Media updated successfully");
      } catch (error) {
        console.error("Failed to update media:", error);
        throw error;
      }
    },
    [folderId, isOnline, loadMediaFromStorage],
  );

  const deleteMedia = async (media: Media): Promise<void> => {
    if (media.type === "MOVIE") {
      await removeMovie(media.id);
    } else {
      await removeSeries(media.id);
    }
    await loadMediaFromStorage();
  };

  return {
    movies,
    series,
    loading,
    scanning,
    scanProgress,
    error,
    scanFolder,
    updateMedia,
    deleteMedia,
    refreshMedia: loadMediaFromStorage, // Expose reload function
  };
}
