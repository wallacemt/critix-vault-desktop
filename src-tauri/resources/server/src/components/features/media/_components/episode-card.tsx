import { cn } from "@/lib/utils";
import { Episode } from "@/types/serie";
import { Play, Check, X, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/utils/mediaUtils";

interface EpisodeCardProps {
  episode: Episode;
  seriesId: string;
  onPlay: (episode: Episode) => void;
  onEdit?: (episode: Episode) => void;
  onWatchToggle?: (episode: Episode, isWatched: boolean) => void;
}

export function EpisodeCard({ episode, seriesId, onPlay, onEdit, onWatchToggle }: EpisodeCardProps) {
  const [stillError, setStillError] = useState(false);
  const [isWatched, setIsWatched] = useState(episode.isWatched ?? false);
  const [isHovered, setIsHovered] = useState(false);

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
          <img
            src={getImageUrl(episode.still_path)}
            alt={episode.title}
            className="w-full h-full object-cover"
            onError={() => setStillError(true)}
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
        <Button
          size="icon"
          variant="outline"
          className={cn(
            "w-9 h-9 rounded-full transition-all",
            isWatched
              ? "bg-green-600/20 hover:bg-red-600/20 border-green-500/30 hover:border-red-500/30"
              : "bg-slate-800/50 hover:bg-green-600/20 border-slate-700 hover:border-green-500/30",
          )}
          onClick={handleWatchToggle}
          title={isWatched ? "Desmarcar como assistido" : "Marcar como assistido"}
        >
          {isWatched ? <X className="w-4 h-4 text-red-400" /> : <Check className="w-4 h-4 text-green-400" />}
        </Button>

        {/* Edit Button */}
        {onEdit && (
          <Button
            size="icon"
            variant="outline"
            className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-slate-700 border-slate-700"
            onClick={handleEdit}
            title="Editar episódio"
          >
            <Pencil className="w-4 h-4" />
          </Button>
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
