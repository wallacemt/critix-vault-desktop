"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, EyeOff, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMarkWatched: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  allWatched?: boolean;
}

export function BulkActionsBar({ selectedCount, onClearSelection, onMarkWatched, onDelete, allWatched = false }: BulkActionsBarProps) {
  const handleDelete = async () => {
    const confirmed = window.confirm(`Remover ${selectedCount} mídia(s) selecionada(s)?`);
    if (!confirmed) return;
    await onDelete();
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className="fixed bottom-6 left-1/2 z-50 backdrop-blur-2xl -translate-x-1/2 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-color)]/70 bg-surface-light-crx/40 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] "
    >
      <div className="flex items-center gap-3">
        <Badge className="shrink-0 bg-primary rounded-lg text-[var(--color-on-primary)]">
          {selectedCount} selecionadas
        </Badge>
        <span className="hidden text-sm text-[var(--text-secondary)] sm:block">
          Clique direito • Arraste • ESC para sair
        </span>
      </div>

      <div className="hidden h-4 w-px bg-[var(--border-color)]/60 sm:block" />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-[var(--border-color)] bg-surface text-primary rounded-lg"
          onClick={onClearSelection}
        >
          <X className="mr-1.5 h-4 w-4" />
          Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          className={
            allWatched
              ? "bg-gradient-to-r from-amber-500/30 rounded-lg to-amber-600/60 text-white hover:from-amber-400 hover:to-amber-500"
              : "bg-gradient-to-r from-emerald-500/30 rounded-lg to-emerald-600/60 text-white hover:from-emerald-400 hover:to-emerald-500"
          }
          onClick={onMarkWatched}
        >
          {allWatched ? (
            <EyeOff className="mr-1.5 h-4 w-4" />
          ) : (
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
          )}
          {allWatched ? "Desmarcar assistida" : "Marcar assistida"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-red-500/30 bg-red-500/10 rounded-lg text-red-300 hover:bg-red-500/20 hover:text-red-200"
          onClick={handleDelete}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Remover
        </Button>
      </div>
    </motion.div>
  );
}
