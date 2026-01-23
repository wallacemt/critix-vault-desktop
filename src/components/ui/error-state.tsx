/**
 * Error State Component
 * Beautiful error display with retry functionality
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  icon?: "error" | "offline";
}

export function ErrorState({
  title = "Ops! Algo deu errado",
  message,
  onRetry,
  onGoHome,
  icon = "error",
}: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center p-8">
      <motion.div
        className="max-w-lg w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-[var(--bg-surface)] border-[var(--border-color)] p-12 text-center relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent" />

          <div className="relative z-10">
            {/* Icon/Image */}
            <motion.div
              className="mb-8"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {icon === "offline" ? (
                <div className="relative w-48 h-48 mx-auto">
                  <Image src="/images/503.svg" alt="Offline" fill className="object-contain" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center mx-auto">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/30 to-pink-500/30 flex items-center justify-center">
                    <AlertCircle className="w-16 h-16 text-red-400" />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-3xl font-bold text-[var(--text-primary)] mb-4 font-display"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {title}
            </motion.h2>

            {/* Message */}
            <motion.p
              className="text-[var(--text-secondary)] font-sans text-lg mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {message}
            </motion.p>

            {/* Actions */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {onRetry && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={onRetry}
                    size="lg"
                    className="bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] font-semibold shadow-lg"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Tentar Novamente
                  </Button>
                </motion.div>
              )}

              {onGoHome && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={onGoHome}
                    size="lg"
                    variant="outline"
                    className="bg-[var(--bg-surface-light)]/50 border-[var(--border-color)] hover:bg-[var(--bg-surface-light)] text-[var(--text-primary)]"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Voltar ao Início
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

// Inline error for use within other components
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-12 h-12 text-[var(--color-danger)]" />
      </div>
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 font-display">Erro ao carregar</h3>
      <p className="text-[var(--text-secondary)] font-sans max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      )}
    </motion.div>
  );
}
