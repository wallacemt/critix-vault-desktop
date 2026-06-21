"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Tv2, X, AlertTriangle } from "lucide-react";

interface PlayerChoiceModalProps {
  open: boolean;
  filePath: string;
  onChoose: (choice: "INTERNAL" | "EXTERNAL", remember: boolean) => void;
  onCancel: () => void;
}

export function PlayerChoiceModal({ open, filePath, onChoose, onCancel }: PlayerChoiceModalProps) {
  const [remember, setRemember] = useState(false);
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="choice-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            key="choice-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[111] flex items-center justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="player-choice-title"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex  flex-col gap-2 max-w-3xs">
                  <h2 id="player-choice-title" className="text-lg font-semibold text-white">
                    Como deseja assistir?
                  </h2>
                  <p className="text-gray-400 truncate font-sans text-sm">{filePath}</p>
                </div>
                <button
                  onClick={onCancel}
                  className="rounded-lg p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                  aria-label="Cancelar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Choices */}
              <div className="flex flex-col gap-3">
                {/* Internal player */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onChoose("INTERNAL", remember)}
                    className="flex items-center gap-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-colors"
                  >
                    <Monitor className="w-5 h-5 shrink-0" />
                    Player interno
                  </button>
                </div>

                {/* External player */}
                <button
                  onClick={() => onChoose("EXTERNAL", remember)}
                  className="flex items-center gap-3 w-full rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-800 hover:bg-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors"
                >
                  <Tv2 className="w-5 h-5 shrink-0" />
                  App de vídeo padrão
                </button>
              </div>

              {/* Remember checkbox */}
              <label className="flex items-center gap-2.5 mt-5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  Lembrar minha escolha
                </span>
              </label>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
