/**
 * Movie Details Component
 * Displays detailed information about a movie
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Play,
  ExternalLink,
  Clock,
  Calendar,
  Star,
  FolderOpen,
  Check,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import { Movie } from "@/types";
import { useState, useEffect } from "react";
import { tauriService } from "@/services/tauri";
import { watchHistoryService } from "@/services/watchHistoryService";
import { DeleteMediaDialog } from "@/components/features/library/_components/delete-media-dialog";
import { removeMovie, saveMovies } from "@/services/databaseService";
import { MovieEditDialog } from "./_components/movie-edit-dialog";
import { CastSection } from "./_components/cast-section";
import { TrailerModal } from "./_components/trailer-modal";
import { ImageGallery } from "./_components/image-gallery";
import { useMediaContext } from "@/context/mediaContext";
import { useActions } from "@/hooks/useActions";
import { useRouter } from "next/navigation";

interface MovieDetailsProps {
  demoMode?: boolean;
}

export function MovieDetails({ demoMode }: MovieDetailsProps) {
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { movie: currentMovie, setCurrentMovie, refreshMedia } = useMediaContext();
  const { handlePlayMovie: onPlay } = useActions();

  const router = useRouter();
  function onDelete() {
    router.push("/library");
  }

  function onBack() {
    router.back();
  }

  if (!currentMovie) return null;

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleOpenFolder = async () => {
    if (!currentMovie.filePath || currentMovie.filePath.includes("/demo/")) {
      alert("Arquivo não encontrado localmente");
      return;
    }

    try {
      await tauriService.openFileLocation(currentMovie.filePath);
    } catch (error) {
      console.error("Error opening folder:", error);
      alert(`Erro ao abrir pasta: ${error}`);
    }
  };

  const handleMarkAsWatched = async () => {
    if (currentMovie.isWatched) {
      await watchHistoryService.unmarkMovieWatched(currentMovie.id);
      await refreshMedia(currentMovie.id);
    } else {
      await watchHistoryService.markMovieWatched(
        currentMovie.id,
        currentMovie.title,
        currentMovie.poster || "",
        currentMovie.duration,
      );
    }
  };

  const handlePlay = () => {
    if (currentMovie.isWatched) {
      alert("Você já assistiu este filme. Desmarque como assistido para reproduzir novamente.");
      return;
    }
    onPlay(currentMovie);
  };
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeMovie(currentMovie.id);
      console.log(`✅ Movie deleted: ${currentMovie.title}`);
      setShowDeleteDialog(false);

      // Call parent callback if provided
      if (onDelete) {
        onDelete();
      } else {
        // Fallback to going back
        onBack();
      }
    } catch (error) {
      console.error("Error deleting movie:", error);
      alert(`Erro ao excluir filme: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSave = async (updatedMovie: Movie) => {
    try {
      await saveMovies([updatedMovie]);
      setCurrentMovie(updatedMovie);
      console.log(`✅ Movie updated: ${updatedMovie.title}`);
    } catch (error) {
      console.error("Error updating movie:", error);
      throw error;
    }
  };
  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-auto">
      {/* Backdrop Section */}
      <div className="relative h-[60vh] overflow-hidden">
        {/* Backdrop Image */}
        {currentMovie.backdrop && !backdropError ? (
          <img
            src={currentMovie.backdrop}
            alt={currentMovie.title}
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

        {/* Watched Badge */}
        {currentMovie.isWatched && (
          <Badge className="absolute top-6 right-6 bg-green-600 text-white border-green-500">
            <Check className="w-4 h-4 mr-1" />
            Assistido
          </Badge>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto flex gap-8">
            {/* Poster */}
            <div className="hidden md:block flex-shrink-0">
              <div className="w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-slate-800">
                {currentMovie.poster && !posterError ? (
                  <img
                    src={currentMovie.poster}
                    alt={currentMovie.title}
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
                <Badge className="bg-blue-600 text-white border-blue-500 mb-3">Movie</Badge>
                <h1 className="text-5xl font-bold text-white mb-2">{currentMovie.title}</h1>
                {currentMovie.originalTitle && currentMovie.originalTitle !== currentMovie.title && (
                  <p className="text-lg text-slate-400 mb-3">{currentMovie.originalTitle}</p>
                )}
                {currentMovie.tagline && <p className="text-md text-slate-300 italic mb-3">{currentMovie.tagline}</p>}

                {/* Genres */}
                {currentMovie.genres && currentMovie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentMovie.genres.map((genre, index) => (
                      <Badge key={index} variant="outline" className="bg-slate-800/50 border-slate-600 text-slate-300">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-300">
                {currentMovie.year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{currentMovie.year}</span>
                  </div>
                )}
                {currentMovie.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(currentMovie.duration)}</span>
                  </div>
                )}
                {currentMovie.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span>{currentMovie.rating.toFixed(1)}/10</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {!demoMode && (
                <div className="flex gap-3 flex-wrap">
                  <Button
                    size="lg"
                    onClick={handlePlay}
                    disabled={currentMovie.isWatched}
                    className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    {currentMovie.isWatched ? "Já Assistido" : "Assistir Agora"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleMarkAsWatched}
                    className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
                  >
                    {currentMovie.isWatched ? (
                      <>
                        <X className="w-5 h-5 mr-2" />
                        Desmarcar
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Marcar como Assistido
                      </>
                    )}
                  </Button>
                  {currentMovie.videos && currentMovie.videos.length > 0 && (
                    <TrailerModal videos={currentMovie.videos} title={currentMovie.title} />
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleOpenFolder}
                    className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm"
                  >
                    <FolderOpen className="w-5 h-5 mr-2" />
                    Abrir Pasta
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setShowEditDialog(true)}
                    className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 backdrop-blur-sm text-blue-400 hover:text-blue-300"
                  >
                    <Pencil className="w-5 h-5 mr-2" />
                    Editar
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-red-900/20 border-red-700 hover:bg-red-900/40 backdrop-blur-sm text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <MovieEditDialog
        movie={currentMovie}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleEditSave}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteMediaDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        media={currentMovie}
        isDeleting={isDeleting}
      />

      {/* Details Section */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Overview */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
            {currentMovie.overview ? (
              <p className="text-slate-300 leading-relaxed text-lg">{currentMovie.overview}</p>
            ) : (
              <p className="text-slate-500 italic">No overview available</p>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Release Date</h3>
              <p className="text-white">
                {currentMovie.releaseDate
                  ? new Date(currentMovie.releaseDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Status</h3>
              <Badge
                variant={currentMovie.status === "MATCHED" ? "default" : "destructive"}
                className={currentMovie.status === "MATCHED" ? "bg-green-600 text-white" : ""}
              >
                {currentMovie.status}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">File Location</h3>
              <p className="text-sm text-slate-500 break-all">{currentMovie.filePath}</p>
            </div>
          </div>
        </div>

        {/* Cast Section */}
        {currentMovie.cast && currentMovie.cast.length > 0 && <CastSection cast={currentMovie.cast} maxDisplay={12} />}

        {/* Image Gallery */}
        {currentMovie.images && currentMovie.images.length > 1 && (
          <ImageGallery images={currentMovie.images} title={currentMovie.title} />
        )}
      </div>
    </div>
  );
}
