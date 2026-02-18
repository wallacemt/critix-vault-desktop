/**
 * Trailer Modal Component
 * YouTube player modal for trailers and videos
 */

"use client";

import { TMDBVideo } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TrailerModalProps {
  videos: TMDBVideo[];
  title: string;
}

export function TrailerModal({ videos, title }: TrailerModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TMDBVideo | null>(null);

  if (!videos || videos.length === 0) return null;

  // Filter for YouTube videos and prioritize official trailers
  const youtubeVideos = videos.filter((v) => v.site === "YouTube");
  const officialTrailers = youtubeVideos.filter((v) => v.official && v.type === "Trailer");
  const trailers = youtubeVideos.filter((v) => v.type === "Trailer");

  // Prefer official trailer, fallback to any trailer, fallback to first video
  const primaryVideo = officialTrailers[0] || trailers[0] || youtubeVideos[0];

  if (!primaryVideo) return null;

  const handleOpenVideo = (video: TMDBVideo) => {
    setSelectedVideo(video);
    setOpen(true);
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        size="lg"
        variant="outline"
        onClick={() => handleOpenVideo(primaryVideo)}
        className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
      >
        <Play className="w-5 h-5 mr-2" />
        Assistir Trailer
      </Button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl bg-[var(--bg-surface)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              {selectedVideo?.name || "Trailer"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {title}
              {selectedVideo?.official && <Badge className="ml-2 bg-blue-600 text-white">Oficial</Badge>}
            </DialogDescription>
          </DialogHeader>

          {/* YouTube Player */}
          {selectedVideo && (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1`}
                title={selectedVideo.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

          {/* Multiple Videos */}
          {youtubeVideos.length > 1 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-white mb-3">Mais Vídeos</h4>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                {youtubeVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleOpenVideo(video)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedVideo?.id === video.id
                        ? "bg-slate-700 border-[var(--color-primary)]"
                        : "bg-slate-800/50 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Play className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{video.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {video.type}
                          </Badge>
                          {video.official && <Badge className="text-xs bg-blue-600 text-white">Oficial</Badge>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
