/**
 * Premium Series Details Component with Animations
 * Enhanced experience for viewing series details with seasons/episodes
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, ExternalLink, Clock, Calendar, Star, Tv, ChevronDown } from "lucide-react";
import { Series } from "@/types";
import { useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import gsap from "gsap";

interface SeriesDetailsProps {
  series: Series;
  onBack: () => void;
  onPlay: (series: Series) => void;
}

export function SeriesDetails({ series, onBack, onPlay }: SeriesDetailsProps) {
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(1);
  const { scrollY } = useScroll();
  const backdropY = useTransform(scrollY, [0, 300], [0, 150]);
  const backdropOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  useEffect(() => {
    gsap.from(".detail-section", {
      opacity: 0,
      y: 40,
      stagger: 0.2,
      duration: 0.8,
      ease: "power3.out",
      delay: 0.3,
    });
  }, []);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "N/A";
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-body)] z-50 overflow-auto custom-scrollbar">
      {/* Backdrop with Parallax */}
      <div className="relative h-[70vh] overflow-hidden">
        {series.backdrop && !backdropError ? (
          <motion.img
            src={series.backdrop}
            alt={series.title}
            className="w-full h-full object-cover"
            style={{ y: backdropY, opacity: backdropOpacity }}
            onError={() => setBackdropError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-body)] via-[var(--bg-body)]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-body)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-body)]" />

        {/* Back Button */}
        <motion.div
          className="absolute top-8 left-8 z-10"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-md hover:bg-[var(--bg-surface)] border border-[var(--border-color)]"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </motion.div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-7xl mx-auto flex gap-8">
            {/* Poster */}
            <motion.div
              className="hidden md:block flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-[var(--border-color)] relative group">
                {series.poster && !posterError ? (
                  <img
                    src={series.poster}
                    alt={series.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={() => setPosterError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-800 to-slate-900 flex items-center justify-center">
                    <Tv className="w-24 h-24 text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-purple-600/20 to-transparent" />
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-end">
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Badge className="bg-purple-600/80 text-white border-purple-500 backdrop-blur-sm mb-4 px-4 py-1.5 text-sm">
                  <Tv className="w-4 h-4 mr-1" />
                  Série
                </Badge>
                <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-3 font-display leading-tight">
                  {series.title}
                </h1>
                {series.originalTitle && series.originalTitle !== series.title && (
                  <p className="text-xl text-[var(--text-secondary)] mb-4 font-sans italic">{series.originalTitle}</p>
                )}
              </motion.div>

              {/* Meta */}
              <motion.div
                className="flex flex-wrap items-center gap-6 mb-8 text-[var(--text-secondary)] font-sans"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {series.year && (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)]/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">{series.year}</span>
                  </div>
                )}
                {series.duration && (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)]/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">{formatDuration(series.duration)}</span>
                  </div>
                )}
                {series.rating && (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)]/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold">{series.rating.toFixed(1)}</span>
                    <span className="text-[var(--text-muted)]">/10</span>
                  </div>
                )}
                {series.seasons && (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)]/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Tv className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">
                      {series.seasons.length} Temporada{series.seasons.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Actions */}
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    onClick={() => onPlay(series)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-[var(--glow-primary)] text-lg px-8 py-6"
                  >
                    <Play className="w-6 h-6 mr-2 fill-current" />
                    Assistir Agora
                  </Button>
                </motion.div>
                {series.trailer && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="bg-[var(--bg-surface)]/80 border-[var(--border-color)] hover:bg-[var(--bg-surface)] hover:border-purple-500 backdrop-blur-sm text-lg px-8 py-6"
                    >
                      <a href={series.trailer} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-5 h-5 mr-2" />
                        Trailer
                      </a>
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="max-w-7xl mx-auto px-8 md:px-12 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Overview + Seasons */}
          <div className="md:col-span-2 space-y-12">
            {/* Overview */}
            <div className="detail-section">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6 font-display">Sinopse</h2>
              {series.overview ? (
                <p className="text-[var(--text-secondary)] leading-relaxed text-lg font-sans">{series.overview}</p>
              ) : (
                <p className="text-[var(--text-muted)] italic font-sans">Sinopse não disponível</p>
              )}
            </div>

            {/* Seasons */}
            {series.seasons && series.seasons.length > 0 && (
              <div className="detail-section">
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6 font-display">Temporadas</h2>
                <div className="space-y-4">
                  {series.seasons.map((season) => (
                    <motion.div
                      key={season.seasonNumber}
                      className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: season.seasonNumber * 0.1 }}
                    >
                      <button
                        onClick={() =>
                          setExpandedSeason(expandedSeason === season.seasonNumber ? null : season.seasonNumber)
                        }
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-surface-light)] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                            {season.seasonNumber}
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-[var(--text-primary)] font-display">
                              Temporada {season.seasonNumber}
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] font-sans">
                              {season.episodes?.length || 0} episódio
                              {season.episodes && season.episodes.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedSeason === season.seasonNumber ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {expandedSeason === season.seasonNumber && season.episodes && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-[var(--border-color)]"
                          >
                            <div className="p-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                              {season.episodes.map((episode) => (
                                <motion.div
                                  key={episode.episodeNumber}
                                  className="p-4 bg-[var(--bg-body)] rounded-lg border border-[var(--border-color)] hover:border-purple-500 transition-colors cursor-pointer"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: episode.episodeNumber * 0.05 }}
                                  whileHover={{ scale: 1.02 }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium text-[var(--text-primary)] font-display">
                                        {episode.episodeNumber}. {episode.title || `Episódio ${episode.episodeNumber}`}
                                      </h4>
                                      {episode.duration && (
                                        <p className="text-sm text-[var(--text-muted)] mt-1 font-sans">
                                          {formatDuration(episode.duration)}
                                        </p>
                                      )}
                                    </div>
                                    <Play className="w-5 h-5 text-purple-500 opacity-0 hover:opacity-100 transition-opacity" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-8 detail-section">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider font-sans">
                Data de Lançamento
              </h3>
              <p className="text-[var(--text-primary)] font-semibold font-display text-lg">
                {series.releaseDate
                  ? new Date(series.releaseDate).toLocaleDateString("pt-BR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Desconhecida"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider font-sans">
                Status
              </h3>
              <Badge
                variant={series.status === "MATCHED" ? "default" : "destructive"}
                className={cn(
                  "px-4 py-2 text-sm",
                  series.status === "MATCHED" ? "bg-green-600/20 text-green-400 border-green-500/30" : "",
                )}
              >
                {series.status === "MATCHED" ? "Identificada" : series.status}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider font-sans">
                Localização da Pasta
              </h3>
              <p className="text-sm text-[var(--text-secondary)] break-all font-mono bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]">
                {series.folderPath}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--bg-body);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--bg-surface-light);
          border-radius: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-primary);
        }
      `}</style>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
