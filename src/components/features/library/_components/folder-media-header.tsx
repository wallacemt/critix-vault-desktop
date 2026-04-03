import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Folder } from "@/types/folder";
import { motion } from "framer-motion";
import {
  Film,
  Grid3x3,
  List,
  Scan,
  Search,
  Tv,
  Plus,
  CheckCircleIcon,
  ArrowUpDown,
  FolderOpen,
  Filter,
} from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { userActionService } from "@/services/userActionService";

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
  onScanWithPreview?: () => void;
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
  onScanWithPreview,
  onManualEntry,
  onOpenFolder,
  watchedSeriesCount = 0,
}: FolderMediaHeaderProps) {
  return (
    <div className="sticky top-0 z-30 w-full border-b border-[var(--border-color)] bg-[var(--bg-surface)]/95 backdrop-blur-lg">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(245,158,11,0.08)_0%,rgba(14,165,233,0.06)_40%,transparent_72%)]" />

      <div className="relative space-y-3 px-3 py-3 md:px-6 md:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10">
              <FolderOpen className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <motion.h1
                className="truncate text-base font-bold leading-tight text-[var(--text-primary)] md:text-lg font-display"
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
            <motion.span
              className="hidden items-center rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)] sm:inline-flex"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              {totalCount} mídias
            </motion.span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SidebarTrigger className="z-30 shrink-0 border border-[var(--border-color)] bg-[var(--bg-surface-light)] hover:bg-[var(--bg-surface-light)]/70" />
            {onOpenFolder && (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={onOpenFolder}
                  variant="outline"
                  size="sm"
                  className="border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  title="Abrir pasta no explorador de arquivos"
                >
                  <FolderOpen className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Abrir Pasta</span>
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              type="text"
              placeholder="Buscar na biblioteca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-[var(--border-color)] bg-[var(--bg-surface-light)] pl-10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <SelectTrigger className="h-9 w-full border-[var(--border-color)] bg-[var(--bg-surface-light)] text-[var(--text-primary)] sm:w-[220px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-color)]">
                <SelectItem value="modified-desc" className="text-[var(--text-primary)]">
                  Modificado (Mais Recente)
                </SelectItem>
                <SelectItem value="modified-asc" className="text-[var(--text-primary)]">
                  Modificado (Mais Antigo)
                </SelectItem>
                <SelectItem value="title-asc" className="text-[var(--text-primary)]">
                  Título (A-Z)
                </SelectItem>
                <SelectItem value="title-desc" className="text-[var(--text-primary)]">
                  Título (Z-A)
                </SelectItem>
                <SelectItem value="rating-desc" className="text-[var(--text-primary)]">
                  Avaliação (Maior)
                </SelectItem>
                <SelectItem value="rating-asc" className="text-[var(--text-primary)]">
                  Avaliação (Menor)
                </SelectItem>
                <SelectItem value="duration-desc" className="text-[var(--text-primary)]">
                  Duração (Maior)
                </SelectItem>
                <SelectItem value="duration-asc" className="text-[var(--text-primary)]">
                  Duração (Menor)
                </SelectItem>
                <SelectItem value="year-desc" className="text-[var(--text-primary)]">
                  Ano (Mais Recente)
                </SelectItem>
                <SelectItem value="year-asc" className="text-[var(--text-primary)]">
                  Ano (Mais Antigo)
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-surface-light)] p-1">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "h-8 w-8",
                  viewMode === "grid" && "rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
                )}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-8 w-8",
                  viewMode === "list" && "rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {onScanWithPreview && (
              <Button
                onClick={onScanWithPreview}
                size="sm"
                variant="outline"
                className="h-9 border-[var(--border-color)] bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)]"
              >
                <Scan className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Pré-escanear</span>
                <span className="sm:hidden">Prévia</span>
              </Button>
            )}

            <Button
              onClick={() => scanFolder(selectedFolder.path)}
              variant="outline"
              size="sm"
              disabled={scanning}
              className="h-9 border-[var(--border-color)] bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)]"
            >
              <Scan className={cn("mr-2 h-4 w-4", scanning && "animate-spin")} />
              {scanning ? `${Math.round(scanProgress)}%` : "Reescanear"}
            </Button>

            {onManualEntry && (
              <Button
                onClick={onManualEntry}
                variant="outline"
                size="sm"
                className="h-9 border-[var(--border-color)] bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)]"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Adicionar</span>
                <span className="sm:hidden">+ Mídia</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="h-9 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-color)]">
              <SelectItem value="all">Status: Todos</SelectItem>
              <SelectItem value="watched">Status: Assistidos</SelectItem>
              <SelectItem value="unwatched">Status: Não assistidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
            <SelectTrigger className="h-9 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-color)]">
              <SelectItem value="all">Tipo: Todos</SelectItem>
              <SelectItem value="movie">Filmes</SelectItem>
              <SelectItem value="series">Séries</SelectItem>
              <SelectItem value="anime">Animes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearRange} onValueChange={(value) => setYearRange(value as typeof yearRange)}>
            <SelectTrigger className="h-9 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-color)]">
              <SelectItem value="all">Ano: Todos</SelectItem>
              <SelectItem value="before-2000">Antes de 2000</SelectItem>
              <SelectItem value="2000-2009">2000 - 2009</SelectItem>
              <SelectItem value="2010-2019">2010 - 2019</SelectItem>
              <SelectItem value="2020-plus">2020+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingRange} onValueChange={(value) => setRatingRange(value as typeof ratingRange)}>
            <SelectTrigger className="h-9 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
              <SelectValue placeholder="Nota" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-color)]">
              <SelectItem value="all">Nota: Todas</SelectItem>
              <SelectItem value="8-plus">8.0+</SelectItem>
              <SelectItem value="7-plus">7.0+</SelectItem>
              <SelectItem value="6-plus">6.0+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={durationRange} onValueChange={(value) => setDurationRange(value as typeof durationRange)}>
            <SelectTrigger className="h-9 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
              <SelectValue placeholder="Duração" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-color)]">
              <SelectItem value="all">Duração: Todas</SelectItem>
              <SelectItem value="short">Curta (&lt; 90 min)</SelectItem>
              <SelectItem value="medium">Média (90-150 min)</SelectItem>
              <SelectItem value="long">Longa (&gt; 150 min)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={localOnly ? "default" : "outline"}
            onClick={() => setLocalOnly((value) => !value)}
            className={cn(
              "h-9 w-full",
              localOnly
                ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
                : "bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]",
            )}
          >
            Somente Arquivo Local
          </Button>
        </div>

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
  );
}
