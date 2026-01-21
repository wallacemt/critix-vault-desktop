"use client";

import { SeriesDetails } from "@/components/features/media/SeriesDetails";
import { useMediaContext } from "@/context/mediaContext";
import { useActions } from "@/hooks/useActions";

export default function SeriesDetailsPage() {
  const { handleBack, handlePlayEpisode } = useActions();
  const { serie } = useMediaContext();

  return serie ? <SeriesDetails series={serie} onBack={handleBack} onPlayEpisode={handlePlayEpisode} /> : null;
}
