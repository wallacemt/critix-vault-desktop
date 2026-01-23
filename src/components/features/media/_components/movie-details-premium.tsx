/**
 * Premium Movie Details Component with Animations
 * Cinematic experience for viewing movie details
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, ExternalLink, Clock, Calendar, Star, Film } from "lucide-react";
import { Movie } from "@/types";
import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";

interface MovieDetailsProps {
  movie: Movie;
  onBack: () => void;
  onPlay: (movie: Movie) => void;
}

export function MovieDetails({ movie, onBack, onPlay }: MovieDetailsProps) {
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);
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
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-body)] z-50 overflow-auto custom-scrollbar">
      {/* Backdrop Section with Parallax */}
      <div className="relative h-[70vh] overflow-hidden">
        {movie.backdrop && !backdropError ? (
          <motion.img
            src={movie.backdrop}
            alt={movie.title}
            className="w-full h-full object-cover"
            style={{ y: backdropY, opacity: backdropOpacity }}
            onError={() => setBackdropError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}

        {/* Multiple Gradient Overlays for Depth */}
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
            {/* Poster with Animation */}
            <motion.div
              className="hidden md:block flex-shrink-0"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-[var(--border-color)] relative group">
                {movie.poster && !posterError ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={() => setPosterError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <Film className="w-24 h-24 text-slate-600" />
                  </div>
                )}
                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-[var(--color-primary)]/20 to-transparent" />
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
                <Badge className="bg-blue-600/80 text-white border-blue-500 backdrop-blur-sm mb-4 px-4 py-1.5 text-sm">
                  <Film className="w-4 h-4 mr-1" />
                  Filme
                </Badge>
                <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-3 font-display leading-tight">
                  {movie.title}
                </h1>
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <p className="text-xl text-[var(--text-secondary)] mb-4 font-sans italic">{movie.originalTitle}</p>
                )}
              </motion.div>

              {/* Meta Info */}
              <motion.div
                className="flex flex-wrap items-center gap-6 mb-8 text-[var(--text-secondary)] font-sans"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {movie.year && (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)]/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                    <span className="font-medium">{movie.year}</span>
                  </div>
                )}
                {movie.duration && (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)]/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                    <span className="font-medium">{formatDuration(movie.duration)}</span>
                  </div>
                )}
                {movie.rating && (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)]/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold">{movie.rating.toFixed(1)}</span>
                    <span className="text-[var(--text-muted)]">/10</span>
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
                    onClick={() => onPlay(movie)}
                    className="bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] font-bold shadow-[var(--glow-primary)] text-lg px-8 py-6"
                  >
                    <Play className="w-6 h-6 mr-2 fill-current" />
                    Assistir Agora
                  </Button>
                </motion.div>
                {movie.trailer && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="bg-[var(--bg-surface)]/80 border-[var(--border-color)] hover:bg-[var(--bg-surface)] hover:border-[var(--color-primary)] backdrop-blur-sm text-lg px-8 py-6"
                    >
                      <a href={movie.trailer} target="_blank" rel="noopener noreferrer">
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
          {/* Overview */}
          <div className="md:col-span-2 detail-section">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6 font-display">Sinopse</h2>
            {movie.overview ? (
              <p className="text-[var(--text-secondary)] leading-relaxed text-lg font-sans">{movie.overview}</p>
            ) : (
              <p className="text-[var(--text-muted)] italic font-sans">Sinopse não disponível</p>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-8 detail-section">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider font-sans">
                Data de Lançamento
              </h3>
              <p className="text-[var(--text-primary)] font-semibold font-display text-lg">
                {movie.releaseDate
                  ? new Date(movie.releaseDate).toLocaleDateString("pt-BR", {
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
                variant={movie.status === "MATCHED" ? "default" : "destructive"}
                className={cn(
                  "px-4 py-2 text-sm",
                  movie.status === "MATCHED" ? "bg-green-600/20 text-green-400 border-green-500/30" : "",
                )}
              >
                {movie.status === "MATCHED" ? "Identificado" : movie.status}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wider font-sans">
                Localização do Arquivo
              </h3>
              <p className="text-sm text-[var(--text-secondary)] break-all font-mono bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)]">
                {movie.filePath}
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
