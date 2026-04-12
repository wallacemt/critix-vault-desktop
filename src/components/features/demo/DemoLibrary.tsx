/**
 * Demo Library Component
 * Displays trending media from TMDB in demo mode
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Film,
  Tv,
  TrendingUp,
  RefreshCw,
  Grid3x3,
  List,
  CheckCircle2,
} from "lucide-react";
import { Media } from "@/types/media";
import { StreamingGrid } from "../library/_components/streaming-grid";
import { cn } from "@/lib/utils";
import { useDemoData } from "@/hooks/useDemoData";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MediaGridSkeleton } from "@/components/ui/media-skeleton";

interface DemoLibraryProps {
  onBack: () => void;
  onMediaClick: (media: Media, onDemo?: boolean) => void;
  onMediaPlay: (media: Media) => void;
}

function DemoSidebar({
  onBack,
  totalItems,
  movieCount,
  seriesCount,
}: {
  onBack: () => void;
  totalItems: number;
  movieCount: number;
  seriesCount: number;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-[var(--border-color)]">
      <div
        className="absolute inset-0 z-0 opacity-90 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=400&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/80 via-[#121212]/95 to-[#121212]" />
      </div>

      <SidebarHeader className="z-10 border-b border-[var(--border-color)] p-4 md:p-5">
        <div className="flex w-full items-center justify-center gap-2">
          <div className="flex items-center transition-all hover:scale-105 group-data-[collapsible=icon]:hidden cursor-default">
            <Image src="/images/logo-full.png" width={100} height={100} alt="Critix Logo" title="Critix" />
            <span className="h-3 w-3 rounded-tl-full rounded-tr-full rounded-bl-full bg-amber-400" />
            <span className="font-display text-4xl font-bold text-text-primary">
              <span className="animate-pulse text-primary">V</span>ault
            </span>
          </div>
        </div>

        <div className="flex gap-2 flex-row-reverse items-center justify-center group-data-[collapsible=icon]:flex-col">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger
                className="p-2 size-9 text-text-secondary-crx hover:text-text-primary-crx hover:bg-surface-light-crx rounded-lg transition-colors"
                size="icon-lg"
              />
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Expandir Menu
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onBack}
                size="lg"
                className="w-full rounded-md bg-gradient-to-r from-[var(--color-primary)] to-amber-500 px-4 py-2.5 text-md font-display font-semibold text-on-primary-crx shadow-lg transition-colors hover:from-yellow-500 hover:to-amber-600 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 md:mr-2 group-data-[collapsible=icon]:mr-0" />
                <span className="group-data-[collapsible=icon]:hidden">Voltar a Home</span>
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Voltar a Home
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-[var(--text-secondary)] px-4 py-2">Modo Demo</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 p-2">
            <div className="rounded-xl border border-blue-600/30 bg-blue-600/10 p-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-300 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-300">Trending TMDB</p>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    Catalogo demonstrativo com filmes e series populares da semana.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]/60 p-3 group-data-[collapsible=icon]:hidden">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Total</span>
                  <span className="font-semibold text-[var(--text-primary)]">{totalItems}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Filmes</span>
                  <span className="font-semibold text-[var(--text-primary)]">{movieCount}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Series</span>
                  <span className="font-semibold text-[var(--text-primary)]">{seriesCount}</span>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="z-10">
        <SidebarSeparator />
        <div className="p-4">
          <p className="text-xs text-center text-[var(--text-muted)] group-data-[collapsible=icon]:hidden">
            Demo data from TMDB API
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function DemoHeader({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  movieCount,
  seriesCount,
  loading,
  onRefresh,
}: {
  activeTab: "all" | "movies" | "series";
  setActiveTab: (tab: "all" | "movies" | "series") => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  movieCount: number;
  seriesCount: number;
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const totalCount = movieCount + seriesCount;

  return (
    <div className="sticky top-0 z-20 w-full border-b border-[var(--border-color)] bg-[var(--bg-surface)]/95 backdrop-blur-lg">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(245,158,11,0.08)_0%,rgba(14,165,233,0.06)_40%,transparent_72%)]" />

      <div className="relative space-y-3 px-3 py-3 sm:px-4 md:px-6 md:py-4">
        <div className="rounded-2xl border border-[var(--border-color)]/70 bg-[var(--bg-surface-light)]/45 p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold leading-tight text-[var(--text-primary)] font-display md:text-base lg:text-lg">
                Biblioteca de Demonstracao - Conteudo em Alta
              </h1>
              <p className="mt-0.5 text-xs text-[var(--text-muted)] font-sans">
                Mesma experiencia visual, dados de demo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      aria-label="Visualizacao em grade"
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "h-8 w-8",
                        viewMode === "grid" &&
                          "rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
                      )}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Grade</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      aria-label="Visualizacao em lista"
                      variant={viewMode === "list" ? "default" : "ghost"}
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "h-8 w-8",
                        viewMode === "list" &&
                          "rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
                      )}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Lista</TooltipContent>
                </Tooltip>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      void onRefresh();
                    }}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="h-9 border-[var(--border-color)] bg-[var(--bg-surface-light)] text-[var(--text-primary)] rounded-md px-3"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Atualizar demo</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="mt-2 border-t border-[var(--border-color)]/60 pt-2" role="tablist" aria-label="Abas da demo">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max items-center gap-2 pr-2">
                {[
                  { key: "all", label: "Tudo", icon: null, count: totalCount },
                  { key: "movies", label: "Filmes", icon: Film, count: movieCount },
                  { key: "series", label: "Series", icon: Tv, count: seriesCount },
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? "default" : "ghost"}
                    size="sm"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key as "all" | "movies" | "series")}
                    className={cn(
                      "relative h-9 whitespace-nowrap rounded-md",
                      activeTab === tab.key
                        ? "bg-gradient-to-r from-[var(--color-primary)] to-amber-500 text-[var(--color-on-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-light)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {tab.icon && <tab.icon className="mr-2 h-4 w-4" />}
                    {tab.label} ({tab.count})
                    {activeTab === tab.key && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                        layoutId="activeDemoTab"
                        transition={{ type: "spring", damping: 20 }}
                      />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DemoLibrary({ onBack, onMediaClick, onMediaPlay }: DemoLibraryProps) {
  const { movies, series, loading, error, loadDemo, isOnline, retryConnection } = useDemoData();
  const [activeTab, setActiveTab] = useState<"all" | "movies" | "series">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!isOnline) return;
    void loadDemo();
  }, [isOnline, loadDemo]);

  const filteredMedia = () => {
    const allMedia: Media[] = [...movies, ...series];
    switch (activeTab) {
      case "movies":
        return movies;
      case "series":
        return series;
      default:
        return allMedia;
    }
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      await retryConnection();
    }
    await loadDemo();
  };

  const totalItems = movies.length + series.length;

  return (
    <SidebarProvider defaultOpen={true}>
      <DemoSidebar onBack={onBack} totalItems={totalItems} movieCount={movies.length} seriesCount={series.length} />

      <SidebarInset className="flex-1 flex flex-col overflow-x-hidden">
        <motion.div
          className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <DemoHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            viewMode={viewMode}
            setViewMode={setViewMode}
            movieCount={movies.length}
            seriesCount={series.length}
            loading={loading}
            onRefresh={handleRefresh}
          />

          <div className="flex-1 p-6">
            {loading ? (
              <div className="space-y-4">
                <MediaGridSkeleton count={12} />
                <p className="text-center text-sm text-[var(--text-muted)]">Carregando conteudo em alta...</p>
              </div>
            ) : !isOnline ? (
              <div className="mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
                <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                <p className="text-amber-200 font-semibold mb-2">Modo offline ativo</p>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  O modo demonstracao depende da API externa para carregar conteudo em alta.
                </p>
                <Button
                  onClick={() => {
                    void handleRefresh();
                  }}
                  variant="outline"
                  className="mt-4 bg-[var(--bg-surface-light)] border-[var(--border-color)] hover:bg-[var(--bg-surface)]"
                >
                  Tentar Reconectar
                </Button>
              </div>
            ) : error ? (
              <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-300 font-semibold mb-2">Falha ao carregar conteudo demo</p>
                <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                <Button
                  onClick={() => {
                    void loadDemo();
                  }}
                  variant="outline"
                  className="mt-4 bg-[var(--bg-surface-light)] border-[var(--border-color)] hover:bg-[var(--bg-surface)]"
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : (
              <StreamingGrid
                demoMode
                media={filteredMedia()}
                onMediaClick={onMediaClick}
                onMediaPlay={onMediaPlay}
                viewMode={viewMode}
                emptyMessage={
                  activeTab === "all" ? "Nenhum conteudo em alta disponivel" : `Sem conteudo em alta em ${activeTab}`
                }
              />
            )}
          </div>
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  );
}
