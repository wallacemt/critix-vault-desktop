"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";

interface AudioTrackMenuProps {
  tracks: Array<{ id: string; label: string; language?: string }>;
  activeId?: string;
  onSelect: (id: string) => void;
}

export function AudioTrackMenu({ tracks, activeId, onSelect }: AudioTrackMenuProps) {
  const [open, setOpen] = useState(false);

  // Single track: nothing to switch, render nothing.
  if (tracks.length <= 1) return null;

  const activeTrack = tracks.find((t) => t.id === activeId) ?? tracks[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Faixa de áudio"
      >
        <Volume2 className="w-4 h-4" />
        <span>{activeTrack?.label ?? "Áudio"}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full mb-2 right-0 z-20 rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl min-w-[130px]">
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  onSelect(track.id);
                  setOpen(false);
                }}
                className={`w-full px-4 py-1.5 text-left text-sm transition-colors ${
                  track.id === activeId
                    ? "text-indigo-400 font-semibold bg-indigo-600/10"
                    : "text-zinc-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {track.label}
                {track.language && (
                  <span className="ml-1 text-zinc-500 text-xs">({track.language})</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
