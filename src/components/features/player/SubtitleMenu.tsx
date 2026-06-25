"use client";

import { useState } from "react";
import { Subtitles } from "lucide-react";
import type { SubtitleEntry } from "@/types/player";

interface SubtitleMenuProps {
  embedded: Array<{ id: string; label: string; language?: string }>;
  sidecars: SubtitleEntry[];
  activeId?: string;
  onSelectEmbedded: (id: string | undefined) => void;
  onSelectSidecar: (path: string) => void;
}

export function SubtitleMenu({
  embedded,
  sidecars,
  activeId,
  onSelectEmbedded,
  onSelectSidecar,
}: SubtitleMenuProps) {
  const [open, setOpen] = useState(false);

  const hasSubtitles = embedded.length > 0 || sidecars.length > 0;
  const isOff = activeId === undefined;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/10 ${
          !isOff ? "text-indigo-400" : "text-white/80 hover:text-white"
        }`}
        aria-label="Legendas"
      >
        <Subtitles className="w-4 h-4" />
        <span>{isOff ? "CC" : "CC·"}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full mb-2 right-0 z-20 rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl min-w-[150px]">
            {/* Off option */}
            <button
              onClick={() => {
                onSelectEmbedded(undefined);
                setOpen(false);
              }}
              className={`w-full px-4 py-1.5 text-left text-sm transition-colors ${
                isOff
                  ? "text-indigo-400 font-semibold bg-indigo-600/10"
                  : "text-zinc-300 hover:text-white hover:bg-white/5"
              }`}
            >
              Desligado
            </button>

            {/* Embedded tracks */}
            {embedded.length > 0 && (
              <>
                <div className="mx-3 my-1 border-t border-zinc-800" />
                <p className="px-4 py-0.5 text-[10px] text-zinc-500 uppercase tracking-wide">
                  Embutidas
                </p>
                {embedded.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectEmbedded(track.id);
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
              </>
            )}

            {/* Sidecar files */}
            {sidecars.length > 0 && (
              <>
                <div className="mx-3 my-1 border-t border-zinc-800" />
                <p className="px-4 py-0.5 text-[10px] text-zinc-500 uppercase tracking-wide">
                  Arquivos externos
                </p>
                {sidecars.map((sub) => (
                  <button
                    key={sub.path}
                    onClick={() => {
                      onSelectSidecar(sub.path);
                      setOpen(false);
                    }}
                    className="w-full px-4 py-1.5 text-left text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {sub.label}
                    <span className="ml-1 text-zinc-500 text-xs">({sub.lang})</span>
                  </button>
                ))}
              </>
            )}

            {!hasSubtitles && (
              <p className="px-4 py-2 text-xs text-zinc-500">Nenhuma legenda disponível</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
