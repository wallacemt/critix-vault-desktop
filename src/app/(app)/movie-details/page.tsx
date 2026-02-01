"use client";

import { MovieDetails } from "@/components/features/media/MovieDetails";
import { useMediaContext } from "@/context/mediaContext";
import { useActions } from "@/hooks/useActions";
import { Movie } from "@/types";
import { useRouter } from "next/navigation";

export default function MovieDetailsPage() {
  const { handleBack, handlePlayMovie } = useActions();
  const { movie } = useMediaContext();
  const router = useRouter();

  const handleDelete = () => {
    // Navigate back to library after delete
    router.push("/library");
  };

  return movie ? (
    <MovieDetails movie={movie} onBack={handleBack} onPlay={handlePlayMovie} onDelete={handleDelete} />
  ) : (
    <div className="flex items-center justify-center flex-1">
      <p>Nenhuma media encontrada !</p>
    </div>
  );
}
