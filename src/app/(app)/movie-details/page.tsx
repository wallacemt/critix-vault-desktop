"use client";

import { MovieDetails } from "@/components/features/media/MovieDetails";
import { useMediaContext } from "@/context/mediaContext";
import { useActions } from "@/hooks/useActions";
import { Movie } from "@/types";

export default function MovieDetailsPage() {
  const { handleBack, handlePlayMovie } = useActions();
  const { movie } = useMediaContext();
  return movie ? (
    <MovieDetails movie={movie} onBack={handleBack} onPlay={handlePlayMovie} />
  ) : (
    <div className="flex items-center justify-center flex-1">
      <p>Nenhuma media encontrada !</p>
    </div>
  );
}
