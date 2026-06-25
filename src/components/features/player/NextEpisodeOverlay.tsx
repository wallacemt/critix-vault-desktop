"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SkipForward, X } from "lucide-react";

const COUNTDOWN_SECONDS = 5;

interface NextEpisodeOverlayProps {
  nextTitle: string;
  onAdvance: () => void;
  onDismiss: () => void;
}

export function NextEpisodeOverlay({
  nextTitle,
  onAdvance,
  onDismiss,
}: NextEpisodeOverlayProps) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (remaining <= 0) {
      onAdvance();
      return;
    }

    const timer = window.setTimeout(() => setRemaining((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, onAdvance]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-20 right-6 z-20 w-72 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400 mb-0.5">A seguir</p>
          <p className="text-sm font-semibold text-white truncate">{nextTitle}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
          aria-label="Cancelar próximo episódio"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAdvance}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition-colors"
        >
          <SkipForward className="w-4 h-4" />
          Próximo episódio ({remaining}s)
        </button>
        <button
          onClick={onDismiss}
          className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}
