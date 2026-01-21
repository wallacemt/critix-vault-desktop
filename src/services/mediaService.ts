import type { TMDBMedia, TMDBTrendingPostersResponse } from "@/types/tmdb";
import { apiService } from "./api";

const getTrendingMedia = async (): Promise<TMDBMedia[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15 segundos de timeout

    const res = await apiService.request(`/media/v1/trending`, {
      cache: "default",
      signal: controller.signal,
      next: { revalidate: 3600 }, // Revalidar a cada hora
    });

    clearTimeout(timeoutId);

    return res as TMDBMedia[];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Timeout ao buscar trending media");
    } else {
      console.error(`Erro ao consultar trending: ${error}`);
    }
    // Retornar array vazio em caso de erro
    return [];
  }
};
const getTrendingRandomPosters = async (): Promise<TMDBTrendingPostersResponse[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15 segundos de timeout

    const res = await apiService.request(`/media/v1/trending/posters/random`, {
      cache: "default",
      signal: controller.signal,
      next: { revalidate: 3600 }, // Revalidar a cada hora
    });

    clearTimeout(timeoutId);

    return res as TMDBTrendingPostersResponse[];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Timeout ao buscar trending posters");
    } else {
      console.error(`Erro ao consultar trending posters: ${error}`);
    }
    // Retornar array vazio em caso de erro
    return [];
  }
};

export { getTrendingMedia, getTrendingRandomPosters };
