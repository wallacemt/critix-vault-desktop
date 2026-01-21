"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Info, Film, Tv } from "lucide-react";
import { Media, MediaType } from "@/types";
import { cn } from "@/lib/utils";

interface StreamingCardProps {
  media: Media;
  onClick?: (media: Media) => void;
  onPlay?: (media: Media) => void;
}

export function StreamingCard({ media, onClick, onPlay }: StreamingCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  return (
    <Card
      className="group relative bg-slate-900 border-slate-800 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 hover:border-blue-500/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(media)}
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-800">
        {media.poster && !imageError ? (
          <img
            src={media.poster}
            alt={media.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <MediaIcon className="w-16 h-16 text-slate-600" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-60" />

        {/* Status Badge */}
        {media.status === "UNMATCHED" && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="text-xs">
              Unmatched
            </Badge>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs backdrop-blur-sm",
              media.type === "MOVIE" && "bg-blue-500/80 text-white border-blue-400",
              media.type === "SERIES" && "bg-purple-500/80 text-white border-purple-400",
              media.type === "ANIME" && "bg-pink-500/80 text-white border-pink-400",
            )}
          >
            {media.type === "ANIME" ? "Anime" : media.type === "SERIES" ? "Series" : "Movie"}
          </Badge>
        </div>

        {/* Hover Actions */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        >
          {onPlay && (
            <Button
              size="icon"
              className="w-12 h-12 rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(media);
              }}
            >
              <Play className="w-6 h-6 fill-current" />
            </Button>
          )}
          <Button
            size="icon"
            variant="secondary"
            className="w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-800 border-slate-700 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(media);
            }}
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm line-clamp-1 mb-1">{media.title}</h3>
        {media.year && <p className="text-xs text-slate-400">{media.year}</p>}
        {media.rating && (
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="text-xs text-slate-400">{media.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
