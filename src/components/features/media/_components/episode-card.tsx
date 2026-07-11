import { cn } from "@/lib/utils";
import { Episode } from "@/types/serie";
import { Play, Check, X, Pencil, Volume2, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/utils/mediaUtils";
import { LazyImage } from "@/components/ui/lazy-image";
import { isAtRisk } from "@/hooks/useBgTranscode";

interface EpisodeCardProps {
  episode: Episode;
  seriesId: string;
  onPlay: (episode: Episode) => void;
  onEdit?: (episode: Episode) => void;
  onWatchToggle?: (episode: Episode, isWatched: boolean) => void;
  /** True when a completed, up-to-date audio transcode is already cached for this episode. */
  isTranscoded?: boolean;
  /** True when this episode is the one currently being processed by the background transcode queue. */
  isTranscoding?: boolean;
  /** Queues just this episode's audio transcode without opening the player. Only rendered when the
   * episode is AT_RISK and not already transcoded/transcoding. */
  onQueueTranscode?: (episode: Episode) => Promise<void> | void;
}

export function EpisodeCard({
  episode,
  seriesId,
  onPlay,
  onEdit,
  onWatchToggle,
  isTranscoded = false,
  isTranscoding = false,
  onQueueTranscode,
}: EpisodeCardProps) {
  const [stillError, setStillError] = useState(false);
  const [isWatched, setIsWatched] = useState(episode.isWatched ?? false);
  const [isHovered, setIsHovered] = useState(false);
  const [isQueuingTranscode, setIsQueuingTranscode] = useState(false);

  const handleWatchToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !isWatched;
    setIsWatched(newStatus);
    onWatchToggle?.(episode, newStatus);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(episode);
  };

  const handleQueueTranscode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onQueueTranscode) return;
    setIsQueuingTranscode(true);
    try {
      await onQueueTranscode(episode);
    } finally {
      setIsQueuingTranscode(false);
    }
  };

  const showTranscodeAction =
    !!episode.filePath && isAtRisk(episode.filePath) && !isTranscoded && !isTranscoding && !!onQueueTranscode;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-full flex items-center gap-4 p-3 rounded-lg transition-all relative group",
        episode.available ? "hover:bg-slate-800/60 cursor-pointer" : "opacity-50 cursor-not-allowed",
      )}
    >
      {/* Episode Still */}
      <div
        className="w-40 aspect-video rounded overflow-hidden flex-shrink-0 bg-slate-800 relative"
        onClick={() => episode.available && onPlay(episode)}
      >
        {episode.still_path && !stillError ? (
          <LazyImage
            src={getImageUrl(episode.still_path)}
            alt={episode.title}
            className="w-full h-full object-cover"
            onError={() => setStillError(true)}
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-6 h-6 text-slate-600" />
              </div>
            }
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-slate-600" />
          </div>
        )}

        {/* Play Overlay on Hover */}
        {episode.available && isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-black fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Watched Badge */}
        {isWatched && (
          <Badge className="absolute top-2 right-2 text-xs bg-green-600/90 text-white border-green-400">
            <Check className="w-3 h-3 mr-1" />
            Assistido
          </Badge>
        )}

        {/* Audio Transcode Status Badge */}
        {isTranscoding ? (
          <Badge className="absolute top-2 left-2 text-xs bg-amber-600/90 text-white border-amber-400">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Transcodificando
          </Badge>
        ) : (
          isTranscoded && (
            <Badge className="absolute top-2 left-2 text-xs bg-blue-600/90 text-white border-blue-400">
              <Volume2 className="w-3 h-3 mr-1" />
              Áudio pronto
            </Badge>
          )
        )}
      </div>

      {/* Episode Info */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-400">E{episode.episode_number}</span>
          <h4 className="text-base font-semibold text-white truncate">{episode.title}</h4>
        </div>
        {episode.overview && <p className="text-sm text-slate-400 line-clamp-2">{episode.overview}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          {episode.air_date && <span>{new Date(episode.air_date).toLocaleDateString()}</span>}
          {episode.runtime && <span>{episode.runtime}min</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Watch Toggle Button */}
        <TooltipIconButton
          size="icon"
          variant="outline"
          className={cn(
            "w-9 h-9 rounded-full transition-all",
            isWatched
              ? "bg-green-600/20 hover:bg-red-600/20 border-green-500/30 hover:border-red-500/30"
              : "bg-slate-800/50 hover:bg-green-600/20 border-slate-700 hover:border-green-500/30",
          )}
          onClick={handleWatchToggle}
          label={isWatched ? "Desmarcar como assistido" : "Marcar como assistido"}
        >
          {isWatched ? <X className="w-4 h-4 text-red-400" /> : <Check className="w-4 h-4 text-green-400" />}
        </TooltipIconButton>

        {/* Queue Transcode Button */}
        {showTranscodeAction && (
          <TooltipIconButton
            size="icon"
            variant="outline"
            className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-amber-600/20 border-slate-700 hover:border-amber-500/30"
            onClick={handleQueueTranscode}
            disabled={isQueuingTranscode}
            label="Pré-processar áudio deste episódio (evita espera no player)"
          >
            {isQueuingTranscode ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Zap className="w-4 h-4 text-amber-400" />
            )}
          </TooltipIconButton>
        )}

        {/* Edit Button */}
        {onEdit && (
          <TooltipIconButton
            size="icon"
            variant="outline"
            className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-slate-700 border-slate-700"
            onClick={handleEdit}
            label="Editar episódio"
          >
            <Pencil className="w-4 h-4" />
          </TooltipIconButton>
        )}

        {/* Play Button */}
        {episode.available && (
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => onPlay(episode)}
          >
            <Play className="w-5 h-5 text-white fill-current" />
          </Button>
        )}
      </div>
    </div>
  );
}
