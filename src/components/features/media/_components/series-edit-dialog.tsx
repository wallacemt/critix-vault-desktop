/**
 * Series Edit Dialog
 * Allows manual editing of series metadata, seasons, episodes and file bindings
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Save, Info, List, Film, Folder } from "lucide-react";
import { Series, Season, Episode } from "@/types/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SeriesEditDialogProps {
  series: Series;
  isOpen: boolean;
  onClose: () => void;
  onSave: (changes: SeriesEditState) => Promise<void>;
}

export interface SeriesEditState {
  seriesId: string;
  manuallyEdited: boolean;
  editedAt: string;
  changes: {
    metadata?: Partial<Series>;
    seasons?: SeasonEdit[];
    episodes?: EpisodeEdit[];
    fileBindings?: FileBinding[];
  };
}

export interface SeasonEdit {
  seasonNumber: number;
  action: "add" | "remove" | "modify";
  data?: Partial<Season>;
}

export interface EpisodeEdit {
  episodeId: string;
  action: "modify" | "unbind" | "rebind";
  data?: Partial<Episode>;
  filePath?: string;
}

export interface FileBinding {
  filePath: string;
  boundTo?: {
    seasonNumber: number;
    episodeNumber: number;
  };
  ignored: boolean;
}

type TabType = "general" | "seasons" | "episodes" | "files";

export function SeriesEditDialog({ series, isOpen, onClose, onSave }: SeriesEditDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [editedSeries, setEditedSeries] = useState<Series>(series);

  if (!isOpen) return null;

  const tabs = [
    { id: "general" as const, label: "Informações Gerais", icon: Info },
    { id: "seasons" as const, label: "Temporadas", icon: List },
    { id: "episodes" as const, label: "Episódios", icon: Film },
    { id: "files" as const, label: "Arquivos", icon: Folder },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes: SeriesEditState = {
        seriesId: series.id,
        manuallyEdited: true,
        editedAt: new Date().toISOString(),
        changes: {
          metadata: {
            title: editedSeries.title,
            overview: editedSeries.overview,
            year: editedSeries.year,
          },
        },
      };
      await onSave(changes);
      onClose();
    } catch (error) {
      console.error("Error saving series edits:", error);
      alert("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-slate-900 rounded-2xl border border-slate-800 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Editar Série</h2>
                <p className="text-sm text-slate-400 mt-1">{series.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general" && <GeneralTab series={editedSeries} onChange={setEditedSeries} />}
            {activeTab === "seasons" && <SeasonsTab series={editedSeries} />}
            {activeTab === "episodes" && <EpisodesTab series={editedSeries} />}
            {activeTab === "files" && <FilesTab series={editedSeries} />}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSaving ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// General Tab Component
function GeneralTab({ series, onChange }: { series: Series; onChange: (series: Series) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Título</label>
        <Input
          value={series.title}
          onChange={(e) => onChange({ ...series, title: e.target.value })}
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Sinopse</label>
        <textarea
          value={series.overview || ""}
          onChange={(e) => onChange({ ...series, overview: e.target.value })}
          rows={5}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Ano</label>
          <Input
            type="number"
            value={series.year || ""}
            onChange={(e) => onChange({ ...series, year: parseInt(e.target.value) || undefined })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Avaliação</label>
          <Input
            type="number"
            step="0.1"
            value={series.rating || ""}
            onChange={(e) => onChange({ ...series, rating: parseFloat(e.target.value) || undefined })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
        <Badge variant={series.status === "MATCHED" ? "default" : "destructive"}>{series.status}</Badge>
      </div>
    </div>
  );
}

// Seasons Tab Component
function SeasonsTab({ series }: { series: Series }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Total de {series.numberOfSeasons} temporada(s)</p>
      <div className="grid gap-3">
        {series.seasons
          .sort((a, b) => a.seasonNumber - b.seasonNumber)
          .map((season) => (
            <div key={season.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">{season.name}</h4>
                  <p className="text-sm text-slate-400">
                    {season.episodeCount} episódios • {season.downloadedEpisodes} baixados
                  </p>
                </div>
                <Badge variant={season.available ? "default" : "destructive"}>
                  {season.available ? "Disponível" : "Indisponível"}
                </Badge>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// Episodes Tab Component
function EpisodesTab({ series }: { series: Series }) {
  const [selectedSeason, setSelectedSeason] = useState(series.seasons[0]?.seasonNumber || 1);

  const season = series.seasons.find((s) => s.seasonNumber === selectedSeason);

  return (
    <div className="space-y-4">
      {/* Season Selector */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Temporada</label>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
          {series.seasons.map((s) => (
            <option key={s.id} value={s.seasonNumber}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Episodes List */}
      {season && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">{season.episodeCount} episódios</p>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {season.episodes
              .sort((a, b) => a.episodeNumber - b.episodeNumber)
              .map((episode) => (
                <div
                  key={episode.id}
                  className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white">
                      E{episode.episodeNumber} - {episode.title}
                    </p>
                    {episode.filePath && <p className="text-xs text-slate-500 truncate max-w-md">{episode.filePath}</p>}
                  </div>
                  <Badge variant={episode.available ? "default" : "outline"}>
                    {episode.available ? "Disponível" : "Indisponível"}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Files Tab Component
function FilesTab({ series }: { series: Series }) {
  const allFiles: string[] = [];
  series.seasons.forEach((season) => {
    season.episodes.forEach((episode) => {
      if (episode.filePath) {
        allFiles.push(episode.filePath);
      }
    });
  });

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">{allFiles.length} arquivo(s) detectado(s)</p>
      <div className="grid gap-2 max-h-96 overflow-y-auto">
        {allFiles.map((file, index) => (
          <div key={index} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-white text-sm truncate">{file}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
