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
    <div className="fixed backdrop-blur-lg z-5 w-full bg-gradient-to-b from-[var(--bg-surface)] via-[var(--bg-surface)]/95 to-[var(--bg-surface)]/70 border-b border-[var(--border-color)] px-4 py-4 md:px-6 md:py-6">
      {/* Header with Gradient */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <motion.div
          className="absolute w-full h-full bg-gradient-to-r from-blue-600/10 to-purple-600/10"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          {/* Folder icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex flex-col">
            <motion.h1
              className="text-xl font-bold text-[var(--text-primary)] leading-tight font-display"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {selectedFolder.name}
            </motion.h1>
            <motion.p
              className="text-xs text-[var(--text-muted)] font-sans truncate max-w-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              title={selectedFolder.path}
            >
              {selectedFolder.path}
            </motion.p>
          </div>
          {/* Media count badge */}
          <motion.span
            className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {totalCount} mídias
          </motion.span>
        </div>

        {/* Open Folder — right side of header row */}
        {onOpenFolder && (
          <motion.div className="ml-auto" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={onOpenFolder}
              variant="outline"
              size="sm"
              className="bg-gradient-to-r from-[var(--color-primary)]/15 to-amber-500/15 border-[var(--color-primary)]/40 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--text-primary)]"
              title="Abrir pasta no explorador de arquivos"
            >
              <FolderOpen className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Abrir Pasta</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Search Bar and Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 md:gap-4">
        <SidebarTrigger className="z-20 shrink-0" />
        <div className="relative flex-1 min-w-[220px] md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <Input
            type="text"
            placeholder="Buscar na biblioteca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 z-20 w-full sm:w-auto">
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
              setSortBy(field);
              setSortOrder(order);
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px] bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
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
        </div>

        <div className="flex gap-3 items-center justify-center z-30 ml-auto">
          {/* View Mode Toggle */}
          <div className="   gap-1 bg-[var(--bg-surface-light)] rounded-lg p-1">
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className={cn(
                viewMode === "grid" && "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg",
              )}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className={cn(
                viewMode === "list" && "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg",
              )}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          {/* Rescan Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => scanFolder(selectedFolder.path)}
              variant="outline"
              disabled={scanning}
              className="bg-[var(--bg-surface-light)] border-[var(--border-color)] hover:bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)] "
            >
              <Scan className={cn("w-4 h-4 mr-2", scanning && "animate-spin")} />
              {scanning ? `Escaneando... ${Math.round(scanProgress)}%` : "Reescanear"}
            </Button>
          </motion.div>

          {/* Manual Entry Button */}
          {onManualEntry && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onManualEntry}
                variant="outline"
                className="bg-[var(--bg-surface-light)] border-[var(--border-color)] hover:bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Manual
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2 z-20">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
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
          <SelectTrigger className="bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
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
          <SelectTrigger className="bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
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
          <SelectTrigger className="bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
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
          <SelectTrigger className="bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]">
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
            "w-full",
            localOnly
              ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
              : "bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)]",
          )}
        >
          Somente Arquivo Local
        </Button>
      </div>

      {/* Animated Tabs */}
      <div className="flex items-center gap-3">
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
          <motion.div key={tab.key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="lg"
              onClick={async () => {
                setActiveTab(tab.key as any);
                await userActionService.saveTabView(tab.key);
              }}
              className={cn(
                "relative",
                activeTab === tab.key
                  ? "bg-gradient-to-r from-[var(--color-primary)] to-amber-500 text-[var(--color-on-primary)] shadow-lg"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-light)]",
              )}
            >
              {tab.icon && <tab.icon className="w-4 h-4 mr-2" />}
              {tab.label} ({tab.count})
              {activeTab === tab.key && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                  layoutId="activeTab"
                  transition={{ type: "spring", damping: 20 }}
                />
              )}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
