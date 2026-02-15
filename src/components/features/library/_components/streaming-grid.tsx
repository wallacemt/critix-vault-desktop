/**
 * Streaming Grid Component
 * Grid/List layout for media cards
 */

"use client";

import { Media } from "@/types";
import { StreamingCard } from "./streaming-card";
import { motion } from "framer-motion";
import { Film, Tv } from "lucide-react";

interface StreamingGridProps {
  media: Media[];
  onMediaClick?: (media: Media) => void;
  onMediaPlay?: (media: Media) => void;
  onMediaEdit?: (media: Media) => void;
  viewMode?: "grid" | "list";
  emptyMessage?: string;
  demoMode?: boolean;
}

export function StreamingGrid({
  media,
  onMediaClick,
  onMediaPlay,
  onMediaEdit,
  viewMode = "grid",
  emptyMessage = "No media found",
  demoMode = false,
}: StreamingGridProps) {
  if (media.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-24 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 flex items-center justify-center mb-6">
          <div className="flex gap-2">
            <Film className="w-12 h-12 text-slate-600" />
            <Tv className="w-12 h-12 text-slate-600" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">Nenhuma mídia encontrada</h3>
        <p className="text-[var(--text-secondary)] font-sans max-w-md">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <div
      className={
        viewMode === "grid"
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
          : "flex flex-col gap-3"
      }
    >
      {media.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <StreamingCard
            media={item}
            onClick={onMediaClick}
            onPlay={onMediaPlay}
            onEdit={onMediaEdit}
            viewMode={viewMode}
            demoMode={demoMode}
          />
        </motion.div>
      ))}
    </div>
  );
}
