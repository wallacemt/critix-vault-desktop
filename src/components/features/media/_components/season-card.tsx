import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Episode, Season } from "@/types";
import { CheckCircle2, ChevronDown, ChevronUp, Play, XCircle } from "lucide-react";
import { useState } from "react";
import { EpisodeCard } from "./episode-card";

interface SeasonCardProps {
  season: Season;
  isExpanded: boolean;
  onToggle: () => void;
  onPlayEpisode: (episode: Episode) => void;
}

export function SeasonCard({ season, isExpanded, onToggle, onPlayEpisode }: SeasonCardProps) {
  const [posterError, setPosterError] = useState(false);

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
      {/* Season Header */}
      <button onClick={onToggle} className="w-full p-6 flex items-center gap-6 hover:bg-slate-800/50 transition-colors">
        {/* Season Poster */}
        <div className="w-24 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-slate-800">
          {season.poster && !posterError ? (
            <img
              src={season.poster}
              alt={season.name}
              className="w-full h-full object-cover"
              onError={() => setPosterError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-slate-600" />
            </div>
          )}
        </div>

        {/* Season Info */}
        <div className="flex-1 text-left">
          <h3 className="text-xl font-bold text-white mb-2">{season.name}</h3>
          {season.overview && <p className="text-sm text-slate-400 line-clamp-2 mb-2">{season.overview}</p>}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{season.episodeCount} episodes</span>
            {season.available ? (
              <Badge variant="outline" className="bg-green-600/10 text-green-400 border-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {season.downloadedEpisodes} Downloaded
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-600/10 text-red-400 border-red-600">
                <XCircle className="w-3 h-3 mr-1" />
                Not Downloaded
              </Badge>
            )}
          </div>
        </div>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-6 h-6 text-slate-400" />
        ) : (
          <ChevronDown className="w-6 h-6 text-slate-400" />
        )}
      </button>

      {/* Episodes List */}
      {isExpanded && (
        <div className="border-t border-slate-800">
          <div className="p-4 space-y-2">
            {season.episodes.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No episodes available</p>
            ) : (
              season.episodes
                .sort((a, b) => a.episodeNumber - b.episodeNumber)
                .map((episode) => <EpisodeCard key={episode.id} episode={episode} onPlay={onPlayEpisode} />)
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
