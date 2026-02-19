/**
 * Movie Edit Dialog
 * Allows manual editing of movie metadata
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Save, Info } from "lucide-react";
import { Movie } from "@/types/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MovieEditDialogProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMovie: Movie) => Promise<void>;
}

export function MovieEditDialog({ movie, isOpen, onClose, onSave }: MovieEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [editedMovie, setEditedMovie] = useState<Movie>(movie);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedMovie);
      onClose();
    } catch (error) {
      console.error("Error saving movie edits:", error);
      alert("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

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
          className="bg-slate-900 rounded-2xl border border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Info className="w-6 h-6" />
                  Editar Filme
                </h2>
                <p className="text-sm text-slate-400 mt-1">{movie.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Título</label>
                <Input
                  value={editedMovie.title}
                  onChange={(e) => setEditedMovie({ ...editedMovie, title: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Digite o título do filme"
                />
              </div>

              {/* Original Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Título Original</label>
                <Input
                  value={editedMovie.originalTitle || ""}
                  onChange={(e) => setEditedMovie({ ...editedMovie, originalTitle: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Título original (opcional)"
                />
              </div>

              {/* Overview */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sinopse</label>
                <textarea
                  value={editedMovie.overview || ""}
                  onChange={(e) => setEditedMovie({ ...editedMovie, overview: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite a sinopse do filme"
                />
              </div>

              {/* Grid for numeric fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ano</label>
                  <Input
                    type="number"
                    value={editedMovie.year || ""}
                    onChange={(e) => setEditedMovie({ ...editedMovie, year: parseInt(e.target.value) || undefined })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="YYYY"
                    min="1800"
                    max="2100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Avaliação (0-10)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editedMovie.rating || ""}
                    onChange={(e) =>
                      setEditedMovie({ ...editedMovie, rating: parseFloat(e.target.value) || undefined })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="0.0"
                    min="0"
                    max="10"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Duração (minutos)</label>
                <Input
                  type="number"
                  value={editedMovie.duration || ""}
                  onChange={(e) => setEditedMovie({ ...editedMovie, duration: parseInt(e.target.value) || undefined })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="120"
                  min="1"
                />
              </div>

              {/* Image URLs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">URL do Poster</label>
                  <Input
                    value={editedMovie.poster || ""}
                    onChange={(e) => setEditedMovie({ ...editedMovie, poster: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="https://image.tmdb.org/t/p/w500/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">URL do Backdrop</label>
                  <Input
                    value={editedMovie.backdrop || ""}
                    onChange={(e) => setEditedMovie({ ...editedMovie, backdrop: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="https://image.tmdb.org/t/p/original/..."
                  />
                </div>
              </div>

              {/* Trailer URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">URL do Trailer</label>
                <Input
                  value={editedMovie.trailer || ""}
                  onChange={(e) => setEditedMovie({ ...editedMovie, trailer: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              {/* Release Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data de Lançamento</label>
                <Input
                  type="date"
                  value={editedMovie.releaseDate || ""}
                  onChange={(e) => setEditedMovie({ ...editedMovie, releaseDate: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <Badge variant={editedMovie.status === "MATCHED" ? "default" : "destructive"} className="text-sm">
                  {editedMovie.status}
                </Badge>
              </div>

              {/* File Path (readonly) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Caminho do Arquivo</label>
                <Input
                  value={editedMovie.filePath}
                  readOnly
                  className="bg-slate-800 border-slate-700 text-slate-400"
                  title={editedMovie.filePath}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSaving ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
