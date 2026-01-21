"use client";
import { DemoLibrary } from "@/components/features/demo/DemoLibrary";
import { useActions } from "@/hooks/useActions";
import {  Movie, Series } from "@/types";
export default function DemoPage() {
  const { handleBack, handleMediaClick, handlePlayMovie, handlePlayEpisode } = useActions();
  return (
    <DemoLibrary
      onBack={handleBack}
      onMediaClick={handleMediaClick}
      onMediaPlay={(media) => {
        if (media.type === "MOVIE") {
          handlePlayMovie(media as Movie);
        } else {
          handlePlayEpisode(media as Series);
        }
      }}
    />
  );
}
