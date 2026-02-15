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
import { Movie, Series } from "@/types";
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
      if (selectedMedia.mediaType === "movie") {
        const movie: Movie = {
          id: selectedMedia.id,
          type: "MOVIE",
          title: selectedMedia.title,
          originalTitle: selectedMedia.originalTitle,
          year: selectedMedia.year,
          poster: selectedMedia.poster,
          backdrop: selectedMedia.details.backdrop_path
            ? `https://image.tmdb.org/t/p/original${selectedMedia.details.backdrop_path}`
            : undefined,
          overview: selectedMedia.overview,
          rating: selectedMedia.details.vote_average,
          status: "MATCHED",
          filePath: selectedFile,
          folderId: folderId,
          duration: selectedMedia.details.runtime,
          releaseDate: selectedMedia.details.release_date,
          trailer: selectedMedia.details.videos?.results?.[0]?.key
            ? `https://www.youtube.com/watch?v=${selectedMedia.details.videos.results[0].key}`
            : undefined,
        };

        // Load existing movies and add the new one
        const existingMovies = await getMovies();
        await saveMovies([...existingMovies, movie]);
        console.log("✅ Movie added manually:", movie.title);
      } else {
        // For series, we need to get season details
        const series: Series = {
          id: selectedMedia.id,
          type: "SERIES",
          title: selectedMedia.title,
          originalTitle: selectedMedia.originalTitle,
          year: selectedMedia.year,
          poster: selectedMedia.poster,
          backdrop: selectedMedia.details.backdrop_path
            ? `https://image.tmdb.org/t/p/original${selectedMedia.details.backdrop_path}`
            : undefined,
          overview: selectedMedia.overview,
          rating: selectedMedia.details.vote_average,
          status: "MATCHED",
          filePath: selectedFile,
          folderId: folderId,
          numberOfSeasons: selectedMedia.details.number_of_seasons || 0,
          numberOfEpisodes: selectedMedia.details.number_of_episodes || 0,
          seasons: [], // Will be populated when user views series details
          firstAirDate: selectedMedia.details.first_air_date,
          lastAirDate: selectedMedia.details.last_air_date,
          trailer: selectedMedia.details.videos?.results?.[0]?.key
            ? `https://www.youtube.com/watch?v=${selectedMedia.details.videos.results[0].key}`
            : undefined,
        };

        // Load existing series and add the new one
        const existingSeries = await getSeries();
        await saveSeries([...existingSeries, series]);
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
