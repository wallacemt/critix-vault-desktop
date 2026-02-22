import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Film, Tv, Loader2, FolderOpen, FileVideo } from "lucide-react";
import { useState } from "react";
import { apiService } from "@/services/api";
import { getMovies, saveMovies, getSeries, saveSeries } from "@/services/databaseService";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { open } from "@tauri-apps/plugin-dialog";
import { MediaSearchResult } from "@/types/api";

interface SearchResult {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  poster?: string;
  overview?: string;
  mediaType: "movie" | "tv";
  details: any;
}

interface ManualMediaEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folderId: string;
  folderPath: string;
}

export function ManualMediaEntryDialog({
  isOpen,
  onClose,
  onSuccess,
  folderId,
  folderPath,
}: ManualMediaEntryDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<SearchResult | null>(null);
  const [selectedFile, setSelectedFile] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedMedia(null);

    try {
      const response = (await apiService.searchMediaByTitle(searchQuery, true, false)) as {
        details?: MediaSearchResult[];
        mediaType: string;
      };

      // Convert single result to array format
      if (response && response.details) {
        setSearchResults(
          response.details.map((response) => ({
            id: response.id?.toString() || "",
            title: response.name || response.title || "Unknown",
            originalTitle: response.original_name || response.original_title,
            year: parseInt((response.first_air_date || response.release_date || "").split("-")[0] || "0"),
            poster: response.poster_path ? `https://image.tmdb.org/t/p/w500/${response.poster_path}` : undefined,
            overview: response.overview,
            mediaType: response.media_type === "movie" ? "movie" : "tv",
            details: response.media_type,
          })),
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Erro ao buscar mídia. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFile = async () => {
    try {
      // Use Tauri dialog plugin directly
      const selected = await open({
        directory: selectedMedia?.mediaType === "tv",
        multiple: false,
        defaultPath: folderPath,
        title: selectedMedia?.mediaType === "movie" ? "Selecione o arquivo de vídeo" : "Selecione a pasta da série",
      });

      if (selected) {
        setSelectedFile(Array.isArray(selected) ? selected[0] : selected);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedMedia || !selectedFile) {
      alert("Selecione uma mídia e um arquivo");
      return;
    }

    setIsSaving(true);

    try {
      // Fetch full media details from API (includes genres, cast, crew, images, videos, etc.)
      const details = (await apiService.getMediaDetailsById(selectedMedia.id, selectedMedia.mediaType)) as any;

      if (!details) {
        throw new Error("Não foi possível buscar os detalhes da mídia");
      }

      // Build shared helper data from full API response
      const poster = details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : selectedMedia.poster;
      const backdrop = details.backdrop_path
        ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
        : undefined;
      const genres = details.genres?.map((g: any) => ({ name: g.name })) ?? [];
      const cast =
        details.credits?.cast?.slice(0, 20).map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        })) ?? [];
      const crew =
        details.credits?.crew
          ?.filter((c: any) => ["Director", "Producer", "Screenplay", "Writer"].includes(c.job))
          .slice(0, 10)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            job: c.job,
            department: c.department,
            profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
          })) ?? [];
      const images: string[] = [
        ...(details.images?.backdrops
          ?.slice(0, 10)
          .map((img: any) => `https://image.tmdb.org/t/p/original${img.file_path}`) ?? []),
        ...(details.images?.posters?.slice(0, 5).map((img: any) => `https://image.tmdb.org/t/p/w500${img.file_path}`) ??
          []),
      ];
      const videos =
        details.videos?.results
          ?.filter((v: any) => v.type === "Trailer" || v.type === "Teaser")
          .slice(0, 5)
          .map((v: any) => ({ id: v.id, key: v.key, name: v.name, site: v.site, type: v.type })) ?? [];
      const trailer = videos[0] ? `https://www.youtube.com/watch?v=${videos[0].key}` : undefined;

      if (selectedMedia.mediaType === "movie") {
        const movie: Movie = {
          id: details.id?.toString() || selectedMedia.id,
          type: "MOVIE",
          title: details.title || selectedMedia.title,
          originalTitle: details.original_title || selectedMedia.originalTitle,
          year: parseInt(details.release_date?.split("-")[0] || "0") || selectedMedia.year,
          poster,
          backdrop,
          overview: details.overview || selectedMedia.overview,
          rating: details.vote_average,
          status: "MATCHED",
          filePath: selectedFile,
          folderId: folderId,
          duration: details.runtime,
          releaseDate: details.release_date,
          tagline: details.tagline,
          imdbId: details.imdb_id,
          budget: details.budget,
          revenue: details.revenue,
          voteCount: details.vote_count,
          popularity: details.popularity,
          genres,
          cast: cast.length > 0 ? cast : undefined,
          crew: crew.length > 0 ? crew : undefined,
          images: images.length > 0 ? images : undefined,
          videos: videos.length > 0 ? videos : undefined,
          trailer,
        };

        const existingMovies = await getMovies();
        const filteredExisting = existingMovies.filter((m) => m.id !== movie.id || m.folderId !== folderId);
        await saveMovies([...filteredExisting, movie]);
        console.log("✅ Movie added manually:", movie.title);
      } else {
        const series: Series = {
          id: details.id?.toString() || selectedMedia.id,
          type: "SERIES",
          title: details.name || selectedMedia.title,
          originalTitle: details.original_name || selectedMedia.originalTitle,
          year: parseInt(details.first_air_date?.split("-")[0] || "0") || selectedMedia.year,
          poster,
          backdrop,
          overview: details.overview || selectedMedia.overview,
          rating: details.vote_average,
          status: "MATCHED",
          filePath: selectedFile,
          folderId: folderId,
          numberOfSeasons: details.number_of_seasons || 0,
          numberOfEpisodes: details.number_of_episodes || 0,
          firstAirDate: details.first_air_date,
          lastAirDate: details.last_air_date,
          tagline: details.tagline,
          imdbId: details.imdb_id,
          voteCount: details.vote_count,
          popularity: details.popularity,
          networks: details.networks?.map((n: any) => n.name) ?? [],
          productionCompanies: details.production_companies?.map((p: any) => p.name) ?? [],
          genres,
          cast: cast.length > 0 ? cast : undefined,
          crew: crew.length > 0 ? crew : undefined,
          images: images.length > 0 ? images : undefined,
          videos: videos.length > 0 ? videos : undefined,
          trailer,
          seasons:
            details.seasons?.map((season: any) => ({
              id: `${details.id}-s${season.season_number}`,
              seasonNumber: season.season_number,
              name: season.name,
              overview: season.overview,
              poster: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : undefined,
              episodeCount: season.episode_count,
              episodes: [],
              available: false,
              downloadedEpisodes: 0,
            })) ?? [],
        };

        const existingSeries = await getSeries();
        const filteredExisting = existingSeries.filter((s) => s.id !== series.id || s.folderId !== folderId);
        await saveSeries([...filteredExisting, series]);
        console.log("✅ Series added manually:", series.title);
      }

      // Reset form
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMedia(null);
      setSelectedFile("");

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving media:", error);
      alert(`Erro ao salvar: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-2xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>Adicionar Mídia Manualmente</DialogTitle>
          <DialogDescription>Busque por um filme ou série e associe a um arquivo local</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="space-y-2">
            <Label>Buscar Mídia</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o nome do filme ou série..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                disabled={isSearching}
              />
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Resultados da Busca</Label>
              <ScrollArea className="h-[600px] border rounded-lg p-2">
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedMedia(result)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        selectedMedia?.id === result.id ? "border-primary bg-primary/10" : "hover:bg-accent"
                      }`}
                    >
                      {result.poster ? (
                        <img
                          src={result.poster}
                          height={200}
                          width={200}
                          alt={result.title}
                          className="w-16 h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-secondary rounded flex items-center justify-center">
                          {result.mediaType === "movie" ? (
                            <Film className="h-8 w-8 text-muted-foreground" />
                          ) : (
                            <Tv className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold flex items-center gap-2">
                          {result.title}
                          {result.year && <span className="text-sm text-muted-foreground">({result.year})</span>}
                        </h3>
                        {result.originalTitle && result.originalTitle !== result.title && (
                          <p className="text-xs text-muted-foreground">{result.originalTitle}</p>
                        )}
                        {result.overview && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{result.overview}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {result.mediaType === "movie" ? (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Filme</span>
                          ) : (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Série</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* File Selection */}
          {selectedMedia && (
            <div className="space-y-2">
              <Label>Arquivo Local</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={
                    selectedMedia.mediaType === "movie"
                      ? "Selecione o arquivo do filme..."
                      : "Selecione a pasta da série..."
                  }
                  value={selectedFile}
                  readOnly
                />
                <Button variant="outline" onClick={handleSelectFile}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Selecionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedMedia.mediaType === "movie"
                  ? "Selecione o arquivo de vídeo do filme"
                  : "Selecione a pasta que contém os episódios da série"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedMedia || !selectedFile || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <FileVideo className="h-4 w-4 mr-2" />
                Adicionar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
