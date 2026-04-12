/**
 * Series Details Component
 * Displays detailed information about a series with seasons and episodes
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Calendar, Star, Edit, Loader2, FolderOpen, Trash2, CheckCircle2, Eye } from "lucide-react";
import { Season, Episode, Series } from "@/types/serie";
import { cn } from "@/lib/utils";
import { rematchSeriesEpisodes, fetchSeasonDetails, fetchMediaImages } from "@/services/mediaService";
import { EditMediaModal } from "@/components/ui/edit-media-modal";
import { tauriService } from "@/services/tauri";
import { SeriesEditDialog } from "./_components/series-edit-dialog";
import { apiService } from "@/services/api";
import { DeleteMediaDialog } from "@/components/features/library/_components/delete-media-dialog";
import { EpisodeEditDialog } from "./_components/episode-edit-dialog";
import { SeasonCard } from "./_components/season-card";
import {
  getSeries,
  saveSeries,
  removeSeries,
  toggleEpisodeWatchStatus,
  toggleSeasonWatchStatus,
  setSeriesEpisodesWatchStatus,
} from "@/services/databaseService";
import { useMediaContext } from "@/context/mediaContext";
import { useActions, type SeriesPlayResult } from "@/hooks/useActions";
import { useRouter } from "next/navigation";
import { CastSection } from "./_components/cast-section";
import { TrailerModal } from "./_components/trailer-modal";
import { ImageGallery } from "./_components/image-gallery";
import { motion } from "framer-motion";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

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
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isRefreshingGallery, setIsRefreshingGallery] = useState(false);
  const [isSeriesWatched, setIsSeriesWatched] = useState(false);
  const [isTogglingWatched, setIsTogglingWatched] = useState(false);
  const [isStartingSeriesPlayback, setIsStartingSeriesPlayback] = useState(false);
  const [showSeasonSelectionDialog, setShowSeasonSelectionDialog] = useState(false);
  const [seasonSelectionOptions, setSeasonSelectionOptions] = useState<number[]>([]);
  const [selectedSeasonToStart, setSelectedSeasonToStart] = useState<string>("");
  const router = useRouter();
  const { serie: series, setCurrentSerie: onSeriesUpdate } = useMediaContext();
  const { handlePlayEpisode: onPlayEpisode, handlePlaySeries } = useActions();
  const { isOnline } = useApiConnectivity();
  const seriesSeasons = Array.isArray(series?.seasons) ? series.seasons : [];
  const [filePath, setFilePath] = useState("");
  const isSeriesFullyWatched = (seasons: Season[]) => {
    const episodes = seasons.flatMap((season) => season.episodes || []);
    if (episodes.length === 0) return false;
    return episodes.every((episode) => episode.isWatched === true);
  };

  const toGalleryImages = (imagesData: any) => {
    return [
      ...(imagesData.backdrop?.slice(0, 12).map((img: any) => `https://image.tmdb.org/t/p/original${img.file_path}`) ??
        []),
      ...(imagesData.poster?.slice(0, 6).map((img: any) => `https://image.tmdb.org/t/p/w500${img.file_path}`) ?? []),
    ] as string[];
  };

  // All hooks must be before early return
  // Auto-fetch ALL season + episode details from TMDB (including seasons not in local folder)
  useEffect(() => {
    if (!series) return;
    if (!isOnline) return;
    for (const season of seriesSeasons) {
      for (const episode of season.episodes) {
        if (episode.filePath && !episode.filePath.includes("/demo/")) {
          setFilePath(episode.filePath);
          break;
        }
      }
      if (filePath) break;
    }
    const loadSeasonDetails = async () => {
      // Only skip if all seasons already have episode details loaded
      const allSeasonsHaveDetails =
        series.numberOfSeasons > 0 &&
        seriesSeasons.length >= series.numberOfSeasons &&
        seriesSeasons.every((s) => s.episodes && s.episodes.length > 0);

      if (allSeasonsHaveDetails) {
        console.log("✅ Series already has complete season details");
        return;
      }

      setIsLoadingSeasons(true);
      console.log(`🔄 Loading all season details for: ${series.title} (${series.numberOfSeasons} seasons)`);

      try {
        const updatedSeasons: Season[] = [];

        // Build map of existing seasons for file path / watch status preservation
        const existingSeasonMap = new Map<number, Season>();
        seriesSeasons.forEach((s) => existingSeasonMap.set(s.seasonNumber, s));

        // Iterate over ALL seasons from TMDB (1..numberOfSeasons)
        const totalSeasons = series.numberOfSeasons || seriesSeasons.length;
        for (let seasonNum = 1; seasonNum <= totalSeasons; seasonNum++) {
          try {
            const existingSeason = existingSeasonMap.get(seasonNum);
            const seasonDetails = await fetchSeasonDetails(series.id, seasonNum);

            if (seasonDetails) {
              // Preserve existing filePaths and watch status by episode number
              const existingEpFilePaths = new Map<number, string>();
              const existingEpWatched = new Map<number, boolean>();
              if (existingSeason) {
                existingSeason.episodes.forEach((ep) => {
                  if (ep.filePath) existingEpFilePaths.set(ep.episode_number, ep.filePath);
                  if (ep.isWatched) existingEpWatched.set(ep.episode_number, true);
                });
              }

              const episodes: Episode[] = seasonDetails.episodes.map((ep) => {
                const filePath = existingEpFilePaths.get(ep.episode_number);
                return {
                  id: ep.id,
                  name: ep.name,
                  title: ep.name,
                  overview: ep.overview,
                  episode_number: ep.episode_number,
                  season_number: ep.season_number,
                  still_path: ep.still_path,
                  air_date: ep.air_date,
                  runtime: ep.runtime,
                  vote_average: ep.vote_average,
                  duration: ep.runtime,
                  filePath,
                  available: !!filePath,
                  isWatched: existingEpWatched.get(ep.episode_number) ?? false,
                } as Episode;
              });

              updatedSeasons.push({
                id: existingSeason?.id ?? `${series.id}-s${seasonNum}`,
                seasonNumber: seasonNum,
                name: seasonDetails.name,
                overview: seasonDetails.overview ?? existingSeason?.overview,
                poster: seasonDetails.poster_path ?? existingSeason?.poster,
                folderPath: existingSeason?.folderPath,
                episodeCount: seasonDetails.episodes.length,
                episodes,
                available: existingSeason?.available ?? episodes.some((ep) => ep.available),
                downloadedEpisodes: episodes.filter((ep) => ep.available).length,
              });
              console.log(`✅ Loaded Season ${seasonNum}: ${episodes.length} episodes`);
            } else if (existingSeason) {
              updatedSeasons.push(existingSeason);
            }
          } catch (error) {
            console.error(`Failed to load Season ${seasonNum}:`, error);
            const existingSeason = existingSeasonMap.get(seasonNum);
            if (existingSeason) updatedSeasons.push(existingSeason);
          }
        }

        const updatedSeries = { ...series, seasons: updatedSeasons };

        // Save updated series to database
        const allSeries = await getSeries();
        const updatedAllSeries = allSeries.map((s) =>
          s.id === updatedSeries.id && s.folderId === updatedSeries.folderId ? updatedSeries : s,
        );
        await saveSeries(updatedAllSeries);
        console.log(`✅ Saved all season details for: ${series.title}`);

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
  }, [series?.id, isOnline]); // Only run when series ID changes

  // Fetch gallery images from API
  useEffect(() => {
    if (!series) return;
    const loadImages = async () => {
      if (!isOnline) {
        if (series.images && series.images.length > 0) {
          setGalleryImages(series.images);
        }
        return;
      }

      try {
        const imagesData = await fetchMediaImages(series.id, "tv");
        const images: string[] = [
          ...(imagesData.backdrop
            ?.slice(0, 12)
            .map((img: any) => `https://image.tmdb.org/t/p/original${img.file_path}`) ?? []),
          ...(imagesData.poster?.slice(0, 6).map((img: any) => `https://image.tmdb.org/t/p/w500${img.file_path}`) ??
            []),
        ];
        if (images.length > 0) setGalleryImages(images);
        else if (series.images && series.images.length > 0) setGalleryImages(series.images);
      } catch {
        if (series.images && series.images.length > 0) setGalleryImages(series.images);
      }
    };
    loadImages();
  }, [series?.id, series?.images, isOnline]);

  // Load episode watch status on mount
  useEffect(() => {
    if (!series) return;

    const loadEpisodeWatchStatus = async () => {
      try {
        const { getSeriesEpisodeWatchStatus } = await import("@/services/databaseService");
        const watchedEpisodes = await getSeriesEpisodeWatchStatus(series.id);

        // Update series with watch status for each episode
        const updatedSeasons = seriesSeasons.map((season) => ({
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

        setIsSeriesWatched(isSeriesFullyWatched(updatedSeasons));

        if (onSeriesUpdate) {
          onSeriesUpdate(updatedSeries);
        }
      } catch (error) {
        console.error("Failed to load episode watch status:", error);
      }
    };

    // Only load watch status if we have episodes
    const hasEpisodes = seriesSeasons.some((season) => season.episodes && season.episodes.length > 0);
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

  const handleSeriesPlayResult = (result: SeriesPlayResult) => {
    if (result.status === "needs-season-selection") {
      setSeasonSelectionOptions(result.availableSeasons);
      setSelectedSeasonToStart(String(result.availableSeasons[0] ?? ""));
      setShowSeasonSelectionDialog(true);
      return;
    }

    if (result.status === "invalid-season") {
      alert(`Temporada invalida. Escolha apenas entre: ${result.availableSeasons.join(", ")}.`);
      return;
    }

    if (result.status === "completed") {
      alert("Serie concluida. Nao ha proximo episodio disponivel para reproduzir.");
      return;
    }

    if (result.status === "no-episodes") {
      alert("Nao ha episodios disponiveis localmente para esta serie.");
    }
  };

  const handlePlaySeriesClick = async () => {
    setIsStartingSeriesPlayback(true);
    try {
      const result = await handlePlaySeries(series);
      handleSeriesPlayResult(result);
    } catch (error) {
      console.error("Failed to start series playback:", error);
      alert("Nao foi possivel iniciar a reproducao da serie.");
    } finally {
      setIsStartingSeriesPlayback(false);
    }
  };

  const handleConfirmSeasonSelection = async () => {
    const seasonNumber = Number(selectedSeasonToStart);
    if (!Number.isInteger(seasonNumber)) {
      alert("Temporada invalida. Informe um numero de temporada.");
      return;
    }

    setIsStartingSeriesPlayback(true);
    try {
      const result = await handlePlaySeries(series, { seasonNumber });

      if (result.status === "played") {
        setShowSeasonSelectionDialog(false);
        return;
      }

      handleSeriesPlayResult(result);
    } catch (error) {
      console.error("Failed to start series playback with selected season:", error);
      alert("Nao foi possivel iniciar a reproducao da serie.");
    } finally {
      setIsStartingSeriesPlayback(false);
    }
  };

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

    if (!isOnline) {
      alert("Modo offline ativo. O rematch de serie requer conexao com a API externa.");
      return;
    }

    setIsRematching(true);
    setRematchStatus("Buscando dados da nova série...");

    try {
      const details = (await apiService.getMediaDetailsById(newSeriesId, "tv")) as any;
      if (!details) throw new Error("Não foi possível buscar os detalhes da série");

      const newId = details.id?.toString() || newSeriesId;

      // Build episode file path mapping from existing series
      const existingEpMap = new Map<string, string>(); // "S{s}E{e}" -> filePath
      seriesSeasons.forEach((season) => {
        season.episodes.forEach((ep) => {
          if (ep.filePath) existingEpMap.set(`S${ep.season_number}E${ep.episode_number}`, ep.filePath);
        });
      });

      const genres = details.genres?.map((g: any) => ({ name: g.name })) ?? [];
      const cast =
        details.credits?.cast?.slice(0, 20).map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        })) ?? [];
      const crew =
        details.credits?.crew
          ?.filter((c: any) => ["Director", "Producer", "Screenplay"].includes(c.job))
          .slice(0, 10)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            job: c.job,
            department: c.department,
            profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
          })) ?? [];
      const videos =
        details.videos?.results
          ?.filter((v: any) => v.type === "Trailer" || v.type === "Teaser")
          .slice(0, 5)
          .map((v: any) => ({ id: v.id, key: v.key, name: v.name, site: v.site, type: v.type })) ?? [];

      const updatedSeries: Series = {
        id: newId,
        type: series.type,
        title: details.name || "Unknown",
        originalTitle: details.original_name,
        overview: details.overview,
        poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
        backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : undefined,
        rating: details.vote_average,
        year: parseInt(details.first_air_date?.split("-")[0] || "0"),
        status: "MATCHED",
        folderId: series.folderId,
        filePath: series.filePath,
        numberOfSeasons: details.number_of_seasons || 0,
        numberOfEpisodes: details.number_of_episodes || 0,
        firstAirDate: details.first_air_date,
        lastAirDate: details.last_air_date,
        tagline: details.tagline,
        genres,
        cast: cast.length > 0 ? cast : undefined,
        crew: crew.length > 0 ? crew : undefined,
        videos: videos.length > 0 ? videos : undefined,
        trailer: videos[0] ? `https://www.youtube.com/watch?v=${videos[0].key}` : undefined,
        seasons:
          details.seasons?.map((season: any) => ({
            id: `${newId}-s${season.season_number}`,
            seasonNumber: season.season_number,
            name: season.name,
            overview: season.overview,
            poster: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : undefined,
            episodeCount: season.episode_count,
            episodes: [],
            available: false,
            downloadedEpisodes: 0,
          })) ?? [],
      };

      // Remove old series if ID changed
      if (series.id !== newId) {
        await removeSeries(series.id);
      }

      // Save new/updated series
      const allSeries = await getSeries();
      const existingIdx = allSeries.findIndex((s) => s.id === newId && s.folderId === series.folderId);
      if (existingIdx >= 0) {
        allSeries[existingIdx] = updatedSeries;
        await saveSeries(allSeries);
      } else {
        const without = allSeries.filter((s) => !(s.id === series.id && s.folderId === series.folderId));
        await saveSeries([...without, updatedSeries]);
      }

      if (onSeriesUpdate) onSeriesUpdate(updatedSeries);

      setRematchStatus("✓ Série atualizada com sucesso!");
      setTimeout(() => {
        setRematchStatus("");
        setIsRematching(false);
        setIsEditModalOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Error updating series:", error);
      setRematchStatus(`✗ Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      setTimeout(() => {
        setRematchStatus("");
        setIsRematching(false);
      }, 3000);
    }
  };

  const handleOpenFolder = async () => {
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

  const handleSaveSeriesEdits = async (updatedSeries: Series) => {
    try {
      const normalizedSeries = {
        ...updatedSeries,
        seasons: Array.isArray(updatedSeries.seasons) ? updatedSeries.seasons : [],
      };
      if (onSeriesUpdate) onSeriesUpdate(normalizedSeries);
    } catch (error) {
      console.error("Error saving edits:", error);
    }
  };

  const handleRefreshSeason = async (season: Season) => {
    if (!isOnline) {
      alert("Modo offline ativo. A atualizacao de temporada requer conexao com a API externa.");
      return;
    }

    try {
      const seasonDetails = await fetchSeasonDetails(series.id, season.seasonNumber);

      if (!seasonDetails) {
        alert("Não foi possível atualizar os dados desta temporada.");
        return;
      }

      const existingByEpisode = new Map<number, Episode>();
      season.episodes.forEach((episode) => {
        existingByEpisode.set(episode.episode_number, episode);
      });

      const refreshedEpisodes: Episode[] = seasonDetails.episodes.map((episode) => {
        const existing = existingByEpisode.get(episode.episode_number);
        const filePath = existing?.filePath;

        return {
          id: episode.id,
          name: episode.name,
          title: episode.name,
          overview: episode.overview,
          episode_number: episode.episode_number,
          season_number: episode.season_number,
          still_path: episode.still_path,
          air_date: episode.air_date,
          runtime: episode.runtime,
          vote_average: episode.vote_average,
          duration: episode.runtime,
          filePath,
          available: !!filePath,
          isWatched: existing?.isWatched ?? false,
        } as Episode;
      });

      const updatedSeasons = seriesSeasons.map((currentSeason) => {
        if (currentSeason.seasonNumber !== season.seasonNumber) {
          return currentSeason;
        }

        return {
          ...currentSeason,
          name: seasonDetails.name || currentSeason.name,
          overview: seasonDetails.overview || currentSeason.overview,
          poster: seasonDetails.poster_path || currentSeason.poster,
          folderPath: currentSeason.folderPath,
          episodeCount: seasonDetails.episodes.length,
          episodes: refreshedEpisodes,
          downloadedEpisodes: refreshedEpisodes.filter((episode) => !!episode.filePath).length,
          available: refreshedEpisodes.some((episode) => !!episode.filePath),
        };
      });

      const updatedSeries = {
        ...series,
        seasons: updatedSeasons,
      };

      const allSeries = await getSeries();
      const updatedAllSeries = allSeries.map((item) =>
        item.id === updatedSeries.id && item.folderId === updatedSeries.folderId ? updatedSeries : item,
      );

      await saveSeries(updatedAllSeries);

      setIsSeriesWatched(isSeriesFullyWatched(updatedSeasons));
      onSeriesUpdate?.(updatedSeries);
    } catch (error) {
      console.error("Error refreshing season:", error);
      alert("Erro ao atualizar a temporada.");
    }
  };

  const handleRefreshGallery = async () => {
    if (!isOnline) {
      alert("Modo offline ativo. A atualizacao da galeria requer conexao com a API externa.");
      return;
    }

    setIsRefreshingGallery(true);
    try {
      const imagesData = await fetchMediaImages(series.id, "tv");
      const refreshedImages = toGalleryImages(imagesData);

      if (refreshedImages.length === 0) {
        alert("Não encontramos novas imagens para esta série.");
        return;
      }

      const updatedSeries = {
        ...series,
        images: refreshedImages,
      };

      const allSeries = await getSeries();
      const updatedAllSeries = allSeries.map((item) =>
        item.id === updatedSeries.id && item.folderId === updatedSeries.folderId ? updatedSeries : item,
      );

      await saveSeries(updatedAllSeries);
      setGalleryImages(refreshedImages);
      onSeriesUpdate?.(updatedSeries);
    } catch (error) {
      console.error("Error refreshing gallery:", error);
      alert("Erro ao atualizar galeria.");
    } finally {
      setIsRefreshingGallery(false);
    }
  };

  const handleToggleSeriesWatched = async () => {
    setIsTogglingWatched(true);
    try {
      const allEpisodes = seriesSeasons.flatMap((season) =>
        season.episodes.map((episode) => ({
          id: episode.id,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
        })),
      );

      if (allEpisodes.length === 0) {
        alert("Não há episódios carregados para atualizar o status de assistido.");
        return;
      }

      const targetStatus = !isSeriesWatched;
      await setSeriesEpisodesWatchStatus(series.id, allEpisodes, targetStatus);

      if (onSeriesUpdate) {
        const updatedSeasons = seriesSeasons.map((season) => ({
          ...season,
          episodes: season.episodes.map((episode) => ({ ...episode, isWatched: targetStatus })),
        }));

        onSeriesUpdate({
          ...series,
          seasons: updatedSeasons,
        });

        setIsSeriesWatched(isSeriesFullyWatched(updatedSeasons));
      } else {
        setIsSeriesWatched(targetStatus);
      }
    } catch (error) {
      console.error("Error toggling series watch status:", error);
      alert("Erro ao atualizar status de assistido");
    } finally {
      setIsTogglingWatched(false);
    }
  };

  const handleSeasonWatchToggle = async (season: Season, _isWatched: boolean) => {
    try {
      const episodes = season.episodes.map((ep) => ({ id: ep.id, episode_number: ep.episode_number }));
      const newStatus = await toggleSeasonWatchStatus(series.id, season.seasonNumber, episodes);

      if (onSeriesUpdate) {
        const updatedSeasons = seriesSeasons.map((s) => {
          if (s.seasonNumber !== season.seasonNumber) return s;
          return { ...s, episodes: s.episodes.map((ep) => ({ ...ep, isWatched: newStatus })) };
        });

        setIsSeriesWatched(isSeriesFullyWatched(updatedSeasons));

        onSeriesUpdate({ ...series, seasons: updatedSeasons });
      }
    } catch (error) {
      console.error("Error toggling season watch status:", error);
      alert("Erro ao atualizar status da temporada");
    }
  };

  const handleEpisodeWatchToggle = async (episode: Episode, _isWatched: boolean) => {
    try {
      const nextStatus = await toggleEpisodeWatchStatus(
        series.id,
        episode.id,
        episode.season_number,
        episode.episode_number,
      );

      // Update local state
      if (onSeriesUpdate) {
        const updatedSeasons = seriesSeasons.map((season) => {
          if (season.seasonNumber === episode.season_number) {
            return {
              ...season,
              episodes: season.episodes.map((ep) => {
                if (ep.id === episode.id) {
                  return { ...ep, isWatched: nextStatus };
                }
                return ep;
              }),
            };
          }
          return season;
        });

        setIsSeriesWatched(isSeriesFullyWatched(updatedSeasons));

        onSeriesUpdate({
          ...series,
          seasons: updatedSeasons,
        });
      }

      console.log(
        `${nextStatus ? "✅" : "❌"} Episode ${episode.season_number}x${episode.episode_number} watch status toggled`,
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
      const updatedSeasons = seriesSeasons.map((season) => ({
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
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-transparent" />

        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="fixed z-10 top-6 left-6 w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900"
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
                <h1 className="text-5xl font-[moonjelly-bold] text-white mb-2 ">{series.title}</h1>
                {series.originalTitle && series.originalTitle !== series.title && (
                  <p className="text-lg text-slate-400 mb-3">{series.originalTitle}</p>
                )}
                {series.tagline && <p className="text-md text-slate-300 italic mb-3">{series.tagline}</p>}
                {series.genres && series.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {series.genres.map((genre, index) => (
                      <Badge key={index} variant="outline" className="bg-slate-800/50 border-slate-600 text-slate-300">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
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
                  <Button
                    size="lg"
                    onClick={handlePlaySeriesClick}
                    disabled={isStartingSeriesPlayback}
                    className="bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] rounded-2xl"
                  >
                    {isStartingSeriesPlayback ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 mr-2 fill-current" />
                    )}
                    Assistir
                  </Button>

                  {series.videos && series.videos.length > 0 && (
                    <TrailerModal videos={series.videos} title={series.title} />
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleToggleSeriesWatched}
                    disabled={isTogglingWatched}
                    className={`backdrop-blur-xl rounded-2xl ${
                      isSeriesWatched
                        ? "bg-green-900/30 border-green-600 text-green-400 hover:bg-green-900/50"
                        : "bg-slate-800/80 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    {isTogglingWatched ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : isSeriesWatched ? (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    ) : (
                      <Eye className="w-5 h-5 mr-2" />
                    )}
                    {isSeriesWatched ? "Assistido" : "Marcar como Assistido"}
                  </Button>

                  {filePath && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleOpenFolder}
                      className="bg-slate-800/80 rounded-2xl border-slate-700 hover:bg-slate-800 backdrop-blur-xl"
                    >
                      <FolderOpen className="w-5 h-5 mr-2" />
                      Abrir Pasta
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setIsAdvancedEditOpen(true)}
                    className="bg-slate-800/80 rounded-2xl border-slate-700 hover:bg-slate-800 backdrop-blur-xl"
                  >
                    <Edit className="w-5 h-5 mr-2" />
                    Edição Avançada
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-red-900/20 border-red-700 rounded-2xl hover:bg-red-900/40 backdrop-blur-xl text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Excluir
                  </Button>
                  {rematchStatus && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center px-4 py-2  bg-slate-800/80 border border-slate-700 rounded-2xl backdrop-blur-sm"
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
        className="max-w-7xl mx-auto px-8 py-12 "
      >
        <div className="grid grid-cols-2 gap-12">
          {/* Overview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-[moonjelly-bold] text-white mb-4">Overview</h2>
            {series.overview ? (
              <p className="text-slate-300 font-sans leading-relaxed text-lg max-w-4xl">{series.overview}</p>
            ) : (
              <p className="text-slate-500 italic">Sem resumo disponivel</p>
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
        </div>
        {/* Seasons & Episodes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Seasons & Episodes</h2>
          <div className="space-y-4">
            {seriesSeasons
              .slice()
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
                    onSeasonWatchToggle={handleSeasonWatchToggle}
                    onSeasonRefresh={isOnline ? handleRefreshSeason : undefined}
                  />
                </motion.div>
              ))}
          </div>
        </motion.div>
        {/* Image Gallery */}
        {galleryImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-12"
          >
            <ImageGallery
              images={galleryImages}
              title={series.title}
              onRefresh={handleRefreshGallery}
              isRefreshing={isRefreshingGallery}
            />
          </motion.div>
        )}
      </motion.div>
      {/* Edit Media Modal */}
      <Dialog open={showSeasonSelectionDialog} onOpenChange={setShowSeasonSelectionDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Escolher temporada</DialogTitle>
            <DialogDescription className="text-slate-300">
              Selecione uma temporada disponivel localmente para iniciar do primeiro episodio.
            </DialogDescription>
          </DialogHeader>

          <Select value={selectedSeasonToStart} onValueChange={setSelectedSeasonToStart}>
            <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Selecione a temporada" />
            </SelectTrigger>
            <SelectContent>
              {seasonSelectionOptions.map((seasonNumber) => (
                <SelectItem key={seasonNumber} value={String(seasonNumber)}>
                  Temporada {seasonNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSeasonSelectionDialog(false)}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSeasonSelection}
              disabled={isStartingSeriesPlayback || !selectedSeasonToStart}
              className="bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)]"
            >
              {isStartingSeriesPlayback ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
