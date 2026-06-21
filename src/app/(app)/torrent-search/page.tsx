"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { tauriService } from "@/services/tauri";
import { ArrowLeft, Download, Grid, List, Loader2, Magnet, Search, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTorrentDiscovery } from "@/hooks/useTorrentDiscovery";
import { DiscoverySection } from "@/components/features/discovery/DiscoverySection";
import { DiscoveryFilters } from "@/components/features/discovery/DiscoveryFilters";
import { TorrentPickerDialog } from "@/components/features/discovery/TorrentPickerDialog";
import { DiscoveryItem, TorrentMatch } from "@/types/discovery";
import { useMediaContext } from "@/context/mediaContext";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

// ---- Helpers shared with the legacy search list ----

function formatBytes(bytes: string | number): string {
  const n = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (!n || isNaN(n)) return "?";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  "100": "Filmes",
  "101": "Filmes (DVD)",
  "102": "Filmes (DivX/Xvid)",
  "103": "Filmes (DVD-r)",
  "104": "Filmes (Mobile)",
  "200": "Música",
  "201": "Música (MP3)",
  "202": "Música (FLAC)",
  "205": "Música (Video)",
  "207": "Música (Radio)",
  "300": "Áudio",
  "301": "Áudio (Livros)",
  "302": "Áudio (Comics)",
  "303": "Áudio (Revistas)",
  "304": "Áudio (Android)",
  "400": "Aplicativos",
  "401": "Aplicativos (Windows)",
  "402": "Aplicativos (Mac)",
  "403": "Aplicativos (UNIX)",
  "404": "Aplicativos (Handheld)",
  "405": "Aplicativos (iOS)",
  "406": "Aplicativos (Android)",
  "500": "Jogos",
  "501": "Jogos (PC)",
  "502": "Jogos (Mac)",
  "503": "Jogos (PSx)",
  "504": "Jogos (XBOX360)",
  "505": "Jogos (Wii)",
  "506": "Jogos (Handheld)",
  "507": "Jogos (iOS)",
  "508": "Jogos (Android)",
  "600": "Séries (TV)",
  "601": "Séries (HD)",
  "602": "Séries (DVD)",
  "603": "Séries (Non-English)",
  "604": "Séries (Mobile)",
  "605": "Séries (Animação)",
  "700": "Outros",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? `Cat ${cat}`;
}

function seederColor(seeders: number): string {
  if (seeders > 50) return "text-emerald-400";
  if (seeders > 10) return "text-yellow-400";
  return "text-red-400";
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/** Converts a DiscoveryItem to a minimal Movie for use with mediaContext. */
function toMinimalMovie(item: DiscoveryItem): Movie {
  return {
    id: String(item.tmdbId),
    type: "MOVIE",
    title: item.title,
    originalTitle: item.originalTitle ?? undefined,
    year: item.year ?? undefined,
    poster: item.posterPath ? `${TMDB_IMAGE_BASE}/w500${item.posterPath}` : undefined,
    backdrop: item.backdropPath ? `${TMDB_IMAGE_BASE}/w1280${item.backdropPath}` : undefined,
    overview: item.overview ?? undefined,
    rating: item.voteAverage ?? undefined,
    genres: item.genres.filter((g) => g.name).map((g) => ({ id: g.id, name: g.name as string })),
    status: "MATCHED",
    filePath: "",
    folderId: "",
  };
}

/** Converts a DiscoveryItem to a minimal Series for use with mediaContext. */
function toMinimalSeries(item: DiscoveryItem): Series {
  return {
    id: String(item.tmdbId),
    type: "SERIES",
    title: item.title,
    originalTitle: item.originalTitle ?? undefined,
    year: item.year ?? undefined,
    poster: item.posterPath ? `${TMDB_IMAGE_BASE}/w500${item.posterPath}` : undefined,
    backdrop: item.backdropPath ? `${TMDB_IMAGE_BASE}/w1280${item.backdropPath}` : undefined,
    overview: item.overview ?? undefined,
    rating: item.voteAverage ?? undefined,
    genres: item.genres.filter((g) => g.name).map((g) => ({ id: g.id, name: g.name as string })),
    status: "MATCHED",
    filePath: "",
    folderId: "",
    seasons: [],
    numberOfSeasons: 0,
    numberOfEpisodes: 0,
  };
}

export default function TorrentBrowserPage() {
  const router = useRouter();
  const { isOnline } = useApiConnectivity();
  const { setCurrentMovie, setCurrentSerie } = useMediaContext();

  // ---- Discovery hook (feed + filters + search + download) ----
  const {
    feed,
    feedLoading,
    feedError,
    degraded,
    filters,
    setFilters,
    filteredItems,
    page,
    loadMore,
    viewMode,
    setViewMode,
    searchResults,
    searchLoading,
    search,
    clearSearch,
    activeQuery,
    handleDownload,
    fetchTorrentsForItem,
  } = useTorrentDiscovery();

  // ---- Torrent picker dialog state ----
  const [pickerItem, setPickerItem] = useState<DiscoveryItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ---- Manual search form state ----
  const [manualQuery, setManualQuery] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- All available genres for the filter bar ----
  const genres = Array.from(
    new Set(
      (feed?.items ?? [])
        .flatMap((item) => item.genres)
        .filter((g) => g.name)
        .map((g) => g.name as string),
    ),
  ).sort();

  // ---- Handlers ----

  const handleItemClick = (item: DiscoveryItem) => {
    if (item.mediaType === "tv") {
      setCurrentSerie(toMinimalSeries(item));
      router.push("/series-details?mode=torrent");
    } else {
      setCurrentMovie(toMinimalMovie(item));
      router.push("/movie-details?mode=torrent");
    }
  };

  const handleDiscoveryDownload = (item: DiscoveryItem) => {
    if (item.torrents.length === 1) {
      handleDownload(item.torrents[0]);
      return;
    }
    // Multiple torrents (or zero): open picker
    setPickerItem(item);
    setPickerOpen(true);
  };

  const handlePickerSelect = (torrent: TorrentMatch) => {
    handleDownload(torrent);
  };

  const handleManualSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualQuery.trim()) return;
    setManualError(null);
    clearSearch();
    try {
      await search(manualQuery.trim());
    } catch (err) {
      setManualError(
        err instanceof Error ? err.message : "Erro ao buscar torrents. Verifique sua conexão.",
      );
    }
  };

  const handleManualDownload = async (torrent: TorrentMatch) => {
    setDownloadingId(torrent.id);
    try {
      await handleDownload(torrent);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível abrir o link magnet.");
    } finally {
      setDownloadingId(null);
    }
  };

  const isActiveSearch = activeQuery.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6 pb-16">

        {/* ---- Header ---- */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Link href="/library" aria-label="Voltar">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center">
                <Magnet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Torrent Browser</h1>
                <p className="text-xs text-slate-500">
                  TMDB · The Pirate Bay
                  {degraded && (
                    <span className="ml-2 text-amber-400">· Modo parcial</span>
                  )}
                  {!isOnline && (
                    <span className="ml-2 text-red-400">· Offline</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
              title="Visualização em grade"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode("list")}
              className={`rounded-lg ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
              title="Visualização em lista"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* ---- Discovery Feed (hidden while a manual search is active) ---- */}
        {!isActiveSearch && isOnline && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-10"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Em Alta</h2>

            <DiscoveryFilters filters={filters} onChange={setFilters} genres={genres} />

            {feedError && !feedLoading && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                <WifiOff className="w-4 h-4 shrink-0" />
                {feedError}
              </div>
            )}

            <DiscoverySection
              items={filteredItems}
              viewMode={viewMode}
              onItemClick={handleItemClick}
              onDownload={handleDiscoveryDownload}
              loading={feedLoading}
              degraded={degraded}
              feedNeverLoaded={feed === null}
            />

            {/* Load more */}
            {feed && page < feed.totalPages && !feedLoading && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </motion.section>
        )}

        {/* ---- Divider ---- */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-500 uppercase tracking-widest">Busca Manual</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* ---- Manual search bar ---- */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleManualSearch}
          className="flex gap-3 mb-8"
        >
          <input
            ref={inputRef}
            type="text"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            placeholder="Buscar filmes, séries, músicas..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <Button
            type="submit"
            disabled={searchLoading || !manualQuery.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl"
          >
            {searchLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
          {isActiveSearch && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                clearSearch();
                setManualQuery("");
              }}
              className="text-slate-400 hover:text-white rounded-xl"
            >
              Limpar
            </Button>
          )}
        </motion.form>

        {/* ---- Manual search error ---- */}
        <AnimatePresence>
          {manualError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300"
            >
              <WifiOff className="w-4 h-4 shrink-0" />
              {manualError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Manual search results ---- */}
        <AnimatePresence>
          {!searchLoading && isActiveSearch && searchResults.length === 0 && !manualError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-slate-500 py-12"
            >
              Nenhum resultado para &quot;{activeQuery}&quot;.
            </motion.p>
          )}

          {searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">{searchResults.length} resultado(s)</p>
              {searchResults.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025 }}
                  className="flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3 hover:border-slate-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate" title={r.name}>
                      {r.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{categoryLabel(r.category)}</span>
                      <span className="text-xs text-slate-500">{formatBytes(r.sizeBytes)}</span>
                      <span className={`text-xs font-medium ${seederColor(r.seeders)}`}>
                        {r.seeders} seeds / {r.leechers} leechers
                      </span>
                      {r.quality && (
                        <span className="text-xs text-emerald-400 font-medium">{r.quality}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleManualDownload(r)}
                    disabled={downloadingId === r.id}
                    className="shrink-0 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg"
                  >
                    {downloadingId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Info note (shown when no search has been performed) ---- */}
        {!isActiveSearch && !isOnline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex items-start gap-3 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4"
          >
            <WifiOff className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400 leading-relaxed">
              Backend offline. O feed de descoberta não está disponível, mas a busca manual continua
              funcionando via conexão direta.
            </p>
          </motion.div>
        )}

        {!isActiveSearch && isOnline && !feedLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <Wifi className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Busca manual via API do The Pirate Bay. Ao clicar em{" "}
              <strong className="text-slate-400">Baixar</strong>, o link magnet é validado e enviado
              ao seu cliente BitTorrent padrão. Nenhuma conexão é feita ao cliente enquanto você não
              clicar.
            </p>
          </motion.div>
        )}
      </div>

      {/* ---- Torrent picker dialog ---- */}
      <TorrentPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        item={pickerItem}
        onSelect={handlePickerSelect}
        onFetchTorrents={fetchTorrentsForItem}
      />
    </div>
  );
}
