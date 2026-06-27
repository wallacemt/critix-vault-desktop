"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Scan } from "lucide-react";

export function AutoScanPanel({ active }: { active: boolean }) {
  const [open, setOpen] = useState(true);

  if (!active) return null;

  return (
    <div
      className={[
        "fixed right-0 bottom-44 z-40 flex items-stretch",
        "transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        open ? "translate-x-0" : "translate-x-72",
      ].join(" ")}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center w-8 shrink-0 gap-1.5 py-4 bg-zinc-900 border border-r-0 border-blue-500/40 rounded-l-xl hover:bg-zinc-800 transition-colors"
        aria-label={open ? "Ocultar painel de varredura" : "Mostrar painel de varredura"}
      >
        {open ? (
          <ChevronRight className="w-4 h-4 text-blue-400" />
        ) : (
          <>
            <ChevronLeft className="w-4 h-4 text-blue-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </>
        )}
      </button>

      <div className="w-72 bg-zinc-900 border border-l-0 border-blue-500/40 rounded-r-xl px-4 py-3 flex items-center gap-3">
        <Scan className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
        <span className="text-sm font-medium text-blue-300">Procurando novas mídias...</span>
      </div>
    </div>
  );
}
