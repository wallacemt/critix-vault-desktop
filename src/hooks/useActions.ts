import { Episode, Media, Movie, Series } from "@/types";
import { useState } from "react";
import { useFolders } from "./useFolders";
import { useRouter } from "next/navigation";
import { tauriService } from "@/services/tauri";
import { useMediaContext } from "@/context/mediaContext";

export function useActions() {
  const { folders, loading: foldersLoading, addFolder, removeFolder } = useFolders();
  const { setMovie, setSerie } = useMediaContext();
  const router = useRouter();
  const handleSplashReady = () => {
    if (folders && folders.length > 0) {
      router.push("/library");
    } else {
      router.push("/landing");
    }
  };

  const handleAddFolder = async () => {
    try {
      await addFolder();
    } catch (error) {
      console.error("Failed to add folder:", error);
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
    removeFolder,

  };
}
