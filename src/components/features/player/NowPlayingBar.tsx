"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  CheckCircle2,
  SkipForward,
  X,
  FolderOpen,
  Loader2,
  MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import { useNowPlayingEstimator } from "@/hooks/useNowPlayingEstimator";
import { markWatched, advanceEpisode } from "@/services/nowPlayingService";
import { useMediaContext } from "@/context/mediaContext";
import { tauriService } from "@/services/tauri";

function formatSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatRuntime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function NowPlayingBar() {
  const externalSession = usePlayerStore((s) => s.externalSession);
  const { toggleExternalPause, closeExternal, setExternalManualOffset } = usePlayerStore();
  const { movie, serie, setCurrentMovie, setCurrentSerie } = useMediaContext();

  const estimatedSeconds = useNowPlayingEstimator(externalSession);
  const [expanded, setExpanded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [positionInput, setPositionInput] = useState("");

  if (!externalSession) return null;

  const { item, queue, index, isPaused, runtimeSeconds } = externalSession;
  const nextItem = item.mediaType === "SERIES" ? queue[index + 1] : undefined;

  const collab = { movie, serie, setCurrentMovie, setCurrentSerie };

  const handleMarkWatched = async () => {
    setIsBusy(true);
    try {
      await markWatched(externalSession, collab);
    } catch (err) {
      console.error("Falha ao marcar como assistido:", err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleNextEpisode = async () => {
    if (!nextItem) return;
    setIsBusy(true);
    try {
      await advanceEpisode(externalSession, collab);
      setPositionInput("");
    } catch (err) {
      console.error("Falha ao avançar episódio:", err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenFileLocation = async () => {
    try {
      await tauriService.openFileLocation(item.filePath);
    } catch (err) {
      console.error("Falha ao abrir local do arquivo:", err);
    }
  };

  const handleApplyPositionInput = () => {
    const minutes = parseFloat(positionInput);
    if (Number.isFinite(minutes) && minutes >= 0) {
      setExternalManualOffset(minutes * 60);
    }
    setPositionInput("");
  };

  const nextEpisodeLabel = nextItem
    ? `S${String(nextItem.seasonNumber ?? 0).padStart(2, "0")}E${String(nextItem.episodeNumber ?? 0).padStart(2, "0")}`
    : null;

  return (
    <AnimatePresence>
      <motion.div
        key="now-playing-bar"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md"
      >
        {/* Collapsed bar */}
        <div className="flex items-center gap-3 px-4 py-2 h-14">
          {/* Playing indicator icon */}
          <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <MonitorPlay className="w-4 h-4 text-amber-400" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{item.title}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">
                <span className="text-amber-400">~{formatSeconds(estimatedSeconds)}</span>
                {runtimeSeconds ? ` / ${formatRuntime(runtimeSeconds)}` : ""}
              </p>
              <span className="text-xs text-slate-600">posição estimada</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={toggleExternalPause}
              title={isPaused ? "Retomar estimativa" : "Pausar estimativa"}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={handleMarkWatched}
              disabled={isBusy}
              title="Já assisti"
            >
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            </Button>

            {nextItem && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={handleNextEpisode}
                disabled={isBusy}
                title={`Próximo ${nextEpisodeLabel}`}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Recolher" : "Expandir"}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-slate-800"
              onClick={closeExternal}
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-800/60"
            >
              <div className="px-4 py-4 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-14 rounded-md bg-slate-800 flex items-center justify-center">
                    <MonitorPlay className="w-5 h-5 text-slate-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{item.filePath.split(/[\\/]/).pop()}</p>

                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-xs text-amber-400 font-mono">~{formatSeconds(estimatedSeconds)}</p>
                      {runtimeSeconds && (
                        <p className="text-xs text-slate-500">/ {formatRuntime(runtimeSeconds)}</p>
                      )}
                      {isPaused && (
                        <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">pausado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Position correction */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 shrink-0">Ajustar posição (min):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={positionInput}
                    onChange={(e) => setPositionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPositionInput()}
                    placeholder={String(Math.floor(estimatedSeconds / 60))}
                    className="w-20 h-7 px-2 text-xs rounded-md bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                    onClick={handleApplyPositionInput}
                  >
                    Aplicar
                  </Button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950"
                    onClick={handleMarkWatched}
                    disabled={isBusy}
                  >
                    {isBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                    Já assisti
                  </Button>

                  {nextItem && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={handleNextEpisode}
                      disabled={isBusy}
                    >
                      {isBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <SkipForward className="w-3 h-3 mr-1" />}
                      Próximo {nextEpisodeLabel}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-700 bg-transparent text-slate-400 hover:text-white"
                    onClick={handleOpenFileLocation}
                  >
                    <FolderOpen className="w-3 h-3 mr-1" />
                    Abrir local
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
