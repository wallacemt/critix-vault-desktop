"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { useMediaContext } from "@/context/mediaContext";
import { tauriService } from "@/services/tauri";
import { VideoSurface } from "./VideoSurface";
import { NextEpisodeOverlay } from "./NextEpisodeOverlay";

export function PlayerModal() {
  const { open, queue, index, closePlayer, advance } = usePlayerStore();
  const { setWatchSession } = useMediaContext();
  const router = useRouter();
  const [showNextOverlay, setShowNextOverlay] = useState(false);

  if (!open || queue.length === 0) return null;

  const current = queue[index];
  const hasNext = index + 1 < queue.length;

  const handleUnsupported = async () => {
    closePlayer();
    try {
      await tauriService.openMedia(current.filePath);
      const session =
        current.mediaType === "MOVIE"
          ? { type: "movie" as const, mediaId: current.mediaId, title: current.title, returnPath: "/movie-details" }
          : {
              type: "episode" as const,
              mediaId: current.mediaId,
              title: current.title,
              episodeId: current.episodeId,
              seasonNumber: current.seasonNumber,
              episodeNumber: current.episodeNumber,
              returnPath: "/series-details",
            };
      setWatchSession(session);
      router.push("/watching");
    } catch (err) {
      console.error("Fallback to external player failed:", err);
    }
  };

  const handleEnded = () => {
    if (hasNext) {
      setShowNextOverlay(true);
    } else {
      closePlayer();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="player-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={closePlayer}
            className="absolute top-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-colors"
            aria-label="Fechar player"
          >
            <X className="w-5 h-5" />
          </button>

          <VideoSurface
            item={current}
            onEnded={handleEnded}
            onClose={closePlayer}
            onUnsupported={handleUnsupported}
          />

          <AnimatePresence>
            {showNextOverlay && hasNext && (
              <NextEpisodeOverlay
                key="next-overlay"
                nextTitle={queue[index + 1].title}
                onAdvance={() => {
                  setShowNextOverlay(false);
                  advance();
                }}
                onDismiss={() => setShowNextOverlay(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
