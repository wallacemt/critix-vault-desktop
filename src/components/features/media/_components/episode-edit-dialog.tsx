/**
 * Episode Edit Dialog Component
 * Allow users to edit episode metadata and file path
 */

"use client";

import { useState } from "react";
import { Episode } from "@/types/serie";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FolderOpen } from "lucide-react";
import { tauriService } from "@/services/tauri";

interface EpisodeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: Episode | null;
  seriesId: string;
  onSave: (episode: Episode) => Promise<void>;
}

export function EpisodeEditDialog({ open, onOpenChange, episode, seriesId, onSave }: EpisodeEditDialogProps) {
  const [episodeTitle, setEpisodeTitle] = useState(episode?.name || "");
  const [filePath, setFilePath] = useState(episode?.filePath || "");
  const [overview, setOverview] = useState(episode?.overview || "");
  const [runtime, setRuntime] = useState(episode?.runtime?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when episode changes
  useState(() => {
    if (episode) {
      setEpisodeTitle(episode.name);
      setFilePath(episode.filePath || "");
      setOverview(episode.overview || "");
      setRuntime(episode.runtime?.toString() || "");
    }
  });

  const handleSelectFile = async () => {
    try {
      // For browser environment, use file picker
      // Note: This won't give us the full path for security reasons
      // In production, you'd use Tauri's file dialog API
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // In browser, we can only get the filename
          // In Tauri, you'd use the dialog API to get the full path
          setFilePath(file.name);
        }
      };
      input.click();
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  };

  const handleSave = async () => {
    if (!episode) return;

    setIsSaving(true);
    try {
      const updatedEpisode: Episode = {
        ...episode,
        name: episodeTitle,
        filePath: filePath || undefined,
        overview: overview || episode.overview,
        runtime: runtime ? parseInt(runtime) : episode.runtime,
        available: !!filePath, // Mark as available if filePath is set
      };

      await onSave(updatedEpisode);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving episode:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!episode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Editar Episódio</DialogTitle>
          <DialogDescription>
            S{episode.season_number}E{episode.episode_number} - {episode.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Episode Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="Nome do episódio"
            />
          </div>

          {/* File Path */}
          <div className="space-y-2">
            <Label htmlFor="filePath">Arquivo Local</Label>
            <div className="flex gap-2">
              <Input
                id="filePath"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="Caminho do arquivo"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleSelectFile} size="icon">
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Deixe vazio se o episódio não estiver disponível localmente</p>
          </div>

          {/* Overview */}
          <div className="space-y-2">
            <Label htmlFor="overview">Sinopse</Label>
            <textarea
              id="overview"
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Breve descrição do episódio"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Runtime */}
          <div className="space-y-2">
            <Label htmlFor="runtime">Duração (minutos)</Label>
            <Input
              id="runtime"
              type="number"
              value={runtime}
              onChange={(e) => setRuntime(e.target.value)}
              placeholder="42"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
