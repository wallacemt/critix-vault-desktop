import { Episode, Media, Movie, Series } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { tauriService } from "@/services/tauri";
import { folderScanService } from "@/services/folderScanService";
import { useMediaContext } from "@/context/mediaContext";
import { useFoldersContext } from "@/context/foldersContext";
import { getMovies, getSeries, saveMovies, saveSeries } from "@/services/databaseService";

export function useActions() {
  const { folders, addFolder, selectedFolder } = useFoldersContext();
  const { setMovie, setSerie } = useMediaContext();
  const router = useRouter();
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
      setScanning(true);
      setScanProgress(0);

      // Open folder dialog
      const selectedPath = await tauriService.selectFolder();
      if (!selectedPath) {
        setScanning(false);
        return;
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
  const handleMediaClick = (media: Media) => {
    if (media.type === "MOVIE") {
      setMovie(media as Movie);
      router.push("/movie-details");
    } else {
      setSerie(media as Series);
      router.push("/series-details");
    }
  };

  const handlePlayMovie = async (movie: Movie) => {
    try {
      await tauriService.openMedia(movie.filePath);
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
