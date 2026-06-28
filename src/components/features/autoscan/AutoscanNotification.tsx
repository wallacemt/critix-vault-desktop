"use client";

/**
 * AutoscanNotification
 *
 * A fixed, non-blocking overlay positioned at the bottom-right of the screen.
 * It is intentionally never a modal: it does not intercept clicks on the rest
 * of the UI and closes itself after the user acts (or after 3 s when "added").
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, WifiOff } from "lucide-react";
import { AutoscanStatus } from "@/hooks/useStartupAutoscan";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutoscanNotificationProps {
  status: AutoscanStatus;
  newMedia: { movies: Movie[]; series: Series[] };
  unmatchedCount: number;
  onConfirm: () => void;
  onDismiss: () => void;
}

type MediaItem = { id: string; title: string; poster?: string; kind: "movie" | "series" };

// ─── Constants ────────────────────────────────────────────────────────────────

const PREVIEW_LIMIT = 5;
const AUTO_DISMISS_MS = 3_000;

const PANEL_BASE = "fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl";

const ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.2 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AutoscanNotification({
  status,
  newMedia,
  unmatchedCount,
  onConfirm,
  onDismiss,
}: AutoscanNotificationProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-dismiss the "added" success state after a short delay.
  useEffect(() => {
    if (status !== "added") return;
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [status, onDismiss]);

  // Reset expanded when the notification transitions to a new visible state.
  useEffect(() => {
    setExpanded(false);
  }, [status]);

  const isVisible = status !== "idle" && status !== "no-items" && status !== "dismissed";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div key={status} {...ANIMATION} className={PANEL_BASE} role="status" aria-live="polite">
          {status === "scanning" && <ScanningPill />}
          {status === "found-items" && (
            <FoundItemsPanel
              movies={newMedia.movies}
              series={newMedia.series}
              expanded={expanded}
              onToggleExpand={() => setExpanded((prev) => !prev)}
              onConfirm={onConfirm}
              onDismiss={onDismiss}
            />
          )}
          {status === "offline-warning" && (
            <OfflineWarningPanel unmatchedCount={unmatchedCount} onDismiss={onDismiss} />
          )}
          {status === "added" && <AddedPanel count={newMedia.movies.length + newMedia.series.length} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function ScanningPill() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-300">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
      <span>Verificando novas mídias&hellip;</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface FoundItemsPanelProps {
  movies: Movie[];
  series: Series[];
  expanded: boolean;
  onToggleExpand: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

function FoundItemsPanel({
  movies,
  series,
  expanded,
  onToggleExpand,
  onConfirm,
  onDismiss,
}: FoundItemsPanelProps) {
  const allItems: MediaItem[] = [
    ...movies.map((m) => ({ id: m.id, title: m.title, poster: m.poster, kind: "movie" as const })),
    ...series.map((s) => ({ id: s.id, title: s.title, poster: s.poster, kind: "series" as const })),
  ];

  const total = allItems.length;
  const visibleItems = expanded ? allItems : allItems.slice(0, PREVIEW_LIMIT);
  const hiddenCount = total - PREVIEW_LIMIT;

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white leading-snug">
          Encontramos {total} nova{total !== 1 ? "s" : ""} mídia{total !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preview list */}
      <ul className="space-y-2 max-h-92 overflow-y-auto pr-1">
        {visibleItems.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            {item.poster ? (
              <img
                src={item.poster}
                alt={item.title}
                className="h-10 w-7 shrink-0 rounded object-cover bg-zinc-800"
              />
            ) : (
              <div className="h-10 w-7 shrink-0 rounded bg-zinc-800" />
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-200">{item.title}</p>
              <p className="text-[10px] text-zinc-500 capitalize">{item.kind === "movie" ? "Filme" : "Série"}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Show more / less */}
      {total > PREVIEW_LIMIT && (
        <button
          onClick={onToggleExpand}
          className="text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors"
        >
          {expanded ? "Ver menos" : `+${hiddenCount} mais`}
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
        >
          Adicionar
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function OfflineWarningPanel({
  unmatchedCount,
  onDismiss,
}: {
  unmatchedCount: number;
  onDismiss: () => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-2">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm text-zinc-300 leading-snug">
          Autoscan encontrou {unmatchedCount} arquivo{unmatchedCount !== 1 ? "s" : ""} novo
          {unmatchedCount !== 1 ? "s" : ""}, mas a conexão com a API está indisponível para identificá-los. Tente mais
          tarde.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
      >
        Fechar
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AddedPanel({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-300">
      <span>
        {count} mídia{count !== 1 ? "s" : ""} adicionada{count !== 1 ? "s" : ""} à biblioteca
      </span>
    </div>
  );
}
