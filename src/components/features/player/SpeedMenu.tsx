"use client";

import { useState } from "react";
import { Gauge } from "lucide-react";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

interface SpeedMenuProps {
  currentRate: number;
  onSelect: (rate: number) => void;
}

export function SpeedMenu({ currentRate, onSelect }: SpeedMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Velocidade de reprodução"
      >
        <Gauge className="w-4 h-4" />
        <span>{currentRate}x</span>
      </button>

      {open && (
        <>
          {/* Dismiss on outside click */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full mb-2 right-0 z-20 rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl min-w-[90px]">
            {SPEEDS.map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  onSelect(rate);
                  setOpen(false);
                }}
                className={`w-full px-4 py-1.5 text-left text-sm transition-colors ${
                  rate === currentRate
                    ? "text-indigo-400 font-semibold bg-indigo-600/10"
                    : "text-zinc-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
