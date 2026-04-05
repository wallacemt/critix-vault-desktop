"use client";
import { DemoLibrary } from "@/components/features/demo/DemoLibrary";
import { useActions } from "@/hooks/useActions";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
export default function DemoPage() {
  const { handleBack, handleMediaClick, handlePlayMovie, handlePlayEpisode } = useActions();
  return (
    <DemoLibrary
      onBack={handleBack}
      onMediaClick={(media) => handleMediaClick(media, true)}
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
