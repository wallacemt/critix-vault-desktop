"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";
import type { BgTranscodeStatus } from "@/hooks/useBgTranscode";

/**
 * Slide-in side panel for the background transcode queue.
 * The tab always peeks at the right edge; clicking it reveals the full panel.
 *
 * Layout: [tab | content] — the whole unit translates right by the content
 * width (w-72 = 18rem) when closed, leaving only the 2rem tab visible.
 */
export function BgTranscodePanel({ status }: { status: BgTranscodeStatus }) {
  const [open, setOpen] = useState(true);

  if (!status.active) return null;

  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;
  const fileName = status.current?.split(/[/\\]/).pop() ?? null;

  return (
    <div
      className={[
        "fixed right-0 bottom-24 z-40 flex items-stretch",
        "transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        open ? "translate-x-0" : "translate-x-72",
      ].join(" ")}
    >
      {/* Tab / handle — stays visible at the right edge when panel is collapsed */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center w-8 shrink-0 gap-1.5 py-4 bg-zinc-900 border border-r-0 border-amber-500/40 rounded-l-xl hover:bg-zinc-800 transition-colors"
        aria-label={open ? "Ocultar painel de transcode" : "Mostrar painel de transcode"}
      >
        {open ? (
          <ChevronRight className="w-4 h-4 text-amber-400" />
        ) : (
          <>
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            {/* Pulse dot so the user knows the queue is still active */}
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </>
        )}
      </button>

      {/* Panel body */}
      <div className="w-72 bg-zinc-900 border border-l-0 border-amber-500/40 rounded-r-xl px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
          <Clapperboard className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="truncate">
            Transcode em segundo plano ({status.done}/{status.total})
          </span>
        </div>

        {/* Progress bar + percentage */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-amber-400/70 tabular-nums w-8 text-right shrink-0">
            {pct}%
          </span>
        </div>

        {/* Current file */}
        {fileName && (
          <p
            className="text-[10px] text-zinc-500 truncate"
            title={status.current ?? undefined}
          >
            {fileName}
          </p>
        )}
      </div>
    </div>
  );
}
