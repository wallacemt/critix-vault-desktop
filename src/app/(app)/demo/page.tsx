"use client";
import { DemoLibrary } from "@/components/features/demo/DemoLibrary";
import { useActions } from "@/hooks/useActions";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
export default function DemoPage() {
  const { handleBack, handleMediaClick, handlePlayMovie, handlePlaySeries } = useActions();
  return (
    <DemoLibrary
      onBack={handleBack}
      onMediaClick={(media) => handleMediaClick(media, true)}
      onMediaPlay={async (media) => {
        if (media.type === "MOVIE") {
          await handlePlayMovie(media as Movie);
        } else {
          await handlePlaySeries(media as Series);
        }
      }}
    />
  );
}
