import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { tauriService } from "@/services/tauri";
import { folderScanService } from "@/services/folderScanService";
import { useMediaContext } from "@/context/mediaContext";
import { useFoldersContext } from "@/context/foldersContext";
import { getMovies, getSeries, saveMovies, saveSeries } from "@/services/databaseService";
import { Media } from "@/types/media";
import { Movie } from "@/types/movie";
import { Episode, Series } from "@/types/serie";
import { registerEasterEggClue } from "@/lib/easter-egg";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

export function useActions() {
  const { folders, addFolder, selectedFolder } = useFoldersContext();
  const { setCurrentMovie: setMovie, setCurrentSerie: setSerie, serie, setWatchSession } = useMediaContext();
  const { isOnline } = useApiConnectivity();
  const router = useRouter();
  const pathname = usePathname();
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

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
        alert("Modo offline ativo. Reconecte para escanear e associar midias automaticamente.");
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

      const preScanFiles = await tauriService.scanFolder(selectedPath);
      if (preScanFiles.length === 0) {
        await registerEasterEggClue("empty-scan");
      }

      // Add folder to context (will persist automatically via database)
      const folder = await addFolder(selectedPath);

      // Get existing media from database before scanning
      const existingMovies = await getMovies();
      const existingSeries = await getSeries();

      // Scan the folder for media files using RUST
      const result = await folderScanService.scanAndMatchFolder(
        folder.id,
        folder.path,
        (progress) => {
          const percent = progress.totalFiles > 0 ? (progress.processedFiles / progress.totalFiles) * 100 : 0;
          setScanProgress(percent);
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

      // Redirect to library
      router.push("/library");
    } catch (error) {
      console.error("Failed to add folder:", error);
      setScanning(false);
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
    try {
      await tauriService.openMedia(movie.filePath);
      setWatchSession({
        type: "movie",
        mediaId: movie.id,
        title: movie.title,
        returnPath: pathname,
        backdrop: movie.backdrop || movie.poster,
      });
      router.push("/watching");
    } catch (error) {
      console.error("Failed to play movie:", error);
    }
  };

  const handlePlayEpisode = async (episode: Episode | Series) => {
    if (!episode.filePath) {
      console.error("Episode file path not available");
      return;
    }

    try {
      await tauriService.openMedia(episode.filePath);

      if ("episode_number" in episode) {
        setWatchSession({
          type: "episode",
          mediaId: serie?.id || "",
          title: serie?.title || "Série",
          returnPath: pathname,
          episodeId: episode.id,
          episodeTitle: episode.title,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
          backdrop: episode.still_path ? `https://image.tmdb.org/t/p/original${episode.still_path}` : serie?.backdrop,
        });
        router.push("/watching");
      }
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
    handleSplashReady,
    handleViewDemo,
    scanning,
    scanProgress,
  };
}
