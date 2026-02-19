/**
 * Series Details Component
 * Displays detailed information about a series with seasons and episodes
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Calendar, Star, Edit, Loader2, FolderOpen, Trash2 } from "lucide-react";
import { Season, Episode } from "@/types/serie";
import { cn } from "@/lib/utils";
import { rematchSeriesEpisodes, fetchSeasonDetails } from "@/services/mediaService";
import { EditMediaModal } from "@/components/ui/edit-media-modal";
import { tauriService } from "@/services/tauri";
import { SeriesEditDialog, SeriesEditState } from "./_components/series-edit-dialog";
import { storageService } from "@/services/storageService";
import { DeleteMediaDialog } from "@/components/features/library/_components/delete-media-dialog";
import { EpisodeEditDialog } from "./_components/episode-edit-dialog";
import { SeasonCard } from "./_components/season-card";
import { getSeries, saveSeries, removeSeries, toggleEpisodeWatchStatus } from "@/services/databaseService";
import { useMediaContext } from "@/context/mediaContext";
import { useActions } from "@/hooks/useActions";
import { useRouter } from "next/navigation";
import { CastSection } from "./_components/cast-section";
import { TrailerModal } from "./_components/trailer-modal";
import { ImageGallery } from "./_components/image-gallery";
import { motion } from "framer-motion";

interface SeriesDetailsProps {
  demoMode?: boolean;
}

export function SeriesDetails({ demoMode = false }: SeriesDetailsProps) {
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
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const router = useRouter();
  const { serie: series, setCurrentSerie: onSeriesUpdate } = useMediaContext();
  const { handlePlayEpisode: onPlayEpisode } = useActions();

  // All hooks must be before early return
  // Task 4: Auto-fetch and save season details when series page opens
  useEffect(() => {
    if (!series) return;

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
  }, [series?.id]); // Only run when series ID changes

  // Load episode watch status on mount
  useEffect(() => {
    if (!series) return;

    const loadEpisodeWatchStatus = async () => {
      try {
        const { getSeriesEpisodeWatchStatus } = await import("@/services/databaseService");
        const watchedEpisodes = await getSeriesEpisodeWatchStatus(series.id);

        if (watchedEpisodes.size === 0) return;

        // Update series with watch status for each episode
        const updatedSeasons = series.seasons.map((season) => ({
          ...season,
          episodes: season.episodes.map((episode) => {
            const key = `${episode.season_number}-${episode.episode_number}`;
            return {
              ...episode,
              isWatched: watchedEpisodes.get(key) || false,
            };
          }),
        }));

        const updatedSeries = {
          ...series,
          seasons: updatedSeasons,
        };

        if (onSeriesUpdate) {
          onSeriesUpdate(updatedSeries);
        }
      } catch (error) {
        console.error("Failed to load episode watch status:", error);
      }
    };

    // Only load watch status if we have episodes
    const hasEpisodes = series.seasons.some((season) => season.episodes && season.episodes.length > 0);
    if (hasEpisodes) {
      loadEpisodeWatchStatus();
    }
  }, [series?.id, series?.seasons?.length]); // Re-run when series or seasons change

  // Save series view action
  useEffect(() => {
    if (!series) return;

    const saveView = async () => {
      try {
        const { userActionService } = await import("@/services/userActionService");
        await userActionService.saveSeriesView(series.id);
      } catch (error) {
        console.error("Failed to save series view:", error);
      }
    };

    saveView();
  }, [series?.id]);

  if (!series) return null;

  function onDelete() {
    router.push("/library");
  }
  function onBack() {
    router.back();
  }

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
        if (onSeriesUpdate != null) {
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

  const handleEpisodeWatchToggle = async (episode: Episode, isWatched: boolean) => {
    try {
      await toggleEpisodeWatchStatus(series.id, episode.id, episode.season_number, episode.episode_number);

      // Update local state
      if (onSeriesUpdate) {
        const updatedSeasons = series.seasons.map((season) => {
          if (season.seasonNumber === episode.season_number) {
            return {
              ...season,
              episodes: season.episodes.map((ep) => {
                if (ep.id === episode.id) {
                  return { ...ep, isWatched };
                }
                return ep;
              }),
            };
          }
          return season;
        });

        onSeriesUpdate({
          ...series,
          seasons: updatedSeasons,
        });
      }

      console.log(
        `${isWatched ? "✅" : "❌"} Episode ${episode.season_number}x${episode.episode_number} watch status toggled`,
      );
    } catch (error) {
      console.error("Error toggling episode watch status:", error);
      alert("Erro ao atualizar status do episódio");
    }
  };

  const handleEditEpisode = (episode: Episode) => {
    setEditingEpisode(episode);
  };

  const handleSaveEpisode = async (updatedEpisode: Episode) => {
    try {
      // Update the episode in the series data
      const updatedSeasons = series.seasons.map((season) => ({
        ...season,
        episodes: season.episodes.map((ep) => (ep.id === updatedEpisode.id ? updatedEpisode : ep)),
      }));

      const updatedSeries = {
        ...series,
        seasons: updatedSeasons,
      };

      // Save to database
      const allSeries = await getSeries();
      const updatedAllSeries = allSeries.map((s) =>
        s.id === updatedSeries.id && s.folderId === updatedSeries.folderId ? updatedSeries : s,
      );
      await saveSeries(updatedAllSeries);

      // Update local state
      if (onSeriesUpdate) {
        onSeriesUpdate(updatedSeries);
      }

      console.log(`✅ Episode updated: ${updatedEpisode.name}`);
    } catch (error) {
      console.error("Failed to save episode:", error);
      throw error;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-on-primary-crx  z-50 overflow-auto"
    >
      {/* Backdrop Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative h-[60vh] overflow-hidden"
      >
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
              {!demoMode && (
                <div className="flex gap-3 flex-wrap">
                  {series.videos && series.videos.length > 0 && (
                    <TrailerModal videos={series.videos} title={series.title} />
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(true)}
                    disabled={isRematching}
                    className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
                  >
                    {isRematching ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Edit className="w-5 h-5 mr-2" />
                    )}
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg backdrop-blur-sm"
                    >
                      <span className="text-sm text-white">{rematchStatus}</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      {/* Details Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-7xl mx-auto px-8 py-12"
      >
        {/* Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
          {series.overview ? (
            <p className="text-slate-300 leading-relaxed text-lg max-w-4xl">{series.overview}</p>
          ) : (
            <p className="text-slate-500 italic">No overview available</p>
          )}
        </motion.div>

        {/* Cast Section */}
        {series.cast && series.cast.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-12"
          >
            <CastSection cast={series.cast} />
          </motion.div>
        )}

        {/* Image Gallery */}
        {series.images && series.images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-12"
          >
            <ImageGallery images={series.images} title={series.title} />
          </motion.div>
        )}

        {/* Seasons & Episodes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Seasons & Episodes</h2>
          <div className="space-y-4">
            {series.seasons
              .sort((a, b) => a.seasonNumber - b.seasonNumber)
              .map((season, index) => (
                <motion.div
                  key={season.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                >
                  <SeasonCard
                    season={season}
                    seriesId={series.id}
                    isExpanded={expandedSeasons.has(season.id)}
                    onToggle={() => toggleSeason(season.id)}
                    onPlayEpisode={onPlayEpisode}
                    onEditEpisode={handleEditEpisode}
                    onEpisodeWatchToggle={handleEpisodeWatchToggle}
                  />
                </motion.div>
              ))}
          </div>
        </motion.div>
      </motion.div>
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
      {/* Episode Edit Dialog */}
      <EpisodeEditDialog
        open={editingEpisode !== null}
        onOpenChange={(open) => !open && setEditingEpisode(null)}
        episode={editingEpisode}
        seriesId={series.id}
        onSave={handleSaveEpisode}
      />
    </motion.div>
  );
}
