import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Folder } from "@/types/folder";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  CheckCircleIcon,
  Film,
  Filter,
  FolderOpen,
  Grid3x3,
  List,
  Plus,
  Scan,
  Search,
  SlidersHorizontal,
  Tv,
} from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { userActionService } from "@/services/userActionService";
import { useApiConnectivity } from "@/context/apiConnectivityContext";

interface FolderMediaHeaderProps {
  selectedFolder: Folder;
  activeTab: "all" | "movies" | "series" | "watched";
  viewMode: "grid" | "list";
  scanning: boolean;
  scanProgress: number;
  totalCount: number;
  unwatchedMoviesCount: number;
  watchedMoviesCount: number;
  seriesCount: number;
  searchQuery: string;
  sortBy: "modified" | "title" | "rating" | "duration" | "year";
  sortOrder: "asc" | "desc";
  statusFilter: "all" | "watched" | "unwatched";
  typeFilter: "all" | "movie" | "series" | "anime";
  yearRange: "all" | "before-2000" | "2000-2009" | "2010-2019" | "2020-plus";
  ratingRange: "all" | "8-plus" | "7-plus" | "6-plus";
  durationRange: "all" | "short" | "medium" | "long";
  localOnly: boolean;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setActiveTab: Dispatch<SetStateAction<"all" | "movies" | "series" | "watched">>;
  setViewMode: Dispatch<SetStateAction<"grid" | "list">>;
  setSortBy: Dispatch<SetStateAction<"modified" | "title" | "rating" | "duration" | "year">>;
  setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
  setStatusFilter: Dispatch<SetStateAction<"all" | "watched" | "unwatched">>;
  setTypeFilter: Dispatch<SetStateAction<"all" | "movie" | "series" | "anime">>;
  setYearRange: Dispatch<SetStateAction<"all" | "before-2000" | "2000-2009" | "2010-2019" | "2020-plus">>;
  setRatingRange: Dispatch<SetStateAction<"all" | "8-plus" | "7-plus" | "6-plus">>;
  setDurationRange: Dispatch<SetStateAction<"all" | "short" | "medium" | "long">>;
  setLocalOnly: Dispatch<SetStateAction<boolean>>;
  scanFolder: (folderPath: string) => Promise<void>;
  onManualEntry?: () => void;
  onOpenFolder?: () => void;
  watchedSeriesCount?: number;
}

export function FolderMediaHeader({
  selectedFolder,
  activeTab,
  viewMode,
  setActiveTab,
  setViewMode,
  scanFolder,
  scanning,
  scanProgress,
  searchQuery,
  setSearchQuery,
  sortBy,
  sortOrder,
  setSortBy,
  setSortOrder,
  statusFilter,
  typeFilter,
  yearRange,
  ratingRange,
  durationRange,
  localOnly,
  setStatusFilter,
  setTypeFilter,
  setYearRange,
  setRatingRange,
  setDurationRange,
  setLocalOnly,
  totalCount,
  unwatchedMoviesCount,
  watchedMoviesCount,
  seriesCount,
  onManualEntry,
  onOpenFolder,
  watchedSeriesCount = 0,
}: FolderMediaHeaderProps) {
  const { isOnline } = useApiConnectivity();
  const [showControlPanel, setShowControlPanel] = useState(false);

  const sortValue = `${sortBy}-${sortOrder}`;
  const triggerClass = "h-9 border-[var(--border-color)] bg-[var(--bg-surface-light)] text-[var(--text-primary)] rounded-md";

  return (
    <div className="sticky top-0 z-20 w-full border-b border-[var(--border-color)] bg-[var(--bg-surface)]/95 backdrop-blur-lg">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(245,158,11,0.08)_0%,rgba(14,165,233,0.06)_40%,transparent_72%)]" />

      <div className="relative space-y-3 px-3 py-3 sm:px-4 md:px-6 md:py-4">
        <div className="rounded-2xl border border-[var(--border-color)]/70 bg-[var(--bg-surface-light)]/45 p-2.5 sm:p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onOpenFolder}
                    size={"icon"}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10"
                  >
                    <FolderOpen className="h-4 w-4 text-[var(--color-primary)]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Abrir Pasta do Arquivo</TooltipContent>
              </Tooltip>
              <div className="min-w-0">
                <motion.h1
                  className="truncate text-sm font-bold leading-tight text-[var(--text-primary)] font-display md:text-base lg:text-lg"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {selectedFolder.name}
                </motion.h1>
                <motion.p
                  className="mt-0.5 hidden max-w-[34ch] truncate text-xs text-[var(--text-muted)] sm:block font-sans"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  title={selectedFolder.path}
                >
                  {selectedFolder.path}
                </motion.p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                type="text"
                placeholder="Buscar na biblioteca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-[var(--border-color)] bg-[var(--bg-surface)] pl-10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] md:h-9"
              />
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              <div className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      aria-label="Visualização em grade"
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
                      aria-label="Visualização em lista"
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
                    onClick={() => scanFolder(selectedFolder.path)}
                    variant="outline"
                    size="sm"
                    disabled={scanning || !isOnline}
                    className={cn(triggerClass, "px-3 r")}
                  >
                    <Scan className={cn(" h-4 w-4", scanning && "animate-spin")} />
                    {scanning ? `${Math.round(scanProgress)}%` : ""}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reescanear Pasta</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  {onManualEntry && (
                    <div className="flex flex-wrap gap-2">
                      {onManualEntry && (
                        <Button
                          onClick={onManualEntry}
                          size="sm"
                          variant="outline"
                          disabled={!isOnline}
                          className={cn(triggerClass, "px-3 ")}
                        >
                          <Plus className=" h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TooltipTrigger>
                <TooltipContent>Adicionar Mídia</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showControlPanel ? "default" : "outline"}
                    size="sm"
                    aria-label="Mostrar filtros e opções"
                    className={cn(
                      "h-9 border-[var(--border-color)] rounded-md",
                      showControlPanel
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
                        : "bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--color-primary)]",
                    )}
                    onClick={() => setShowControlPanel((current) => !current)}
                  >
                    <SlidersHorizontal className=" h-8 w-8" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Filtros e ações avançadas</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div
            className="mt-2 border-t border-[var(--border-color)]/60 pt-2"
            role="tablist"
            aria-label="Filtros por tipo de mídia"
          >
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max items-center gap-2 pr-2">
                {[
                  { key: "all", label: "Tudo", icon: null, count: totalCount },
                  { key: "movies", label: "Filmes", icon: Film, count: unwatchedMoviesCount },
                  { key: "series", label: "Séries", icon: Tv, count: seriesCount },
                  {
                    key: "watched",
                    label: "Assistidos",
                    icon: CheckCircleIcon,
                    count: watchedMoviesCount + watchedSeriesCount,
                  },
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? "default" : "ghost"}
                    size="sm"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={async () => {
                      setActiveTab(tab.key as any);
                      await userActionService.saveTabView(tab.key);
                    }}
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
                        layoutId="activeTab"
                        transition={{ type: "spring", damping: 20 }}
                      />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showControlPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden rounded-2xl border border-[var(--border-color)]/70 bg-[var(--bg-surface-light)]/35"
            >
              <div className="space-y-3 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Filtros e Opções
                </p>

               

                <div className="flex gap-4 justify-between">
                  <Select
                    value={sortValue}
                    onValueChange={(value) => {
                      const [field, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                  >
                    <SelectTrigger className={triggerClass}>
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <SelectItem value="modified-desc">Modificado (Mais Recente)</SelectItem>
                      <SelectItem value="modified-asc">Modificado (Mais Antigo)</SelectItem>
                      <SelectItem value="title-asc">Título (A-Z)</SelectItem>
                      <SelectItem value="title-desc">Título (Z-A)</SelectItem>
                      <SelectItem value="rating-desc">Avaliação (Maior)</SelectItem>
                      <SelectItem value="rating-asc">Avaliação (Menor)</SelectItem>
                      <SelectItem value="duration-desc">Duração (Maior)</SelectItem>
                      <SelectItem value="duration-asc">Duração (Menor)</SelectItem>
                      <SelectItem value="year-desc">Ano (Mais Recente)</SelectItem>
                      <SelectItem value="year-asc">Ano (Mais Antigo)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                    <SelectTrigger className={triggerClass}>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <SelectItem value="all">Tipo: Todos</SelectItem>
                      <SelectItem value="movie">Filmes</SelectItem>
                      <SelectItem value="series">Séries</SelectItem>
                      <SelectItem value="anime">Animes</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={yearRange} onValueChange={(value) => setYearRange(value as typeof yearRange)}>
                    <SelectTrigger className={triggerClass}>
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <SelectItem value="all">Ano: Todos</SelectItem>
                      <SelectItem value="before-2000">Antes de 2000</SelectItem>
                      <SelectItem value="2000-2009">2000 - 2009</SelectItem>
                      <SelectItem value="2010-2019">2010 - 2019</SelectItem>
                      <SelectItem value="2020-plus">2020+</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={ratingRange} onValueChange={(value) => setRatingRange(value as typeof ratingRange)}>
                    <SelectTrigger className={triggerClass}>
                      <SelectValue placeholder="Nota" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <SelectItem value="all">Nota: Todas</SelectItem>
                      <SelectItem value="8-plus">8.0+</SelectItem>
                      <SelectItem value="7-plus">7.0+</SelectItem>
                      <SelectItem value="6-plus">6.0+</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={durationRange}
                    onValueChange={(value) => setDurationRange(value as typeof durationRange)}
                  >
                    <SelectTrigger className={triggerClass}>
                      <SelectValue placeholder="Duração" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <SelectItem value="all">Duração: Todas</SelectItem>
                      <SelectItem value="short">Curta (&lt; 90 min)</SelectItem>
                      <SelectItem value="medium">Média (90-150 min)</SelectItem>
                      <SelectItem value="long">Longa (&gt; 150 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
