"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Episode, Season } from "@/types/serie";
import { Check, CheckCircle2, ChevronDown, ChevronUp, Loader2, Play, RotateCw, X, XCircle } from "lucide-react";
import { useState } from "react";
import { EpisodeCard } from "./episode-card";
import { getImageUrl } from "@/utils/mediaUtils";

interface SeasonCardProps {
  season: Season;
  seriesId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onPlayEpisode: (episode: Episode) => void;
  onEditEpisode?: (episode: Episode) => void;
  onEpisodeWatchToggle?: (episode: Episode, isWatched: boolean) => void;
  onSeasonWatchToggle?: (season: Season, isWatched: boolean) => void;
  onSeasonRefresh?: (season: Season) => Promise<void> | void;
}

export function SeasonCard({
  season,
  seriesId,
  isExpanded,
  onToggle,
  onPlayEpisode,
  onEditEpisode,
  onEpisodeWatchToggle,
  onSeasonWatchToggle,
  onSeasonRefresh,
}: SeasonCardProps) {
  const [posterError, setPosterError] = useState(false);
  const [isTogglingWatched, setIsTogglingWatched] = useState(false);
  const [isRefreshingSeason, setIsRefreshingSeason] = useState(false);

  // Season is watched if it has episodes and all are watched
  const hasEpisodes = season.episodes && season.episodes.length > 0;
  const isSeasonWatched = hasEpisodes && season.episodes.every((ep) => ep.isWatched);

  const handleSeasonWatchToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSeasonWatchToggle || !hasEpisodes) return;
    setIsTogglingWatched(true);
    try {
      await onSeasonWatchToggle(season, !isSeasonWatched);
    } finally {
      setIsTogglingWatched(false);
    }
  };

  const handleSeasonRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSeasonRefresh) return;
    setIsRefreshingSeason(true);
    try {
      await onSeasonRefresh(season);
    } finally {
      setIsRefreshingSeason(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
      {/* Season Header */}
      <div className="w-full flex items-center hover:bg-slate-800/50 transition-colors">
        {/* Clickable area for expand/collapse */}
        <button onClick={onToggle} className="flex-1 flex items-center gap-6 p-6 text-left">
          {/* Season Poster */}
          <div className="w-24 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-slate-800">
            {season.poster && !posterError ? (
              <img
                src={getImageUrl(season.poster)}
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
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-white">{season.name}</h3>
              {isSeasonWatched && (
                <Badge className="bg-green-600/20 text-green-400 border-green-600 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Assistida
                </Badge>
              )}
            </div>
            {season.overview && <p className="text-sm text-slate-400 line-clamp-2 mb-2">{season.overview}</p>}
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{season.episodeCount} episódios</span>
              {season.available ? (
                <Badge variant="outline" className="bg-green-600/10 text-green-400 border-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {season.downloadedEpisodes} Baixados
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-700/30 text-slate-400 border-slate-600">
                  <XCircle className="w-3 h-3 mr-1" />
                  Não baixada
                </Badge>
              )}
            </div>
          </div>

          {/* Expand Icon */}
          {isExpanded ? (
            <ChevronUp className="w-6 h-6 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-6 h-6 text-slate-400 flex-shrink-0" />
          )}
        </button>

        {/* Season watch toggle button (outside expand button) */}
        {(hasEpisodes || onSeasonRefresh) && (
          <div className="pr-6 flex items-center gap-2">
            {onSeasonRefresh && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeasonRefresh}
                disabled={isRefreshingSeason}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-blue-600/20 hover:border-blue-500 hover:text-blue-300"
                title="Atualizar episódios desta temporada"
              >
                {isRefreshingSeason ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCw className="w-4 h-4 mr-1" />
                    Atualizar Temporada
                  </>
                )}
              </Button>
            )}
            {hasEpisodes && onSeasonWatchToggle && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeasonWatchToggle}
                disabled={isTogglingWatched}
                className={
                  isSeasonWatched
                    ? "bg-green-600/20 border-green-600 text-green-400 hover:bg-red-600/20 hover:border-red-600 hover:text-red-400"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-green-600/20 hover:border-green-600 hover:text-green-400"
                }
                title={isSeasonWatched ? "Desmarcar temporada como assistida" : "Marcar temporada como assistida"}
              >
                {isTogglingWatched ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSeasonWatched ? (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Desmarcar
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Marcar Assistida
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Episodes List */}
      {isExpanded && (
        <div className="border-t border-slate-800">
          <div className="p-4 space-y-2">
            {season.episodes.length === 0 ? (
              <p className="text-center text-slate-500 py-8 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando episódios...
              </p>
            ) : (
              season.episodes
                .sort((a, b) => a.episode_number - b.episode_number)
                .map((episode) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    seriesId={seriesId}
                    onPlay={onPlayEpisode}
                    onEdit={onEditEpisode}
                    onWatchToggle={onEpisodeWatchToggle}
                  />
                ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
