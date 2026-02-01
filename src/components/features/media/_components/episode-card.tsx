import { cn } from "@/lib/utils";
import { Episode } from "@/types";
import { Play } from "lucide-react";
import { useState } from "react";

interface EpisodeCardProps {
  episode: Episode;
  onPlay: (episode: Episode) => void;
}

export function EpisodeCard({ episode, onPlay }: EpisodeCardProps) {
  const [stillError, setStillError] = useState(false);

  return (
    <button
      onClick={() => episode.available && onPlay(episode)}
      disabled={!episode.available}
      className={cn(
        "w-full flex items-center gap-4 p-3 rounded-lg transition-all",
        episode.available ? "hover:bg-slate-800 cursor-pointer" : "opacity-50 cursor-not-allowed",
      )}
    >
      {/* Episode Still */}
      <div className="w-40 aspect-video rounded overflow-hidden flex-shrink-0 bg-slate-800">
        {episode.stillPath && !stillError ? (
          <img
            src={episode.stillPath}
            alt={episode.title}
            className="w-full h-full object-cover"
            onError={() => setStillError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-slate-600" />
          </div>
        )}
      </div>

      {/* Episode Info */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-400">E{episode.episodeNumber}</span>
          <h4 className="text-base font-semibold text-white">{episode.title}</h4>
        </div>
        {episode.overview && <p className="text-sm text-slate-400 line-clamp-2">{episode.overview}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          {episode.airDate && <span>{new Date(episode.airDate).toLocaleDateString()}</span>}
          {episode.duration && <span>{episode.duration}min</span>}
        </div>
      </div>

      {/* Play Icon */}
      {episode.available && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <Play className="w-5 h-5 text-white fill-current" />
          </div>
        </div>
      )}
    </button>
  );
}
