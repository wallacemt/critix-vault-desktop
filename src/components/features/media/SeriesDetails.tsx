/**
 * Series Details Component
 * Displays detailed information about a series with seasons and episodes
 */

"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Series, Season, Episode } from "@/types";
import { cn } from "@/lib/utils";

interface SeriesDetailsProps {
  series: Series;
  onBack: () => void;
  onPlayEpisode: (episode: Episode) => void;
}

export function SeriesDetails({ series, onBack, onPlayEpisode }: SeriesDetailsProps) {
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

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
              <div className="flex gap-3">
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
    </div>
  );
}

interface SeasonCardProps {
  season: Season;
  isExpanded: boolean;
  onToggle: () => void;
  onPlayEpisode: (episode: Episode) => void;
}

function SeasonCard({ season, isExpanded, onToggle, onPlayEpisode }: SeasonCardProps) {
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

interface EpisodeCardProps {
  episode: Episode;
  onPlay: (episode: Episode) => void;
}

function EpisodeCard({ episode, onPlay }: EpisodeCardProps) {
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
