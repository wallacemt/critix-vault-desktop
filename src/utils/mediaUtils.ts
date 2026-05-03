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
