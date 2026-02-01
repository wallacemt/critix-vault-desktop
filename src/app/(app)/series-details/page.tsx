"use client";

import { SeriesDetails } from "@/components/features/media/SeriesDetails";
import { useMediaContext } from "@/context/mediaContext";
import { useActions } from "@/hooks/useActions";
import { useRouter } from "next/navigation";

export default function SeriesDetailsPage() {
  const { handleBack, handlePlayEpisode } = useActions();
  const { serie } = useMediaContext();
  const router = useRouter();

  const handleDelete = () => {
    // Navigate back to library after delete
    router.push("/library");
  };

  return serie ? (
    <SeriesDetails series={serie} onBack={handleBack} onPlayEpisode={handlePlayEpisode} onDelete={handleDelete} />
  ) : null;
}
