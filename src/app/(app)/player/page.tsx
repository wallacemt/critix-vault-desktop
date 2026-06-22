"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  CheckCircle2,
  SkipForward,
  SkipBack,
  List,
  ExternalLink,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { useMediaContext } from "@/context/mediaContext";
import { tauriService } from "@/services/tauri";
import { saveProgress } from "@/services/playerService";
import dynamic from "next/dynamic";
import { NextEpisodeOverlay } from "@/components/features/player/NextEpisodeOverlay";

const VideoSurface = dynamic(
  () => import("@/components/features/player/VideoSurface").then((m) => ({ default: m.VideoSurface })),
  { ssr: false, loading: () => <div className="flex-1 bg-black" /> },
);

function episodeLabel(item: { seasonNumber?: number; episodeNumber?: number }) {
  if (item.seasonNumber == null || item.episodeNumber == null) return null;
  return `S${String(item.seasonNumber).padStart(2, "0")}E${String(item.episodeNumber).padStart(2, "0")}`;
}

export default function PlayerPage() {
  const {
    open,
    queue,
    index,
    positionSeconds,
    durationSeconds,
    closePlayer,
    advance,
    goTo,
  } = usePlayerStore();
  const { setWatchSession } = useMediaContext();
  const router = useRouter();

  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEpisodePicker, setShowEpisodePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  // Prevents the auto-redirect to /library when we're handling our own navigation
  // (e.g. opening an external player and redirecting to /watching instead).
  const suppressAutoRedirectRef = useRef(false);

  if (!open || queue.length === 0) {
    if (!suppressAutoRedirectRef.current) router.replace("/library");
    return null;
  }

  const current = queue[index];
  const hasNext = index + 1 < queue.length;
  const hasPrev = index > 0;
  const isSeries = current.mediaType === "SERIES";
  const nextItem = hasNext ? queue[index + 1] : undefined;
  const nextLabel = nextItem ? episodeLabel(nextItem) : null;
  const currentLabel = episodeLabel(current);

  const handleClose = () => {
    closePlayer();
    router.back();
  };

  const handleOpenExternal = async () => {
    // Snapshot current item before closePlayer() clears the queue.
    const item = current;
    suppressAutoRedirectRef.current = true;
    closePlayer();
    try {
      await tauriService.openMedia(item.filePath);
      const session =
        item.mediaType === "MOVIE"
          ? { type: "movie" as const, mediaId: item.mediaId, title: item.title, returnPath: "/movie-details" }
          : {
              type: "episode" as const,
              mediaId: item.mediaId,
              title: item.title,
              episodeId: item.episodeId,
              seasonNumber: item.seasonNumber,
              episodeNumber: item.episodeNumber,
              returnPath: "/series-details",
            };
      setWatchSession(session);
      router.replace("/watching");
    } catch (err) {
      console.error("Fallback to external player failed:", err);
      suppressAutoRedirectRef.current = false;
      router.back();
    }
  };

  const handleUnsupported = () => handleOpenExternal();

  const handleEnded = () => {
    if (hasNext) {
      setShowNextOverlay(true);
    } else {
      closePlayer();
      router.back();
    }
  };

  const handleMarkWatched = async () => {
    setIsBusy(true);
    try {
      await saveProgress({
        mediaId: current.mediaId,
        episodeId: current.episodeId,
        mediaType: current.mediaType,
        positionSeconds,
        durationSeconds,
        completed: true,
      });

      if (isSeries) {
        // Show confirmation effect, then auto-advance after 1.4 s
        setShowConfirm(true);
        setTimeout(() => {
          setShowConfirm(false);
          if (hasNext) {
            advance();
          } else {
            closePlayer();
            router.back();
          }
        }, 1400);
      } else {
        closePlayer();
        router.back();
      }
    } catch (err) {
      console.error("Failed to mark as watched:", err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleNextEpisode = () => {
    setShowNextOverlay(false);
    advance();
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* ── Cinematic backdrop ── */}
      {current.backdropUrl && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <img
            src={current.backdropUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-25"
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>
      )}

      {/* ── Top HUD ── */}
      <motion.div
        initial={{ y: -52, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-20 flex items-center gap-2 px-3 pt-2 pb-1.5 select-none"
      >
        {/* Left cluster: prev + episode picker */}
        <div className="flex items-center gap-1 shrink-0">
          {hasPrev && (
            <HudBtn onClick={() => goTo(index - 1)} title="Episódio anterior">
              <SkipBack className="w-3.5 h-3.5" />
            </HudBtn>
          )}

          {isSeries && (
            <div className="relative" ref={pickerRef}>
              <HudBtn
                onClick={() => setShowEpisodePicker((v) => !v)}
                title="Escolher episódio"
                active={showEpisodePicker}
              >
                <List className="w-3.5 h-3.5" />
                {currentLabel && (
                  <span className="text-xs font-mono leading-none">{currentLabel}</span>
                )}
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showEpisodePicker ? "rotate-180" : ""}`}
                />
              </HudBtn>

              {/* Episode picker dropdown */}
              <AnimatePresence>
                {showEpisodePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1.5 left-0 z-50 w-80 max-h-72 overflow-y-auto
                               rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl
                               shadow-2xl py-1"
                  >
                    {queue.map((ep, i) => {
                      const label = episodeLabel(ep);
                      const isActive = i === index;
                      // Extract episode title (after the dash in series items)
                      const dashIdx = ep.title.indexOf(" — ");
                      const epTitle = dashIdx >= 0 ? ep.title.slice(dashIdx + 3) : ep.title;

                      return (
                        <button
                          key={i}
                          onClick={() => { goTo(i); setShowEpisodePicker(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                            ${isActive
                              ? "bg-amber-500/15 text-amber-300"
                              : "text-white/70 hover:text-white hover:bg-white/5"
                            }`}
                        >
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          )}
                          {!isActive && <span className="w-1.5 h-1.5 shrink-0" />}
                          {label && (
                            <span className={`text-xs font-mono shrink-0 ${isActive ? "text-amber-400" : "text-zinc-500"}`}>
                              {label}
                            </span>
                          )}
                          <span className="text-xs truncate">{epTitle}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Center: title */}
        <p className="flex-1 min-w-0 text-xs font-medium text-white/60 truncate text-center drop-shadow px-2">
          {current.title}
        </p>

        {/* Right cluster: actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Mark as watched */}
          <HudBtn
            onClick={handleMarkWatched}
            disabled={isBusy || showConfirm}
            title="Marcar como assistido"
            accent="amber"
          >
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span className="text-xs hidden sm:inline">Já assisti</span>
          </HudBtn>

          {/* Next episode */}
          {nextItem && (
            <HudBtn onClick={handleNextEpisode} title={`Próximo ${nextLabel ?? ""}`} accent="emerald">
              <SkipForward className="w-3.5 h-3.5" />
              {nextLabel && <span className="text-xs font-mono hidden sm:inline">{nextLabel}</span>}
            </HudBtn>
          )}

          {/* Open in external player */}
          <HudBtn onClick={handleOpenExternal} title="Abrir no player externo (VLC / sistema)">
            <ExternalLink className="w-3.5 h-3.5" />
          </HudBtn>

          {/* Close */}
          <HudBtn onClick={handleClose} title="Fechar player" danger>
            <X className="w-3.5 h-3.5" />
          </HudBtn>
        </div>
      </motion.div>

      {/* ── Video surface ── */}
      <VideoSurface
        item={current}
        onEnded={handleEnded}
        onClose={handleClose}
        onUnsupported={handleUnsupported}
      />

      {/* ── Confirmation animation (series "mark as watched") ── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            key="confirm-overlay"
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              {/* Ring + check */}
              <div className="relative">
                <motion.div
                  className="w-28 h-28 rounded-full border-2 border-emerald-400/60"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 18 }}
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-10 h-10 text-emerald-400 stroke-[2.5]" />
                  </div>
                </motion.div>
              </div>
              <motion.p
                className="text-white text-base font-semibold drop-shadow-lg"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {hasNext ? "Marcado! Indo pro próximo..." : "Concluído!"}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Next episode countdown overlay ── */}
      <AnimatePresence>
        {showNextOverlay && hasNext && (
          <NextEpisodeOverlay
            key="next-overlay"
            nextTitle={queue[index + 1].title}
            onAdvance={handleNextEpisode}
            onDismiss={() => setShowNextOverlay(false)}
          />
        )}
      </AnimatePresence>

      {/* Close picker on outside click */}
      {showEpisodePicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEpisodePicker(false)}
        />
      )}
    </div>
  );
}

// ── Shared button style ──────────────────────────────────────────────────────
interface HudBtnProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  accent?: "amber" | "emerald";
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function HudBtn({ onClick, title, disabled, accent, danger, active, children }: HudBtnProps) {
  const base =
    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all backdrop-blur-sm border text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed";

  const color = danger
    ? "border-white/10 bg-white/5 text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
    : accent === "amber"
    ? "border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40"
    : accent === "emerald"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/40"
    : active
    ? "border-white/20 bg-white/15 text-white"
    : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20";

  return (
    <button onClick={onClick} title={title} disabled={disabled} className={`${base} ${color}`}>
      {children}
    </button>
  );
}
