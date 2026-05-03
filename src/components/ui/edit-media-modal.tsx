/**
 * Edit Media Modal
 * Allows correcting incorrect media matches
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Card } from "./card";
import { X, Search, Loader2, Film, Tv, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiService } from "@/services/api";
import { MediaSearchResult } from "@/types/api";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

interface EditMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMedia: {
    title: string;
    type: "MOVIE" | "SERIES";
  };
  onSelectMedia: (mediaId: string, mediaType: "movie" | "tv") => Promise<void>;
}

export function EditMediaModal({ isOpen, onClose, currentMedia, onSelectMedia }: EditMediaModalProps) {
  const { isOnline } = useApiConnectivity();
  const [searchQuery, setSearchQuery] = useState(currentMedia.title);
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-search with current title on open
      handleSearch(currentMedia.title);
    }
  }, [isOpen, currentMedia.title]);

  const handleSearch = async (query: string) => {
    if (!isOnline) {
      setResults([]);
      return;
    }

    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = (await apiService.searchMediaByTitle(query, true, false)) as { details?: MediaSearchResult[] };

      if (response && response.details) {
        setResults(response.details);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (result: MediaSearchResult) => {
    if (!isOnline) {
      return;
    }

    setSelecting(true);
    try {
      await onSelectMedia(result.id, result.media_type);
      onClose();
    } catch (error) {
      console.error("Failed to update media:", error);
    } finally {
      setSelecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] font-display">Editar Mídia</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4 font-sans">
              Mídia atual: <span className="font-semibold text-[var(--text-primary)]">{currentMedia.title}</span>
            </p>

            {!isOnline && (
              <p className="text-sm text-amber-400 mb-4">
                Modo offline ativo. A busca de correspondencias fica disponivel quando a conexao voltar.
              </p>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <Input
                type="text"
                placeholder="Buscar mídia correta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                disabled={!isOnline}
                className="pl-10 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]"
              />
              <Button
                size="sm"
                onClick={() => handleSearch(searchQuery)}
                disabled={loading || !isOnline}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[var(--text-muted)] font-sans">
                  Nenhum resultado encontrado. Tente outro termo de busca.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {results.map((result) => (
                  <motion.div key={result.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-4 hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                      <div className="flex gap-4">
                        {/* Poster */}
                        <div className="w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--bg-surface-light)]">
                          {result.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w200${result.poster_path}`}
                              alt={result.title || result.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {result.media_type === "movie" ? (
                                <Film className="w-8 h-8 text-[var(--text-muted)]" />
                              ) : (
                                <Tv className="w-8 h-8 text-[var(--text-muted)]" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-[var(--text-primary)] font-display">
                                {result.title || result.name}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    result.media_type === "movie"
                                      ? "bg-blue-600/20 text-blue-400"
                                      : "bg-purple-600/20 text-purple-400"
                                  }`}
                                >
                                  {result.media_type === "movie" ? "Filme" : "Série"}
                                </span>
                                {result.vote_average && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                    <span className="text-sm text-[var(--text-secondary)]">
                                      {result.vote_average.toFixed(1)}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm text-[var(--text-muted)]">
                                  {result.release_date?.split("-")[0] || result.first_air_date?.split("-")[0]}
                                </span>
                              </div>
                            </div>
                          </div>

                          {result.overview && (
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3 font-sans">
                              {result.overview}
                            </p>
                          )}

                          <Button
                            size="sm"
                            onClick={() => handleSelect(result)}
                            disabled={selecting || !isOnline}
                            className="bg-gradient-to-r from-[var(--color-primary)] to-amber-500"
                          >
                            {selecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Selecionar esta mídia
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: var(--bg-body);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: var(--bg-surface-light);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: var(--color-primary);
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
