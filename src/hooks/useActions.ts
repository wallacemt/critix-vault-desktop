import { useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { tauriService } from "@/services/tauri";
import type { AppSettings } from "@/services/tauri";
import { folderScanService } from "@/services/folderScanService";
import { useMediaContext } from "@/context/mediaContext";
import { useFoldersContext } from "@/context/foldersContext";
import {
  getMovies,
  getSeries,
  saveMovies,
  saveSeries,
  getWatchHistory,
  type WatchHistory,
} from "@/services/databaseService";
import { Media } from "@/types/media";
import { Movie } from "@/types/movie";
import { Episode, Series } from "@/types/serie";
import { registerEasterEggClue } from "@/lib/easter-egg";
import { useApiConnectivity } from "@/context/apiConnectivityContext";
import { usePlayerStore, type PlayableItem } from "@/stores/playerStore";

type LastWatchedReference = {
  seasonNumber: number;
  episodeNumber: number;
  watchedAtMs: number;
};

export type SeriesPlayResult =
  | { status: "played"; episode: Episode }
  | { status: "needs-season-selection"; availableSeasons: number[] }
  | { status: "invalid-season"; availableSeasons: number[] }
  | { status: "completed" }
  | { status: "no-episodes" };

const isPlayableEpisode = (episode: Episode) => Boolean(episode.available && episode.filePath);

const getSortedPlayableEpisodes = (seriesToPlay: Series, seasonNumber?: number): Episode[] => {
  return seriesToPlay.seasons
    .flatMap((season) => season.episodes)
    .filter((episode) => (seasonNumber == null ? true : episode.season_number === seasonNumber))
    .filter(isPlayableEpisode)
    .slice()
    .sort((a, b) => {
      if (a.season_number !== b.season_number) return a.season_number - b.season_number;
      return a.episode_number - b.episode_number;
    });
};

const getAvailableSeasonNumbers = (episodes: Episode[]): number[] => {
  return [...new Set(episodes.map((episode) => episode.season_number))].sort((a, b) => a - b);
};

const getLastWatchedReference = (history: WatchHistory[]): LastWatchedReference | null => {
  const episodeHistory = history
    .filter(
      (entry) =>
        entry.mediaType === "SERIES" && entry.completed && entry.seasonNumber != null && entry.episodeNumber != null,
    )
    .map((entry) => {
      const watchedAtRaw = entry.watchedAt;
      const watchedAtMs = new Date(watchedAtRaw as unknown as string).getTime();

      return {
        seasonNumber: Number(entry.seasonNumber),
        episodeNumber: Number(entry.episodeNumber),
        watchedAtMs: Number.isFinite(watchedAtMs) ? watchedAtMs : 0,
      };
    })
    .filter((entry) => Number.isFinite(entry.seasonNumber) && Number.isFinite(entry.episodeNumber));

  if (episodeHistory.length === 0) return null;

  episodeHistory.sort((a, b) => {
    if (a.watchedAtMs !== b.watchedAtMs) return b.watchedAtMs - a.watchedAtMs;
    if (a.seasonNumber !== b.seasonNumber) return b.seasonNumber - a.seasonNumber;
    return b.episodeNumber - a.episodeNumber;
  });

  return episodeHistory[0];
};

export function useActions() {
  const { folders, addFolder, selectedFolder } = useFoldersContext();
  const {
    setCurrentMovie: setMovie,
    setCurrentSerie: setSerie,
    serie,
    setWatchSession,
    getTemporarySeriesSeason,
    setTemporarySeriesSeason,
    clearTemporarySeriesSeason,
  } = useMediaContext();
  const { isOnline } = useApiConnectivity();
  const router = useRouter();
  const pathname = usePathname();
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [playError, setPlayError] = useState<string | null>(null);
  // pendingPlay lives in the shared Zustand store so PlayerChoiceGate
  // (mounted in the layout) sees state set by any media page instance.
  const pendingPlay = usePlayerStore((s) => s.pendingPlay);
  const setPendingPlay = usePlayerStore((s) => s.setPendingPlay);

  // Dispatches playback according to the user's saved preference.
  // "ASK" sets pendingPlay → PlayerChoiceGate picks it up and shows the modal.
  const dispatchPlay = async (
    item: PlayableItem,
    queue: PlayableItem[],
    pref: string,
  ): Promise<void> => {
    if (pref === "INTERNAL") {
      usePlayerStore.getState().openMedia(item, queue);
      return;
    }
    if (pref === "EXTERNAL") {
      await tauriService.openMedia(item.filePath);
      return;
    }
    // Default: "ASK" — surface the choice modal.
    setPendingPlay({ item, queue });
  };

  const handlePlayerChoice = async (
    choice: "INTERNAL" | "EXTERNAL",
    remember: boolean,
  ): Promise<void> => {
    if (!pendingPlay) return;

    if (remember) {
      try {
        const current = await tauriService.getSettings();
        await tauriService.saveSettings({ ...current, preferred_player: choice });
      } catch (err) {
        console.error("Failed to persist player preference:", err);
      }
    }

    if (choice === "INTERNAL") {
      usePlayerStore.getState().openMedia(pendingPlay.item, pendingPlay.queue);
    } else {
      // Mirror the saved-EXTERNAL path: set watch session before opening externally
      const { item } = pendingPlay;
      flushSync(() => {
        if (item.mediaType === "MOVIE") {
          setWatchSession({ type: "movie", mediaId: item.mediaId, title: item.title, returnPath: pathname });
        } else {
          setWatchSession({ type: "episode", mediaId: item.mediaId, title: item.title, returnPath: pathname, episodeId: item.episodeId, seasonNumber: item.seasonNumber });
        }
      });
      await tauriService.openMedia(item.filePath);
      router.push("/watching");
    }
    setPendingPlay(null);
  };

  const playEpisodeForSeries = async (seriesToPlay: Series, episode: Episode) => {
    if (!episode.filePath) {
      throw new Error("Episode file path not available");
    }

    // Build the queue from the remaining episodes in the same season (those
    // that come at or after the selected episode and have a file available).
    const seasonEpisodes = seriesToPlay.seasons
      .find((s) => s.seasonNumber === episode.season_number)
      ?.episodes ?? [];

    const queue: PlayableItem[] = seasonEpisodes
      .filter((ep) => ep.available && ep.filePath)
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((ep) => ({
        mediaId: seriesToPlay.id,
        episodeId: ep.id,
        title: `${seriesToPlay.title} S${ep.season_number}E${ep.episode_number} — ${ep.title}`,
        filePath: ep.filePath!,
        mediaType: "SERIES" as const,
        seasonNumber: ep.season_number,
        episodeNumber: ep.episode_number,
      }));

    const item: PlayableItem = {
      mediaId: seriesToPlay.id,
      episodeId: episode.id,
      title: `${seriesToPlay.title} S${episode.season_number}E${episode.episode_number} — ${episode.title}`,
      filePath: episode.filePath,
      mediaType: "SERIES",
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
    };

    const settings = await tauriService.getSettings().catch(() => null);
    const pref = settings?.preferred_player ?? "ASK";

    if (pref === "EXTERNAL") {
      // External path: keep the legacy watch-session + route redirect flow.
      await tauriService.openMedia(episode.filePath);
      flushSync(() => {
        setSerie(seriesToPlay);
        setWatchSession({
          type: "episode",
          mediaId: seriesToPlay.id,
          title: seriesToPlay.title,
          returnPath: pathname,
          episodeId: episode.id,
          episodeTitle: episode.title,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
          backdrop: episode.still_path
            ? `https://image.tmdb.org/t/p/original${episode.still_path}`
            : seriesToPlay.backdrop,
        });
      });
      router.push("/watching");
      return;
    }

    await dispatchPlay(item, queue, pref);
  };

  const handleSplashReady = () => {
    if (folders && folders.length > 0) {
      router.push("/library");
    } else {
      router.push("/landing");
    }
  };

  const handleAddFolder = async () => {
    try {
      if (!isOnline) {
        alert("Modo offline ativo. Reconecte para escanear e associar mídias automaticamente.");
        return;
      }

      setScanning(true);
      setScanProgress(0);

      // Open folder dialog
      const selectedPath = await tauriService.selectFolder();
      if (!selectedPath) {
        setScanning(false);
        return;
      }

      let preScanFiles: string[] = [];
      try {
        preScanFiles = await tauriService.scanFolder(selectedPath);
      } catch {
        setScanning(false);
        alert(
          "Não foi possível acessar a pasta selecionada. Verifique se você tem permissão de leitura nessa pasta e tente novamente.",
        );
        return;
      }

      if (preScanFiles.length === 0) {
        await registerEasterEggClue("empty-scan");
      }

      // Add folder to context (will persist automatically via database)
      const folder = await addFolder(selectedPath);

      // Get existing media from database before scanning
      const existingMovies = await getMovies();
      const existingSeries = await getSeries();

      let scanErrorMessage: string | undefined;

      // Scan the folder for media files using RUST
      const result = await folderScanService.scanAndMatchFolder(
        folder.id,
        folder.path,
        (progress) => {
          const percent = progress.totalFiles > 0 ? (progress.processedFiles / progress.totalFiles) * 100 : 0;
          setScanProgress(percent);
          if (progress.status === "error" || progress.status === "empty") {
            scanErrorMessage = progress.error;
          }
        },
        existingMovies,
        existingSeries,
      );

      // Save scanned media to database (persistent storage)
      if (result.movies.length > 0) {
        await saveMovies([...existingMovies, ...result.movies]);
      }
      if (result.series.length > 0) {
        await saveSeries([...existingSeries, ...result.series]);
      }

      setScanning(false);

      if (result.movies.length === 0 && result.series.length === 0) {
        const message =
          scanErrorMessage ||
          "Nenhuma mídia foi encontrada nesta pasta. Certifique-se de que a pasta contém arquivos de vídeo (.mkv, .mp4, .avi) e que há conexão com a internet.";
        alert(message);
      }

      // Redirect to library
      router.push("/library");
    } catch (error) {
      console.error("Failed to add folder:", error);
      setScanning(false);
      const message =
        error instanceof Error
          ? `Erro ao escanear pasta: ${error.message}`
          : "Erro inesperado ao escanear a pasta. Tente novamente.";
      alert(message);
    }
  };
  const handleViewDemo = () => {
    router.push("/demo");
  };
  const handleMediaClick = (media: Media, demo = false) => {
    if (media.type === "MOVIE") {
      setMovie(media as Movie);
      router.push(`/movie-details${demo ? "?demo=true" : ""}`);
    } else {
      setSerie(media as Series);
      router.push(`/series-details${demo ? "?demo=true" : ""}`);
    }
  };

  const handlePlayMovie = async (movie: Movie) => {
    setPlayError(null);
    try {
      const settings = await tauriService.getSettings().catch(() => null);
      const pref = settings?.preferred_player ?? "ASK";

      if (pref === "EXTERNAL") {
        // External path: keep the legacy watch-session + route redirect flow.
        await tauriService.openMedia(movie.filePath);
        flushSync(() => {
          setWatchSession({
            type: "movie",
            mediaId: movie.id,
            title: movie.title,
            returnPath: pathname,
            backdrop: movie.backdrop || movie.poster,
          });
        });
        router.push("/watching");
        return;
      }

      const item: PlayableItem = {
        mediaId: movie.id,
        title: movie.title,
        filePath: movie.filePath,
        mediaType: "MOVIE",
      };

      await dispatchPlay(item, [item], pref);
    } catch (error) {
      console.error("Failed to play movie:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o arquivo. Verifique se o arquivo existe e se há um player instalado.";
      setPlayError(message);
    }
  };

  const handlePlaySeries = async (
    seriesToPlay: Series,
    options?: { seasonNumber?: number },
  ): Promise<SeriesPlayResult> => {
    const playableEpisodes = getSortedPlayableEpisodes(seriesToPlay);
    if (playableEpisodes.length === 0) {
      return { status: "no-episodes" };
    }

    const history = await getWatchHistory(seriesToPlay.id);
    const lastWatched = getLastWatchedReference(history);

    if (lastWatched) {
      clearTemporarySeriesSeason(seriesToPlay.id);
      const nextEpisode = playableEpisodes.find(
        (episode) =>
          episode.season_number > lastWatched.seasonNumber ||
          (episode.season_number === lastWatched.seasonNumber && episode.episode_number > lastWatched.episodeNumber),
      );

      if (!nextEpisode) {
        return { status: "completed" };
      }

      await playEpisodeForSeries(seriesToPlay, nextEpisode);
      return { status: "played", episode: nextEpisode };
    }

    const availableSeasons = getAvailableSeasonNumbers(playableEpisodes);
    if (availableSeasons.length === 0) {
      return { status: "no-episodes" };
    }

    const seasonFromRequest = options?.seasonNumber;
    if (seasonFromRequest != null) {
      const firstEpisodeInSeason = playableEpisodes.find((episode) => episode.season_number === seasonFromRequest);

      if (!firstEpisodeInSeason) {
        return { status: "invalid-season", availableSeasons };
      }

      setTemporarySeriesSeason(seriesToPlay.id, seasonFromRequest);
      await playEpisodeForSeries(seriesToPlay, firstEpisodeInSeason);
      return { status: "played", episode: firstEpisodeInSeason };
    }

    const rememberedSeason = getTemporarySeriesSeason(seriesToPlay.id);
    if (rememberedSeason != null && availableSeasons.includes(rememberedSeason)) {
      const rememberedEpisode = playableEpisodes.find((episode) => episode.season_number === rememberedSeason);
      if (rememberedEpisode) {
        await playEpisodeForSeries(seriesToPlay, rememberedEpisode);
        return { status: "played", episode: rememberedEpisode };
      }
    }

    if (availableSeasons.length === 1) {
      const singleSeason = availableSeasons[0];
      const firstEpisode = playableEpisodes.find((episode) => episode.season_number === singleSeason);
      if (!firstEpisode) {
        return { status: "no-episodes" };
      }

      setTemporarySeriesSeason(seriesToPlay.id, singleSeason);
      await playEpisodeForSeries(seriesToPlay, firstEpisode);
      return { status: "played", episode: firstEpisode };
    }

    return { status: "needs-season-selection", availableSeasons };
  };

  const handlePlayEpisode = async (episode: Episode | Series) => {
    if (!("episode_number" in episode)) {
      await handlePlaySeries(episode as Series);
      return;
    }

    if (!serie) {
      console.error("Series context not available to play selected episode");
      return;
    }

    try {
      await playEpisodeForSeries(serie, episode);
    } catch (error) {
      console.error("Failed to play episode:", error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return {
    handleAddFolder,
    handleBack,
    handleMediaClick,
    handlePlayEpisode,
    handlePlayMovie,
    handlePlaySeries,
    handleSplashReady,
    handleViewDemo,
    scanning,
    scanProgress,
    playError,
    clearPlayError: () => setPlayError(null),
    pendingPlay,
    setPendingPlay,
    handlePlayerChoice,
  };
}
