/**
 * Scanning Progress Modal Component
 * Shows progress while scanning folder for media files
 */

"use client";

import { motion } from "framer-motion";
import { Loader2, Film, Tv, FolderSearch } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ScanningProgressProps {
  progress: number;
  isOpen: boolean;
}

export function ScanningProgress({ progress, isOpen }: ScanningProgressProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <Card className="bg-[var(--bg-surface)] border-[var(--border-color)] p-8 text-center relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5" />

          <div className="relative z-10">
            {/* Icon */}
            <motion.div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <FolderSearch className="w-12 h-12 text-[var(--color-primary)]" />
            </motion.div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 font-display">Escaneando Pasta</h2>
            <p className="text-[var(--text-secondary)] font-sans mb-6">
              Procurando e identificando arquivos de mídia...
            </p>

            {/* Progress Bar */}
            <div className="relative w-full h-3 bg-[var(--bg-surface-light)] rounded-full overflow-hidden mb-4">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-primary)] to-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />

              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            {/* Percentage */}
            <p className="text-[var(--color-primary)] font-bold text-lg font-display">{Math.round(progress)}%</p>

            {/* Animated icons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0,
                }}
              >
                <Film className="w-6 h-6 text-[var(--text-secondary)]" />
              </motion.div>
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3,
                }}
              >
                <Tv className="w-6 h-6 text-[var(--text-secondary)]" />
              </motion.div>
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.6,
                }}
              >
                <Loader2 className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
