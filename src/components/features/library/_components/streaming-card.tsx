/**
 * Premium Streaming Card Component
 * Netflix-style media cards with hover effects and animations
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Info, Film, Tv, Star, Clock, Calendar, Pencil, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toggleWatchStatus } from "@/services/databaseService";
import { Media, MediaType } from "@/types/media";
import { useFoldersContext } from "@/context/foldersContext";

interface StreamingCardProps {
  media: Media;
  onClick?: (media: Media) => void;
  onPlay?: (media: Media) => void;
  onEdit?: (media: Media) => void;
  onDelete?: (media: Media) => void;
  viewMode?: "grid" | "list";
  demoMode?: boolean;
}

export function StreamingCard({
  media,
  onClick,
  onPlay,
  onEdit,
  onDelete,
  viewMode = "grid",
  demoMode = false,
}: StreamingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { refreshFolders } = useFoldersContext();
  // Use the isWatched property that comes with the media data
  const [isWatched, setIsWatched] = useState(media.isWatched ?? false);

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

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.01 }}
        className="group"
      >
        <Card
          className="bg-[var(--bg-surface)] border-[var(--border-color)] overflow-hidden cursor-pointer transition-all duration-300 hover:border-[var(--color-primary)]/50"
          onClick={() => onClick?.(media)}
        >
          <div className="flex gap-4 p-4">
            {/* Poster thumbnail */}
            <div className="relative w-30 flex-shrink-0 rounded-lg overflow-hidden">
              {media.poster && !imageError ? (
                <img
                  src={media.poster}
                  alt={media.title}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
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
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newStatus = await toggleWatchStatus(media.id, media.type);
                    setIsWatched(newStatus);
                  }}
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
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className="group relative bg-[var(--bg-surface)] border-[var(--border-color)] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onClick?.(media)}
      >
        {/* Poster Image */}
        <div className="relative aspect-[2/3] overflow-hidden bg-slate-800">
          {media.poster && !imageError ? (
            <motion.img
              src={media.poster}
              alt={media.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <MediaIcon className="w-16 h-16 text-slate-600" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80" />

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
          {isWatched && (
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newStatus = await toggleWatchStatus(media.id, media.type);
                      await refreshFolders();
                      setIsWatched(newStatus);
                    }}
                    title={isWatched ? "Desmarcar como assistido" : "Marcar como assistido"}
                  >
                    {isWatched ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                  </Button>
                </motion.div>
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
              {media.year && <span>{media.year}</span>}
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
