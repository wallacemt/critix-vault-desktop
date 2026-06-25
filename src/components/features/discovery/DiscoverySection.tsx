"use client";

import { useState } from "react";
import { DiscoveryItem } from "@/types/discovery";
import { Media } from "@/types/media";
import { StreamingCard } from "@/components/features/library/_components/streaming-card";
import { TrailerDialog } from "@/components/features/discovery/TrailerDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DiscoverySectionProps {
  items: DiscoveryItem[];
  viewMode: "grid" | "list";
  onItemClick: (item: DiscoveryItem) => void;
  onDownload: (item: DiscoveryItem) => void;
  loading: boolean;
  degraded?: boolean;
  /** When true the feed has never successfully loaded — suppress the empty-state message. */
  feedNeverLoaded?: boolean;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/** Maps a DiscoveryItem to the Media shape that StreamingCard expects. */
function discoveryItemToMedia(item: DiscoveryItem): Media {
  return {
    id: String(item.tmdbId),
    type: item.mediaType === "tv" ? "SERIES" : "MOVIE",
    title: item.title,
    originalTitle: item.originalTitle ?? undefined,
    year: item.year ?? undefined,
    poster: item.posterPath ? `${TMDB_IMAGE_BASE}/w500${item.posterPath}` : undefined,
    backdrop: item.backdropPath ? `${TMDB_IMAGE_BASE}/w1280${item.backdropPath}` : undefined,
    overview: item.overview ?? undefined,
    rating: item.voteAverage ?? undefined,
    genres: item.genres
      .filter((g) => g.name)
      .map((g) => ({ id: g.id, name: g.name as string })),
    // status "MATCHED" so no Unmatched badge is shown
    status: "MATCHED",
    // These fields are library-specific and not used in discovery mode
    filePath: "",
    folderId: "",
  };
}

function SkeletonCards({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl bg-slate-800/60" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg bg-slate-800/60" />
      ))}
    </div>
  );
}

export function DiscoverySection({
  items,
  viewMode,
  onItemClick,
  onDownload,
  loading,
  degraded = false,
  feedNeverLoaded = false,
}: DiscoverySectionProps) {
  const [trailerItem, setTrailerItem] = useState<DiscoveryItem | null>(null);

  if (loading) {
    return <SkeletonCards viewMode={viewMode} />;
  }

  return (
    <div>
      {/* Degraded state banner */}
      <AnimatePresence>
        {degraded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300"
          >
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Modo parcial — algumas fontes falharam. Use a busca manual abaixo para resultados
              completos.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        !feedNeverLoaded && !degraded ? (
          <p className="text-center text-slate-500 py-12">
            Nenhuma mídia encontrada para os filtros selecionados.
          </p>
        ) : null
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <StreamingCard
              key={item.tmdbId}
              media={discoveryItemToMedia(item)}
              mode="discovery"
              viewMode="grid"
              trailerKey={item.trailerKey ?? undefined}
              onClick={() => onItemClick(item)}
              onDownload={() => onDownload(item)}
              onPlayTrailer={item.trailerKey ? () => setTrailerItem(item) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <StreamingCard
              key={item.tmdbId}
              media={discoveryItemToMedia(item)}
              mode="discovery"
              viewMode="list"
              trailerKey={item.trailerKey ?? undefined}
              onClick={() => onItemClick(item)}
              onDownload={() => onDownload(item)}
              onPlayTrailer={item.trailerKey ? () => setTrailerItem(item) : undefined}
            />
          ))}
        </div>
      )}

      {trailerItem?.trailerKey && (
        <TrailerDialog
          open={trailerItem !== null}
          onClose={() => setTrailerItem(null)}
          trailerKey={trailerItem.trailerKey}
          title={trailerItem.title}
        />
      )}
    </div>
  );
}
