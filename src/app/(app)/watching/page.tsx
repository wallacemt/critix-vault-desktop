"use client";

import { Button } from "@/components/ui/button";
import { useMediaContext } from "@/context/mediaContext";
import { apiService } from "@/services/api";
import { markAsWatched, markEpisodeAsWatched } from "@/services/databaseService";
import { fetchMediaImages, fetchSeasonDetails } from "@/services/mediaService";
import { CheckCircle2, Loader2, MonitorPlay, Tv2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export default function WatchingPage() {
  const router = useRouter();
  const { movie, serie, watchSession, setCurrentMovie, setCurrentSerie, clearWatchSession } = useMediaContext();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(watchSession?.backdrop || null);
  const [isResolvingImage, setIsResolvingImage] = useState(false);
  const [isMarkingWatched, setIsMarkingWatched] = useState(false);

  const destinationPath = useMemo(() => {
    if (!watchSession) return "/library";
    return watchSession.type === "movie" ? "/movie-details" : "/series-details";
  }, [watchSession]);

  useEffect(() => {
    if (!watchSession) {
      router.replace("/library");
    }
  }, [watchSession, router]);

  useEffect(() => {
    if (!watchSession) return;

    const resolveImage = async () => {
      if (watchSession.backdrop) {
        setBackgroundImage(watchSession.backdrop);
        return;
      }

      setIsResolvingImage(true);
      try {
        if (watchSession.type === "movie") {
          const details = (await apiService.getMediaDetailsById(watchSession.mediaId, "movie")) as any;
          if (details?.backdrop_path) {
            setBackgroundImage(`https://image.tmdb.org/t/p/original${details.backdrop_path}`);
            return;
          }

          const images = await fetchMediaImages(watchSession.mediaId, "movie");
          const firstBackdrop = images.backdrop?.[0]?.file_path;
          if (firstBackdrop) {
            setBackgroundImage(`https://image.tmdb.org/t/p/original${firstBackdrop}`);
          }
          return;
        }

        const seriesId = watchSession.mediaId || serie?.id;
        if (!seriesId) return;

        if (watchSession.seasonNumber != null && watchSession.episodeNumber != null) {
          const seasonDetails = await fetchSeasonDetails(seriesId, watchSession.seasonNumber);
          const episode = seasonDetails?.episodes?.find((ep) => ep.episode_number === watchSession.episodeNumber);
          if (episode?.still_path) {
            setBackgroundImage(`https://image.tmdb.org/t/p/original${episode.still_path}`);
            return;
          }
        }

        const images = await fetchMediaImages(seriesId, "tv");
        const firstBackdrop = images.backdrop?.[0]?.file_path;
        if (firstBackdrop) {
          setBackgroundImage(`https://image.tmdb.org/t/p/original${firstBackdrop}`);
        } else if (serie?.backdrop) {
          setBackgroundImage(serie.backdrop);
        }
      } catch (error) {
        console.error("Failed to resolve watching lock-screen image:", error);
        if (watchSession.type === "movie" && movie?.backdrop) {
          setBackgroundImage(movie.backdrop);
        } else if (serie?.backdrop) {
          setBackgroundImage(serie.backdrop);
        }
      } finally {
        setIsResolvingImage(false);
      }
    };

    resolveImage();
  }, [watchSession, movie?.backdrop, serie?.id, serie?.backdrop]);

  if (!watchSession) return null;

  const handleBackToMedia = () => {
    clearWatchSession();
    router.replace(destinationPath);
  };

  const handleMarkWatched = async () => {
    setIsMarkingWatched(true);
    try {
      if (watchSession.type === "movie") {
        const movieId = watchSession.mediaId || movie?.id;
        if (!movieId) throw new Error("Filme não encontrado para marcar como assistido.");

        await markAsWatched(movieId, "MOVIE");

        if (movie && movie.id === movieId) {
          setCurrentMovie({
            ...movie,
            isWatched: true,
          });
        }
      } else {
        const seriesId = watchSession.mediaId || serie?.id;
        if (
          !seriesId ||
          !watchSession.episodeId ||
          watchSession.seasonNumber == null ||
          watchSession.episodeNumber == null
        ) {
          throw new Error("Episódio não encontrado para marcar como assistido.");
        }

        await markEpisodeAsWatched(
          seriesId,
          watchSession.episodeId,
          watchSession.seasonNumber,
          watchSession.episodeNumber,
        );

        if (serie && serie.id === seriesId) {
          const updatedSeasons = serie.seasons.map((season) => ({
            ...season,
            episodes: season.episodes.map((episode) => {
              if (episode.id !== watchSession.episodeId) return episode;
              return {
                ...episode,
                isWatched: true,
              };
            }),
          }));

          const isSeriesWatched =
            updatedSeasons.flatMap((season) => season.episodes).length > 0 &&
            updatedSeasons.flatMap((season) => season.episodes).every((episode) => episode.isWatched === true);

          setCurrentSerie({
            ...serie,
            seasons: updatedSeasons,
            isWatched: isSeriesWatched,
          });
        }
      }

      clearWatchSession();
      router.replace(destinationPath);
    } catch (error) {
      console.error("Failed to mark media as watched:", error);
      alert("Não foi possível marcar como assistido.");
    } finally {
      setIsMarkingWatched(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {backgroundImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/90" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
      )}

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/45 backdrop-blur-lg p-8 text-center"
        >
          <motion.div
            className="mx-auto mb-6 w-18 h-18 rounded-full bg-[var(--color-primary)]/25 border border-[var(--color-primary)]/35 flex items-center justify-center"
            animate={{
              scale: [1, 1.08, 1],
              boxShadow: [
                "0 0 0 rgba(245, 158, 11, 0.25)",
                "0 0 42px rgba(245, 158, 11, 0.45)",
                "0 0 0 rgba(245, 158, 11, 0.25)",
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            {watchSession.type === "movie" ? (
              <MonitorPlay className="w-8 h-8 text-amber-200" />
            ) : (
              <Tv2 className="w-8 h-8 text-amber-200" />
            )}
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-[moonjelly-bold] text-white mb-3">Assistindo...</h1>
          <p className="text-slate-200 text-lg mb-1">{watchSession.title}</p>
          {watchSession.type === "episode" && (
            <p className="text-slate-300 text-sm mb-4">
              S{String(watchSession.seasonNumber).padStart(2, "0")}E
              {String(watchSession.episodeNumber).padStart(2, "0")}
              {watchSession.episodeTitle ? ` - ${watchSession.episodeTitle}` : ""}
            </p>
          )}

          <p className="text-slate-300/90 mb-7">
            A mídia foi aberta em outro aplicativo. Quando terminar, confirme aqui para marcar como assistido.
          </p>

          {isResolvingImage && (
            <p className="text-xs text-slate-300 mb-4 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando melhor imagem para esta mídia...
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleBackToMedia}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Voltar para a mídia
            </Button>
            <Button
              onClick={handleMarkWatched}
              disabled={isMarkingWatched}
              className="bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)]"
            >
              {isMarkingWatched ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Já assisti
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
