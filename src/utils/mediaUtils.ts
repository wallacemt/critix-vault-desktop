const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const getImageUrl = (path: string, size: "w200" | "w300" | "w500" | "w780" | "original" = "w500"): string => {
  if (!path) {
    return "https://res.cloudinary.com/dg9hqvlas/image/upload/q_auto:low/c_scale,w_1200/f_webp/v1764631407/placeholder_v3gsdr.png";
  }
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export function getNextUnwatchedEpisode(series: {
  seasons?: Array<{
    seasonNumber?: number;
    season_number?: number;
    episodes?: Array<{
      episode_number?: number;
      episodeNumber?: number;
      isWatched?: boolean;
    }>;
  }>;
}) {
  const episodes = (series.seasons || [])
    .flatMap((season) =>
      (season.episodes || []).map((episode) => ({
        seasonNumber: season.seasonNumber ?? season.season_number ?? 0,
        episodeNumber: episode.episodeNumber ?? episode.episode_number ?? 0,
        isWatched: Boolean(episode.isWatched),
      })),
    )
    .filter((episode) => Number.isFinite(episode.seasonNumber) && Number.isFinite(episode.episodeNumber))
    .sort((a, b) => {
      if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
      return a.episodeNumber - b.episodeNumber;
    });

  return episodes.find((episode) => !episode.isWatched) || null;
}

/**
 * Returns the furthest episode the user has already watched (max season, then max episode),
 * or null if none. Badge should only be shown when this is non-null.
 *
 * Uses max(season, episode) rather than "episode before first unwatched" so out-of-order
 * viewing (e.g. watch S2E5 before finishing S1) and single-episode viewing work correctly.
 */
export function getLastWatchedEpisode(series: Parameters<typeof getNextUnwatchedEpisode>[0]) {
  const watched = (series.seasons || [])
    .flatMap((season) =>
      (season.episodes || []).map((episode) => ({
        seasonNumber: season.seasonNumber ?? season.season_number ?? 0,
        episodeNumber: episode.episodeNumber ?? episode.episode_number ?? 0,
        isWatched: Boolean(episode.isWatched),
      })),
    )
    .filter(
      (e) => Number.isFinite(e.seasonNumber) && Number.isFinite(e.episodeNumber) && e.isWatched,
    );

  if (watched.length === 0) return null;

  return watched.reduce((max, e) => {
    if (e.seasonNumber !== max.seasonNumber) return e.seasonNumber > max.seasonNumber ? e : max;
    return e.episodeNumber > max.episodeNumber ? e : max;
  });
}
