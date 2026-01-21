"use client";
import { Play, Info, Film, Tv } from "lucide-react";
import { Media, MediaType } from "@/types";
import { StreamingCard } from "./streaming-card";
interface StreamingGridProps {
  media: Media[];
  onMediaClick?: (media: Media) => void;
  onMediaPlay?: (media: Media) => void;
  emptyMessage?: string;
}

export function StreamingGrid({
  media,
  onMediaClick,
  onMediaPlay,
  emptyMessage = "Conteudo não encontrado",
}: StreamingGridProps) {
  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Film className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {media.map((item) => (
        <StreamingCard key={item.id} media={item} onClick={onMediaClick} onPlay={onMediaPlay} />
      ))}
    </div>
  );
}
