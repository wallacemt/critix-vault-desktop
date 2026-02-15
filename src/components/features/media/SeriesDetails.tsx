/**
 * Series Details Component
 * Displays detailed information about a series with seasons and episodes
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Play,
  ExternalLink,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Edit,
  Loader2,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { Series, Season, Episode } from "@/types";
import { cn } from "@/lib/utils";
import { rematchSeriesEpisodes, fetchSeasonDetails } from "@/services/mediaService";
import { EditMediaModal } from "@/components/ui/edit-media-modal";
import { tauriService } from "@/services/tauri";
import { SeriesEditDialog, SeriesEditState } from "./series-edit-dialog";
import { storageService } from "@/services/storageService";
import { DeleteMediaDialog } from "@/components/features/library/_components/delete-media-dialog";
import { SeasonCard } from "./_components/season-card";
import { getSeries, saveSeries, removeSeries } from "@/services/databaseService";

interface SeriesDetailsProps {
  series: Series;
  onBack: () => void;
  onPlayEpisode: (episode: Episode) => void;
  onSeriesUpdate?: (updatedSeries: Series) => void;
  onDelete?: () => void;
}

export function SeriesDetails({ series, onBack, onPlayEpisode, onSeriesUpdate, onDelete }: SeriesDetailsProps) {
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdvancedEditOpen, setIsAdvancedEditOpen] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [rematchStatus, setRematchStatus] = useState<string>("");
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Task 4: Auto-fetch and save season details when series page opens
  useEffect(() => {
    const loadSeasonDetails = async () => {
      // Check if seasons are already populated with episode details
      const hasEpisodeDetails = series.seasons.some((season) => season.episodes && season.episodes.length > 0);

      if (hasEpisodeDetails) {
        console.log("✅ Series already has season details");
        return;
      }

      setIsLoadingSeasons(true);
      console.log(`🔄 Loading season details for: ${series.title}`);

      try {
        const updatedSeasons: Season[] = [];

        for (const season of series.seasons) {
          try {
            const seasonDetails = await fetchSeasonDetails(series.id, season.seasonNumber);

            if (seasonDetails) {
              updatedSeasons.push({
                ...season,
                episodes: seasonDetails.episodes as Episode[],
                overview: seasonDetails.overview || season.overview,
                poster: seasonDetails.poster_path || season.poster,
              });
              console.log(`✅ Loaded Season ${season.seasonNumber}: ${seasonDetails.episodes.length} episodes`);
            } else {
              updatedSeasons.push(season);
            }
          } catch (error) {
            console.error(`Failed to load Season ${season.seasonNumber}:`, error);
            updatedSeasons.push(season);
          }
        }

        const updatedSeries = {
          ...series,
          seasons: updatedSeasons,
        };

        // Save updated series to database (update the existing series, don't overwrite all)
        const allSeries = await getSeries();
        const updatedAllSeries = allSeries.map((s) =>
          s.id === updatedSeries.id && s.folderId === updatedSeries.folderId ? updatedSeries : s,
        );
        await saveSeries(updatedAllSeries);
        console.log(`✅ Saved updated series with season details: ${series.title}`);

        // Notify parent component
        if (onSeriesUpdate) {
          onSeriesUpdate(updatedSeries);
        }
      } catch (error) {
        console.error("Failed to load season details:", error);
      } finally {
        setIsLoadingSeasons(false);
      }
    };

    loadSeasonDetails();
  }, [series.id]); // Only run when series ID changes

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonId)) {
        next.delete(seasonId);
      } else {
        next.add(seasonId);
      }
      return next;
    });
  };

  const handleSeriesChange = async (newSeriesId: string, mediaType: "movie" | "tv") => {
    if (mediaType !== "tv") return;

    setIsRematching(true);
    setRematchStatus("Coletando arquivos locais...");

    try {
      // Collect all local episode files from current series
      const localFiles: string[] = [];
      series.seasons.forEach((season) => {
        season.episodes.forEach((episode) => {
          if (episode.filePath) {
            localFiles.push(episode.filePath);
          }
        });
      });

      setRematchStatus(`Re-mapeando ${localFiles.length} episódios...`);

      // Perform re-matching
      const result = await rematchSeriesEpisodes(series.id, newSeriesId, localFiles);

      if (result.success) {
        setRematchStatus(`✓ ${result.matched} episódios mapeados, ${result.unmatched} não mapeados`);

        // Notify parent component to update series
        if (onSeriesUpdate) {
          // Here you would fetch the full updated series details and update
          // For now, we'll just show success message
          setTimeout(() => {
            setRematchStatus("");
            setIsRematching(false);
            setIsEditModalOpen(false);
          }, 2000);
        }
      } else {
        setRematchStatus(`✗ Erro: ${result.errors?.join(", ")}`);
        setTimeout(() => {
          setRematchStatus("");
          setIsRematching(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error during re-matching:", error);
      setRematchStatus(`✗ Erro ao re-mapear episódios`);
      setTimeout(() => {
        setRematchStatus("");
        setIsRematching(false);
      }, 3000);
    }
  };

  const handleOpenFolder = async () => {
    // Get first available episode file path as reference
    let filePath: string | undefined;

    for (const season of series.seasons) {
      for (const episode of season.episodes) {
        if (episode.filePath && !episode.filePath.includes("/demo/")) {
          filePath = episode.filePath;
          break;
        }
      }
      if (filePath) break;
    }

    if (!filePath) {
      alert("Nenhum arquivo local encontrado para esta série");
      return;
    }

    try {
      await tauriService.openFileLocation(filePath);
    } catch (error) {
      console.error("Error opening folder:", error);
      alert(`Erro ao abrir pasta: ${error}`);
    }
  };

  const handleSaveSeriesEdits = async (edits: SeriesEditState) => {
    try {
      storageService.saveSeriesEdits(series.id, edits);
      alert("Alterações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving edits:", error);
      alert("Erro ao salvar alterações");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeSeries(series.id);
      console.log(`✅ Series deleted: ${series.title}`);
      setShowDeleteDialog(false);

      // Call parent callback if provided
      if (onDelete) {
        onDelete();
      } else {
        // Fallback to going back
        onBack();
      }
    } catch (error) {
      console.error("Error deleting series:", error);
      alert(`Erro ao excluir série: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-on-primary-crx  z-50 overflow-auto">
      {/* Backdrop Section */}
      <div className="relative h-[60vh] overflow-hidden">
        {/* Backdrop Image */}
        {series.backdrop && !backdropError ? (
          <img
            src={series.backdrop}
            alt={series.title}
            className="w-full h-full object-cover"
            onError={() => setBackdropError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-transparent" />

        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-sm hover:bg-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto flex gap-8">
            {/* Poster */}
            <div className="hidden md:block flex-shrink-0">
              <div className="w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-slate-800">
                {series.poster && !posterError ? (
                  <img
                    src={series.poster}
                    alt={series.title}
                    className="w-full h-full object-cover"
                    onError={() => setPosterError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Play className="w-16 h-16 text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-end">
              <div className="mb-4">
                <Badge
                  className={cn(
                    "text-white border mb-3",
                    series.type === "ANIME" ? "bg-pink-600 border-pink-500" : "bg-purple-600 border-purple-500",
                  )}
                >
                  {series.type === "ANIME" ? "Anime" : "Series"}
                </Badge>
                <h1 className="text-5xl font-bold text-white mb-2">{series.title}</h1>
                {series.originalTitle && series.originalTitle !== series.title && (
                  <p className="text-lg text-slate-400 mb-3">{series.originalTitle}</p>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-300">
                {series.firstAirDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(series.firstAirDate).getFullYear()}
                      {series.lastAirDate && ` - ${new Date(series.lastAirDate).getFullYear()}`}
                    </span>
                  </div>
                )}
                {series.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span>{series.rating.toFixed(1)}/10</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold">
                    {series.numberOfSeasons} Season{series.numberOfSeasons !== 1 ? "s" : ""}
                  </span>
                  {" • "}
                  <span>
                    {series.numberOfEpisodes} Episode{series.numberOfEpisodes !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                {series.trailer && (
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
                  >
                    <a href={series.trailer} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Trailer
                    </a>
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(true)}
                  disabled={isRematching}
                  className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
                >
                  {isRematching ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Edit className="w-5 h-5 mr-2" />}
                  Editar Série
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleOpenFolder}
                  className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
                >
                  <FolderOpen className="w-5 h-5 mr-2" />
                  Abrir Pasta
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsAdvancedEditOpen(true)}
                  className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Edição Avançada
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-red-900/20 border-red-700 hover:bg-red-900/40 backdrop-blur-sm text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Excluir
                </Button>
                {rematchStatus && (
                  <div className="flex items-center px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg backdrop-blur-sm">
                    <span className="text-sm text-white">{rematchStatus}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Details Section */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Overview */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
          {series.overview ? (
            <p className="text-slate-300 leading-relaxed text-lg max-w-4xl">{series.overview}</p>
          ) : (
            <p className="text-slate-500 italic">No overview available</p>
          )}
        </div>

        {/* Seasons & Episodes */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Seasons & Episodes</h2>
          <div className="space-y-4">
            {series.seasons
              .sort((a, b) => a.seasonNumber - b.seasonNumber)
              .map((season) => (
                <SeasonCard
                  key={season.id}
                  season={season}
                  isExpanded={expandedSeasons.has(season.id)}
                  onToggle={() => toggleSeason(season.id)}
                  onPlayEpisode={onPlayEpisode}
                />
              ))}
          </div>
        </div>
      </div>
      {/* Edit Media Modal */}
      <EditMediaModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentMedia={{
          title: series.title,
          type: "SERIES",
        }}
        onSelectMedia={handleSeriesChange}
      />
      {/* Advanced Edit Dialog */}
      <SeriesEditDialog
        series={series}
        isOpen={isAdvancedEditOpen}
        onClose={() => setIsAdvancedEditOpen(false)}
        onSave={handleSaveSeriesEdits}
      />
      {/* Delete Confirmation Dialog */}
      <DeleteMediaDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        media={series}
        isDeleting={isDeleting}
      />
      ;
    </div>
  );
}
