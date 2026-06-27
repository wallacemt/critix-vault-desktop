/**
 * Premium Streaming Card Component
 * Netflix-style media cards with hover effects and animations
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Info, Film, Tv, Star, Clock, Calendar, Pencil, Check, X, Trash2, Eye, EyeOff, Download, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { setSeriesEpisodesWatchStatus, toggleWatchStatus } from "@/services/databaseService";
import { Media, MediaType } from "@/types/media";
import { Series } from "@/types/serie";
import { useFoldersContext } from "@/context/foldersContext";
import { getLastWatchedEpisode } from "@/utils/mediaUtils";

interface StreamingCardProps {
  media: Media;
  /**
   * "library" (default): full action set — play, edit, delete, watched, hidden.
   * "discovery": only a Download button; watched/edit/delete/hidden are suppressed.
   */
  mode?: "library" | "discovery";
  onClick?: (media: Media) => void;
  onPlay?: (media: Media) => void;
  onEdit?: (media: Media) => void;
  onDelete?: (media: Media) => void;
  onToggleHidden?: (media: Media) => Promise<void> | void;
  onWatchedChange?: () => Promise<void> | void;
  /** Called when the user clicks Download in discovery mode. */
  onDownload?: (media: Media) => void;
  /** YouTube video key — when provided a Trailer button appears in discovery mode. */
  trailerKey?: string;
  /** Called when the user clicks the Trailer button in discovery mode. */
  onPlayTrailer?: () => void;
  selected?: boolean;
  onToggleSelect?: (media: string) => void;
  viewMode?: "grid" | "list";
  demoMode?: boolean;
}

export function StreamingCard({
  media,
  mode = "library",
  onClick,
  onPlay,
  onEdit,
  onDelete,
  onToggleHidden,
  onWatchedChange,
  onDownload,
  trailerKey,
  onPlayTrailer,
  selected = false,
  onToggleSelect,
  viewMode = "grid",
  demoMode = false,
}: StreamingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { refreshFolders } = useFoldersContext();
  // Derive directly from props so card stays in sync with refreshMedia() reloads
  const isWatched = media.isWatched ?? false;
  const isHidden = media.isHidden ?? false;
  // Subtly highlight media the user is actively watching (has lastWatchedAt, not yet completed).
  const isInProgress = !isWatched && !!media.lastWatchedAt;

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case "MOVIE":
        return Film;
      case "SERIES":
      case "ANIME":
        return Tv;
      default:
        return Film;
    }
  };

  const MediaIcon = getMediaIcon(media.type);
  // Show last watched episode, not next to watch — and only when ≥1 episode has been watched.
  const lastWatchedEp = media.type === "MOVIE" ? null : getLastWatchedEpisode(media as Series);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleToggleWatched = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (media.type === "MOVIE") {
      await toggleWatchStatus(media.id, media.type);
      await refreshFolders();
      await onWatchedChange?.();
      return;
    }

    const seriesMedia = media as Series;
    const episodes = (seriesMedia.seasons || []).flatMap((season) =>
      (season.episodes || []).map((episode) => ({
        id: episode.id,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
      })),
    );

    if (episodes.length === 0) {
      alert("Não foi possível atualizar por aqui porque a série ainda não tem episódios carregados.");
      return;
    }

    const nextStatus = !isWatched;
    const actionLabel = nextStatus ? "marcar" : "desmarcar";
    const confirmed = window.confirm(
      `Deseja ${actionLabel} ${episodes.length} episódio(s) desta série como assistido(s)?`,
    );

    if (!confirmed) return;

    await setSeriesEpisodesWatchStatus(media.id, episodes, nextStatus);
    await refreshFolders();
    await onWatchedChange?.();
  };

  const handleToggleHidden = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleHidden) return;
    await onToggleHidden(media);
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.01 }}
        className="group"
        style={selected ? { filter: "drop-shadow(0 0 10px rgba(251,191,36,0.8))" } : undefined}
      >
        <Card
          className={cn(
            "relative overflow-hidden border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer transition-all duration-300 hover:border-amber-400/50",
            selected && "border-2 border-amber-400 bg-amber-400/8",
            // DEF-007: match the grid view's in-progress ring so the indicator is
            // consistent across both view modes.
            isInProgress && !selected && "ring-1 ring-amber-500/40",
          )}
          onClick={() => onClick?.(media)}
          onContextMenu={(e) => {
            e.preventDefault();
            onToggleSelect?.(media.id);
          }}
        >
          {selected && (
            <>
              <div className="absolute left-0 top-0 h-full w-[3px] bg-amber-400 z-10 rounded-l-lg" />
              <motion.div
                className="absolute right-3 top-3 z-10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/40">
                  <Check className="w-4 h-4 text-black" />
                </div>
              </motion.div>
            </>
          )}
          <div className="flex gap-4 p-4">
            {/* Poster thumbnail */}
            <div className="relative w-30 flex-shrink-0 rounded-lg overflow-hidden">
              {media.poster && !imageError ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
                  )}
                  <img
                    src={media.poster}
                    alt={media.title}
                    className={cn(
                      "w-full h-full object-cover transition-opacity duration-300",
                      isHidden && "opacity-20",
                      !imageLoaded && "opacity-0",
                    )}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <MediaIcon className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-start gap-2 mb-2">
                  <h3 className="font-display truncate text-[var(--text-primary)] text-xl line-clamp-1  flex-1">
                    {media.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs shrink-0",
                      media.type === "MOVIE" && "bg-blue-600/20 text-blue-400 border-blue-500/30",
                      media.type === "SERIES" && "bg-purple-600/20 text-purple-400 border-purple-500/30",
                      media.type === "ANIME" && "bg-pink-600/20 text-pink-400 border-pink-500/30",
                    )}
                  >
                    {media.type === "ANIME" ? "Anime" : media.type}
                  </Badge>
                  {media.type !== "MOVIE" && (lastWatchedEp || isWatched) && (
                    <Badge className="shrink-0 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      {isWatched ? "Concluída" : `T${lastWatchedEp?.seasonNumber}:E${lastWatchedEp?.episodeNumber}`}
                    </Badge>
                  )}
                  {isHidden && (
                    <Badge className="shrink-0 border-amber-500/40 bg-amber-500/15 text-amber-300">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Oculta
                    </Badge>
                  )}
                </div>

                {/* Genres */}
                {media.genres && media.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {media.genres.slice(0, 3).map((genre, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs px-2 py-0.5 border-[var(--color-primary)]/30 text-[var(--text-secondary)]"
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mb-2 font-sans">
                  {media.year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {media.year}
                    </div>
                  )}
                  {media.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(media.duration)}
                    </div>
                  )}
                  {media.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {media.rating.toFixed(1)}
                    </div>
                  )}
                </div>

                {media.overview && (
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 font-sans">{media.overview}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                {mode === "discovery" ? (
                  // Discovery mode: Download + optional Trailer buttons
                  <>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload?.(media);
                      }}
                      className="bg-emerald-600/80 hover:bg-emerald-500 text-white"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Baixar
                    </Button>
                    {trailerKey && onPlayTrailer && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrailer();
                        }}
                        className="border-slate-600 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <Clapperboard className="w-4 h-4 mr-1" />
                        Trailer
                      </Button>
                    )}
                  </>
                ) : (
                  // Library mode: full action set
                  <>
                    {!demoMode && onPlay && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(media);
                        }}
                        className="bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] font-semibold"
                      >
                        <Play className="w-4 h-4 mr-1 fill-current" />
                        Assistir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick?.(media);
                      }}
                      className="bg-[var(--bg-surface-light)] border-[var(--border-color)]"
                    >
                      <Info className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "border-[var(--border-color)]",
                        isWatched
                          ? "bg-green-600/20 hover:bg-red-600/20 border-green-500/30"
                          : "bg-[var(--bg-surface-light)] hover:bg-green-600/20",
                      )}
                      onClick={handleToggleWatched}
                      title={isWatched ? "Desmarcar como assistido" : "Marcar como assistido"}
                    >
                      {isWatched ? (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          Assistido
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Marcar
                        </>
                      )}
                    </Button>
                    {onToggleHidden && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleHidden}
                        className={cn(
                          "border-[var(--border-color)]",
                          isHidden
                            ? "bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/30 text-amber-300"
                            : "bg-[var(--bg-surface-light)] hover:bg-amber-600/20",
                        )}
                        title={isHidden ? "Mostrar na biblioteca" : "Ocultar da biblioteca"}
                      >
                        {isHidden ? (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Mostrar
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Ocultar
                          </>
                        )}
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(media);
                        }}
                        className="bg-[var(--bg-surface-light)] border-[var(--border-color)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    {!demoMode && onDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(media);
                        }}
                        className="border-red-700/50 text-red-400 hover:bg-red-900/20 hover:border-red-600 bg-[var(--bg-surface-light)]"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: selected ? 0.95 : 1 }}
      whileHover={{ scale: selected ? 0.95 : 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={selected ? { filter: "drop-shadow(0 0 14px rgba(251,191,36,0.9))" } : undefined }
    >
      <Card
        className={cn(
          "group relative overflow-hidden rounded-lg bg-surface-crx cursor-pointer transition-all duration-300 hover:border-amber-400/50 hover:shadow-2xl hover:shadow-amber-400/20 -p-2",
          selected && "border-2 border-amber-400",
          // ponytail: subtle ring — only a ring, not a banner, to avoid visual noise
          isInProgress && !selected && "ring-1 ring-amber-500/40",
          isHidden && "opacity-60"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onClick?.(media)}
        onContextMenu={(e) => {
          e.preventDefault();
          onToggleSelect?.(media.id);
        }}
      >
        {selected && (
          <motion.div
            className="absolute right-2 top-2 z-20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/50">
              <Check className="w-5 h-5 text-black font-bold" strokeWidth={3} />
            </div>
          </motion.div>
        )}
        <div className="relative aspect-[2/3] overflow-hidden bg-slate-900">
          {selected && (
            <div className="absolute inset-0 z-[5] pointer-events-none bg-amber-400/20 rounded-t-lg" />
          )}
          {/* Poster Image */}
          {media.poster && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
              )}
              <motion.img
                src={media.poster}
                alt={media.title}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  !imageLoaded && "opacity-0",
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <MediaIcon className="w-16 h-16 text-slate-600" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-50" />

          {/* Status Badge */}
          {media.status === "UNMATCHED" && (
            <motion.div
              className="absolute top-3 right-3"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Badge variant="destructive" className="text-xs backdrop-blur-sm">
                Unmatched
              </Badge>
            </motion.div>
          )}

          {/* Type Badge */}
          <motion.div className="absolute top-3 left-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs backdrop-blur-sm",
                media.type === "MOVIE" && "bg-blue-600/80 text-white border-blue-400",
                media.type === "SERIES" && "bg-purple-600/80 text-white border-purple-400",
                media.type === "ANIME" && "bg-pink-600/80 text-white border-pink-400",
              )}
            >
              {media.type === "ANIME" ? "Anime" : media.type === "SERIES" ? "Series" : "Movie"}
            </Badge>
          </motion.div>

          {/* Watched Badge */}
          {isWatched && media.type === "MOVIE"&& (
            <motion.div
              className="absolute bottom-3 right-3"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Badge className="text-xs backdrop-blur-sm bg-green-600/90 text-white border-green-400">
                <Check className="w-3 h-3 mr-1" />
                Assistido
              </Badge>
            </motion.div>
          )}

          {media.type !== "MOVIE" && (lastWatchedEp || isWatched) && (
            <motion.div
              className="absolute bottom-3 left-3"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Badge className="text-xs backdrop-blur-sm bg-surface-crx text-primary rounded-lg">
                {isWatched ? "Concluída" : `T${lastWatchedEp?.seasonNumber}:E${lastWatchedEp?.episodeNumber}`}
              </Badge>
            </motion.div>
          )}

          {isHidden && (
            <motion.div
              className="absolute top-3 right-3"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Badge className="text-xs backdrop-blur-sm bg-amber-500/80 text-white border-amber-300">
                <EyeOff className="w-3 h-3 mr-1" />
                Oculta
              </Badge>
            </motion.div>
          )}

          {/* Hover Actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {mode === "discovery" ? (
                  // Discovery mode: Download + optional Trailer buttons
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
                      <Button
                        size="icon"
                        className="w-14 h-14 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload?.(media);
                        }}
                        title="Baixar torrent"
                      >
                        <Download className="w-6 h-6" />
                      </Button>
                    </motion.div>
                    {trailerKey && onPlayTrailer && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 }}>
                        <Button
                          size="icon"
                          className="w-12 h-12 rounded-full bg-red-700/80 hover:bg-red-600 text-white shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayTrailer();
                          }}
                          title="Assistir trailer"
                        >
                          <Clapperboard className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    )}
                  </>
                ) : (
                  // Library mode: full action set
                  <>
                    {!demoMode && onPlay && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
                        <Button
                          size="icon"
                          className="w-14 h-14 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(media);
                          }}
                        >
                          <Play className="w-6 h-6 fill-current" />
                        </Button>
                      </motion.div>
                    )}
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 }}>
                      <Button
                        size="icon"
                        variant="secondary"
                        className={cn(
                          "w-14 h-14 rounded-full backdrop-blur-sm transition-colors",
                          isWatched
                            ? "bg-green-600/80 hover:bg-red-600/80 border-green-400"
                            : "bg-gray-600/30 hover:bg-green-600/80 border-gray-400",
                        )}
                        onClick={handleToggleWatched}
                        title={isWatched ? "Desmarcar como assistido" : "Marcar como assistido"}
                      >
                        {isWatched ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                      </Button>
                    </motion.div>
                    {onToggleHidden && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.18 }}>
                        <Button
                          size="icon"
                          variant="secondary"
                          className={cn(
                            "w-10 h-10 rounded-full backdrop-blur-sm transition-colors border",
                            isHidden
                              ? "bg-amber-600/80 hover:bg-amber-500 border-amber-300 text-white"
                              : "bg-[var(--bg-surface)]/90 hover:bg-amber-600 hover:text-white border-[var(--border-color)]",
                          )}
                          onClick={handleToggleHidden}
                          title={isHidden ? "Mostrar na biblioteca" : "Ocultar da biblioteca"}
                        >
                          {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      </motion.div>
                    )}
                    {onEdit && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="w-10 h-10 rounded-full bg-[var(--bg-surface)]/90 hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] border-[var(--border-color)] backdrop-blur-sm transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(media);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    )}
                    {!demoMode && onDelete && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.25 }}>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="w-10 h-10 rounded-full bg-red-900/30 hover:bg-red-700 border-red-700 text-red-400 hover:text-white backdrop-blur-sm transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(media);
                          }}
                          title="Excluir da biblioteca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info Section */}
        <div className="p-4">
          <h3 className="font-bold truncate text-[var(--text-primary)] text-lg line-clamp-2 mb-2 font-display leading-tight">
            {media.title}
          </h3>

          {/* Genres */}
          {media.genres && media.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {media.genres.slice(0, 2).map((genre, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 border-[var(--color-primary)]/30 text-[var(--text-secondary)]"
                >
                  {genre.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-sans gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {media.year && <span>{media.year}</span>} -
              {media.createdAt && <span>{new Date(media.createdAt).toLocaleString("pt-BR")}</span>}
              {media.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(media.duration)}</span>
                </div>
              )}
            </div>
            {media.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span>{media.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
