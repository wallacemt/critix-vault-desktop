"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrailerDialogProps {
  open: boolean;
  onClose: () => void;
  trailerKey: string;
  title: string;
}

export function TrailerDialog({ open, onClose, trailerKey, title }: TrailerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-slate-950 border-slate-700 text-white min-w-4xl p-0 overflow-hidden"
      >
        <DialogHeader className="flex flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800">
          <DialogTitle className="text-white text-base font-semibold truncate pr-4">{title} — Trailer</DialogTitle>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
            title={`${title} - Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
