"use client";

/**
 * UpdateAvailableNotification
 *
 * Fixed, non-blocking bottom-right panel shown when useUpdateCheck finds a new
 * native update on app launch — the automatic counterpart to the manual
 * "Verificar atualizações" flow in Settings. Same positioning/style as
 * AutoscanNotification so multiple app-wide nudges read as one system.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2, X } from "lucide-react";
import { NativeUpdate } from "@/hooks/useUpdateCheck";

interface UpdateAvailableNotificationProps {
  visible: boolean;
  update: NativeUpdate | null;
  installing: boolean;
  installProgress: number | null;
  onInstall: () => void;
  onDismiss: () => void;
}

// bottom-left (not bottom-right) so it never stacks with AutoscanNotification.
const PANEL_BASE = "fixed bottom-6 left-6 z-50 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl";

const ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.2 },
};

export function UpdateAvailableNotification({
  visible,
  update,
  installing,
  installProgress,
  onInstall,
  onDismiss,
}: UpdateAvailableNotificationProps) {
  return (
    <AnimatePresence>
      {visible && update && (
        <motion.div {...ANIMATION} className={PANEL_BASE} role="status" aria-live="polite">
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm font-semibold text-white leading-snug">
                  Nova versão v{update.version} disponível
                </p>
              </div>
              {!installing && (
                <button
                  onClick={onDismiss}
                  className="shrink-0 rounded-md p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                  aria-label="Fechar notificação"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {installing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Instalando atualização{installProgress !== null ? ` (${installProgress}%)` : "…"}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${installProgress ?? 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onInstall}
                  className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
                >
                  Atualizar agora
                </button>
                <button
                  onClick={onDismiss}
                  className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Depois
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
