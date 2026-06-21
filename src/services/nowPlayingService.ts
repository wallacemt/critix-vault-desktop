import { markAsWatched, markEpisodeAsWatched } from "@/services/databaseService";
import { tauriService } from "@/services/tauri";
import { usePlayerStore, type ExternalSession } from "@/stores/playerStore";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/serie";

export interface WatchCollaborators {
  movie?: Movie | null;
  serie?: Series | null;
  setCurrentMovie?: (m: Movie) => void;
  setCurrentSerie?: (s: Series) => void;
}

export async function markWatched(session: ExternalSession, collab: WatchCollaborators): Promise<void> {
  const { item } = session;

  if (item.mediaType === "MOVIE") {
    await markAsWatched(item.mediaId, "MOVIE");
    if (collab.movie && collab.movie.id === item.mediaId && collab.setCurrentMovie) {
      collab.setCurrentMovie({ ...collab.movie, isWatched: true });
    }
  } else {
    if (!item.episodeId || item.seasonNumber == null || item.episodeNumber == null) {
      throw new Error("Episódio não encontrado para marcar como assistido.");
    }
    await markEpisodeAsWatched(item.mediaId, item.episodeId, item.seasonNumber, item.episodeNumber);

    if (collab.serie && collab.serie.id === item.mediaId && collab.setCurrentSerie) {
      const updatedSeasons = collab.serie.seasons.map((season) => ({
        ...season,
        episodes: season.episodes.map((ep) =>
          ep.id === item.episodeId ? { ...ep, isWatched: true } : ep,
        ),
      }));
      const isSeriesWatched =
        updatedSeasons.flatMap((s) => s.episodes).length > 0 &&
        updatedSeasons.flatMap((s) => s.episodes).every((ep) => ep.isWatched === true);
      collab.setCurrentSerie({ ...collab.serie, seasons: updatedSeasons, isWatched: isSeriesWatched });
    }
  }

  usePlayerStore.getState().closeExternal();
}

export async function advanceEpisode(
  session: ExternalSession,
  collab: WatchCollaborators,
): Promise<{ advanced: boolean }> {
  const { item, queue, index } = session;

  if (item.mediaType === "SERIES" && item.episodeId && item.seasonNumber != null && item.episodeNumber != null) {
    await markEpisodeAsWatched(item.mediaId, item.episodeId, item.seasonNumber, item.episodeNumber);

    if (collab.serie && collab.serie.id === item.mediaId && collab.setCurrentSerie) {
      const updatedSeasons = collab.serie.seasons.map((season) => ({
        ...season,
        episodes: season.episodes.map((ep) =>
          ep.id === item.episodeId ? { ...ep, isWatched: true } : ep,
        ),
      }));
      collab.setCurrentSerie({ ...collab.serie, seasons: updatedSeasons });
    }
  }

  const nextItem = queue[index + 1];
  if (!nextItem) {
    usePlayerStore.getState().closeExternal();
    return { advanced: false };
  }

  await tauriService.openMedia(nextItem.filePath);
  usePlayerStore.getState().advanceExternal();
  return { advanced: true };
}
