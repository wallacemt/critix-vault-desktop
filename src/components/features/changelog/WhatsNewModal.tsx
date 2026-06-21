"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChangelogEntry } from "./types";
import { renderChangelogMarkdown } from "./markdown";

interface WhatsNewModalProps {
  entry: ChangelogEntry | undefined;
  open: boolean;
  onClose: () => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatDate(iso: string): string {
  try {
    return DATE_FORMATTER.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Truncate release notes to approximately the first 300 characters for the modal preview. */
function previewNotes(notes: string): string {
  if (notes.length <= 300) return notes;
  const cut = notes.slice(0, 300);
  // Avoid cutting in the middle of a word.
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 200 ? cut.slice(0, lastSpace) : cut) + "…";
}

export function WhatsNewModal({ entry, open, onClose }: WhatsNewModalProps) {
  const router = useRouter();

  // Render nothing when not open or no matching release.
  if (!open || !entry) return null;

  function handleViewFull() {
    router.push("/changelog");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-sm font-semibold leading-snug">
              {entry.title}
            </DialogTitle>
            <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-400">
              v{entry.version}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(entry.publishedAt)}</p>
        </DialogHeader>

        {/* Notes preview */}
        {entry.notes.trim() ? (
          <div className="overflow-y-auto max-h-52 pr-1">
            {renderChangelogMarkdown(previewNotes(entry.notes))}
          </div>
        ) : (
          <p className="text-xs italic text-slate-500">Sem notas de lançamento.</p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={handleViewFull}
            className="text-xs bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-on-primary-crx"
          >
            Ver changelog completo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
