/**
 * Series Edit Dialog
 * Allows manual editing of series metadata, seasons, episodes and file bindings
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  Info,
  List,
  Film,
  Folder,
  FolderOpen,
  FileVideo,
  CheckCircle2,
  XCircle,
  Pencil,
  Check,
} from "lucide-react";
import { Series, Season, Episode } from "@/types/serie";
import { motion, AnimatePresence } from "framer-motion";
import { getSeries, saveSeries } from "@/services/databaseService";
import { tauriService } from "@/services/tauri";

interface SeriesEditDialogProps {
  series: Series;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSeries: Series) => Promise<void>;
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

function normalizeSeriesForEditing(series: Series): Series {
  return {
    ...series,
    seasons: Array.isArray(series.seasons) ? series.seasons : [],
  };
}

export function SeriesEditDialog({ series, isOpen, onClose, onSave }: SeriesEditDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [editedSeries, setEditedSeries] = useState<Series>(normalizeSeriesForEditing(series));

  useEffect(() => {
    if (!isOpen) return;
    setEditedSeries(normalizeSeriesForEditing(series));
  }, [series, isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: "general" as const, label: "Informações", icon: Info },
    { id: "seasons" as const, label: "Temporadas", icon: List },
    { id: "episodes" as const, label: "Episódios", icon: Film },
    { id: "files" as const, label: "Arquivos", icon: Folder },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const normalizedSeries = normalizeSeriesForEditing(editedSeries);
      const allSeries = await getSeries();
      const updatedAllSeries = allSeries.map((s) =>
        s.id === normalizedSeries.id && s.folderId === normalizedSeries.folderId ? normalizedSeries : s,
      );
      await saveSeries(updatedAllSeries);
      await onSave(normalizedSeries);
      onClose();
    } catch (error) {
      console.error("Error saving series edits:", error);
      alert("Erro ao salvar alterações: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEpisodesChange = (updatedSeasons: Season[]) => {
    setEditedSeries((prev) => ({ ...prev, seasons: updatedSeasons }));
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
          <div className="p-6 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Edição Avançada</h2>
                <p className="text-sm text-slate-400 mt-1">{series.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-slate-800 text-white border border-slate-700"
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
            {activeTab === "seasons" && <SeasonsTab series={editedSeries} onChange={handleEpisodesChange} />}
            {activeTab === "episodes" && <EpisodesTab series={editedSeries} onChange={handleEpisodesChange} />}
            {activeTab === "files" && <FilesTab series={editedSeries} onChange={setEditedSeries} />}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800 flex justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-slate-700">
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

// --- General Tab ---

function GeneralTab({ series, onChange }: { series: Series; onChange: (series: Series) => void }) {
  const handleSelectFolder = async () => {
    try {
      const selected = await tauriService.selectFolder();
      if (selected) {
        onChange({ ...series, folderPath: selected, filePath: selected });
      }
    } catch (error) {
      console.error("Failed to open folder picker:", error);
      alert("Não foi possível abrir o seletor de pasta no momento.");
    }
  };

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
          rows={4}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            min="0"
            max="10"
            value={series.rating || ""}
            onChange={(e) => onChange({ ...series, rating: parseFloat(e.target.value) || undefined })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Pasta da Série
          <span className="ml-2 text-xs text-slate-500">Onde os arquivos estão armazenados</span>
        </label>
        <div className="flex gap-2">
          <Input
            value={series.folderPath || series.filePath || ""}
            onChange={(e) => onChange({ ...series, folderPath: e.target.value, filePath: e.target.value })}
            placeholder="Caminho da pasta..."
            className="bg-slate-800 border-slate-700 text-white flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSelectFolder}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Selecionar
          </Button>
        </div>
        {(series.folderPath || series.filePath) && (
          <p className="text-xs text-slate-500 mt-1 truncate">{series.folderPath || series.filePath}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
        <div className="flex gap-2">
          {(["MATCHED", "UNMATCHED", "ERROR"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...series, status: s })}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                series.status === s
                  ? s === "MATCHED"
                    ? "bg-green-600 text-white"
                    : s === "UNMATCHED"
                      ? "bg-yellow-600 text-white"
                      : "bg-red-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Seasons Tab ---

function SeasonsTab({ series, onChange }: { series: Series; onChange: (seasons: Season[]) => void }) {
  const seasons = Array.isArray(series.seasons) ? series.seasons : [];

  const handleSeasonFolderPathChange = (seasonId: string, folderPath: string) => {
    const updatedSeasons = seasons.map((season) =>
      season.id === seasonId
        ? {
            ...season,
            folderPath,
          }
        : season,
    );
    onChange(updatedSeasons);
  };

  const handleSelectSeasonFolder = async (season: Season) => {
    try {
      const selected = await tauriService.selectFolder();
      if (selected) {
        handleSeasonFolderPathChange(season.id, selected);
      }
    } catch (error) {
      console.error("Failed to open season folder picker:", error);
      alert("Não foi possível abrir o seletor de pasta da temporada.");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        {series.numberOfSeasons} temporada(s) &bull; {seasons.reduce((acc, s) => acc + s.downloadedEpisodes, 0)}{" "}
        episódios disponíveis
      </p>
      <div className="grid gap-3">
        {seasons
          .slice()
          .sort((a, b) => a.seasonNumber - b.seasonNumber)
          .map((season) => {
            const available = season.episodes.filter((e) => e.available || e.filePath).length;
            return (
              <div key={season.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white">{season.name}</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {season.episodeCount} episódios &bull;{" "}
                      <span className={available > 0 ? "text-green-400" : "text-slate-500"}>
                        {available} disponíveis
                      </span>
                    </p>
                  </div>
                  <Badge
                    className={
                      available > 0
                        ? "bg-green-600/20 text-green-400 border-green-600/30"
                        : "bg-slate-700 text-slate-400 border-slate-600"
                    }
                  >
                    {available > 0 ? "Disponível" : "Sem arquivos"}
                  </Badge>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-slate-400 mb-2">
                    Pasta da Temporada
                    <span className="ml-2 text-slate-500">Opcional</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={season.folderPath || ""}
                      onChange={(e) => handleSeasonFolderPathChange(season.id, e.target.value)}
                      placeholder="Ex.: D:/Series/Nome da Série/Temporada 1"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSelectSeasonFolder(season)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-700"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Selecionar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// --- Episodes Tab ---

function extractEpisodeFromFilePath(filePath: string): { seasonNumber?: number; episodeNumber: number } | null {
  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const normalized = fileName.toLowerCase();

  const seasonEpisodePatterns: RegExp[] = [/s(\d{1,2})e(\d{1,3})/i, /(\d{1,2})x(\d{1,3})/i];

  for (const pattern of seasonEpisodePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        seasonNumber: parseInt(match[1], 10),
        episodeNumber: parseInt(match[2], 10),
      };
    }
  }

  const episodeOnlyPatterns: RegExp[] = [/[\s._-]e(\d{1,3})[\s._-]/i, /(?:^|[\s._-])ep\s?(\d{1,3})(?:$|[\s._-])/i];

  for (const pattern of episodeOnlyPatterns) {
    const match = ` ${normalized} `.match(pattern);
    if (match) {
      return {
        episodeNumber: parseInt(match[1], 10),
      };
    }
  }

  return null;
}

function EpisodesTab({ series, onChange }: { series: Series; onChange: (seasons: Season[]) => void }) {
  const seasons = Array.isArray(series.seasons) ? series.seasons : [];

  const [selectedSeason, setSelectedSeason] = useState(
    seasons.find((s) => s.available || s.episodes.some((e) => e.filePath))?.seasonNumber ||
      seasons[0]?.seasonNumber ||
      1,
  );
  const [editingEpId, setEditingEpId] = useState<string | null>(null);
  const [editFilePath, setEditFilePath] = useState("");

  const season = seasons.find((s) => s.seasonNumber === selectedSeason);

  const handleSelectEpisodeFile = (episode: Episode) => {
    setEditingEpId(episode.id);
    setEditFilePath(episode.filePath || "");
  };

  const handleBrowseFile = async () => {
    try {
      const selected = await tauriService.selectMediaFile();
      if (selected) {
        setEditFilePath(selected);
      }
    } catch (error) {
      console.error("Failed to open episode file picker:", error);
      alert("Não foi possível abrir o seletor de arquivo no momento.");
    }
  };

  const handleSaveEpisodePath = (episode: Episode) => {
    const updatedSeasons = seasons.map((s) => {
      if (s.seasonNumber !== selectedSeason) return s;
      const updatedEps = s.episodes.map((ep) => {
        if (ep.id !== episode.id) return ep;
        return { ...ep, filePath: editFilePath || undefined, available: !!editFilePath };
      });
      const downloadedEpisodes = updatedEps.filter((ep) => ep.available || !!ep.filePath).length;
      return {
        ...s,
        episodes: updatedEps,
        downloadedEpisodes,
        available: downloadedEpisodes > 0,
      };
    });
    onChange(updatedSeasons);
    setEditingEpId(null);
    setEditFilePath("");
  };

  const handleClearEpisodePath = (episode: Episode) => {
    const updatedSeasons = seasons.map((s) => {
      if (s.seasonNumber !== selectedSeason) return s;
      const updatedEps = s.episodes.map((ep) => {
        if (ep.id !== episode.id) return ep;
        return { ...ep, filePath: undefined, available: false };
      });
      const downloadedEpisodes = updatedEps.filter((ep) => ep.available || !!ep.filePath).length;
      return {
        ...s,
        episodes: updatedEps,
        downloadedEpisodes,
        available: downloadedEpisodes > 0,
      };
    });
    onChange(updatedSeasons);
  };

  const handleBulkSelectFiles = async () => {
    if (!season) return;

    try {
      const selectedFiles = await tauriService.selectMediaFiles();
      if (selectedFiles.length === 0) return;

      const filesByEpisodeNumber = new Map<number, string>();
      let ignoredNoPattern = 0;
      let ignoredSeasonMismatch = 0;

      selectedFiles.forEach((filePath) => {
        const parsed = extractEpisodeFromFilePath(filePath);
        if (!parsed) {
          ignoredNoPattern++;
          return;
        }

        if (parsed.seasonNumber && parsed.seasonNumber !== selectedSeason) {
          ignoredSeasonMismatch++;
          return;
        }

        if (!filesByEpisodeNumber.has(parsed.episodeNumber)) {
          filesByEpisodeNumber.set(parsed.episodeNumber, filePath);
        }
      });

      if (filesByEpisodeNumber.size === 0) {
        alert("Nenhum arquivo foi vinculado. Verifique se os nomes contêm padrão de episódio (S01E01, 1x01, Ep 01).");
        return;
      }

      let linkedCount = 0;
      const updatedSeasons = seasons.map((s) => {
        if (s.seasonNumber !== selectedSeason) return s;

        const updatedEpisodes = s.episodes.map((ep) => {
          const episodeFile = filesByEpisodeNumber.get(ep.episode_number);
          if (!episodeFile) return ep;
          linkedCount++;
          return {
            ...ep,
            filePath: episodeFile,
            available: true,
          };
        });

        const downloadedEpisodes = updatedEpisodes.filter((ep) => ep.available || !!ep.filePath).length;
        return {
          ...s,
          episodes: updatedEpisodes,
          downloadedEpisodes,
          available: downloadedEpisodes > 0,
        };
      });

      onChange(updatedSeasons);

      const summary = [
        `${linkedCount} episódio(s) vinculado(s) automaticamente na Temporada ${selectedSeason}.`,
        ignoredNoPattern > 0 ? `${ignoredNoPattern} arquivo(s) ignorado(s) por nome sem padrão reconhecido.` : null,
        ignoredSeasonMismatch > 0
          ? `${ignoredSeasonMismatch} arquivo(s) ignorado(s) por pertencer(em) a outra temporada.`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      alert(summary);
    } catch (error) {
      console.error("Failed to bulk select episode files:", error);
      alert("Não foi possível selecionar vários arquivos no momento.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Temporada</label>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {seasons
              .slice()
              .sort((a, b) => a.seasonNumber - b.seasonNumber)
              .map((s) => {
                const hasFiles = s.episodes.some((e) => e.available || e.filePath);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeason(s.seasonNumber)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all relative ${
                      selectedSeason === s.seasonNumber
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    T{s.seasonNumber}
                    {hasFiles && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />}
                  </button>
                );
              })}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleBulkSelectFiles}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Selecionar Vários
          </Button>
        </div>
      </div>

      {season && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">
            {season.episodeCount} episódios &bull; {season.episodes.filter((e) => e.available || e.filePath).length} com
            arquivo
          </p>
          <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
            {season.episodes
              .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
              .map((episode) => {
                const isEditing = editingEpId === episode.id;
                const hasFile = episode.available || !!episode.filePath;
                const epNum = episode.episode_number || 0;
                const epName = episode.title || episode.name || `Episódio ${epNum}`;
                return (
                  <div
                    key={episode.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isEditing
                        ? "bg-blue-950/30 border-blue-700"
                        : hasFile
                          ? "bg-slate-800 border-slate-700"
                          : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {hasFile ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                          )}
                          <span className="text-white text-sm font-medium truncate">
                            E{String(epNum).padStart(2, "0")} &ndash; {epName}
                          </span>
                        </div>
                        {!isEditing && episode.filePath && (
                          <p className="text-xs text-slate-500 truncate mt-1 pl-6">{episode.filePath}</p>
                        )}
                        {!isEditing && !episode.filePath && (
                          <p className="text-xs text-slate-600 mt-1 pl-6 italic">Sem arquivo vinculado</p>
                        )}
                        {isEditing && (
                          <div className="mt-2 pl-6 flex gap-2">
                            <Input
                              value={editFilePath}
                              onChange={(e) => setEditFilePath(e.target.value)}
                              placeholder="Caminho do arquivo de vídeo..."
                              className="bg-slate-900 border-slate-700 text-white text-xs h-8 flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleBrowseFile}
                              className="h-8 px-2 border-slate-600"
                              title="Procurar arquivo"
                            >
                              <FolderOpen className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEpisodePath(episode)}
                              className="h-8 px-2 bg-green-600 hover:bg-green-700"
                              title="Confirmar"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingEpId(null)}
                              className="h-8 px-2 text-slate-400"
                              title="Cancelar"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSelectEpisodeFile(episode)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400"
                            title="Editar localização"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {hasFile && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleClearEpisodePath(episode)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                              title="Remover vínculo"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Files Tab ---

function FilesTab({ series, onChange }: { series: Series; onChange: (series: Series) => void }) {
  const seasons = Array.isArray(series.seasons) ? series.seasons : [];
  const allFiles: { file: string; season: number; episode: number; epName: string }[] = [];
  seasons.forEach((season) => {
    season.episodes.forEach((episode) => {
      if (episode.filePath) {
        allFiles.push({
          file: episode.filePath,
          season: episode.season_number || season.seasonNumber,
          episode: episode.episode_number || 0,
          epName: episode.title || episode.name || "",
        });
      }
    });
  });
  allFiles.sort((a, b) => a.season - b.season || a.episode - b.episode);

  const handleSelectFolder = async () => {
    try {
      const selected = await tauriService.selectFolder();
      if (selected) {
        onChange({ ...series, folderPath: selected, filePath: selected });
      }
    } catch (error) {
      console.error("Failed to open root series folder picker:", error);
      alert("Não foi possível abrir o seletor de pasta no momento.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-400" />
          Pasta Raiz da Série
        </h3>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 truncate min-w-0">
            {series.folderPath || series.filePath || (
              <span className="text-slate-500 italic">Nenhuma pasta definida</span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleSelectFolder}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-shrink-0"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Alterar
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <FileVideo className="w-4 h-4 text-green-400" />
          Arquivos Vinculados ({allFiles.length})
        </h3>
        {allFiles.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum arquivo vinculado.</p>
            <p className="text-xs mt-1">Use a aba Episódios para vincular arquivos.</p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
            {allFiles.map((item, index) => (
              <div key={index} className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <FileVideo className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    T{item.season}E{String(item.episode).padStart(2, "0")} &ndash; {item.epName}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.file}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
