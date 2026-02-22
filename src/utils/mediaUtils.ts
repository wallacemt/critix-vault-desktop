const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const getImageUrl = (path: string, size: "w200" | "w300" | "w500" | "w780" | "original" = "w500"): string => {
  if (!path) {
    return "https://res.cloudinary.com/dg9hqvlas/image/upload/q_auto:low/c_scale,w_1200/f_webp/v1764631407/placeholder_v3gsdr.png";
  }
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};
