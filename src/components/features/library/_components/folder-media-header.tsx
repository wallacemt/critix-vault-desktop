import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Folder } from "@/types";
import { motion } from "framer-motion";
import { Film, Grid3x3, List, Scan, Search, Tv, Plus, CheckCircleIcon } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

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
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setActiveTab: Dispatch<SetStateAction<"all" | "movies" | "series" | "watched">>;
  setViewMode: Dispatch<SetStateAction<"grid" | "list">>;
  scanFolder: (folderPath: string) => Promise<void>;
  onScanWithPreview?: () => void;
  onManualEntry?: () => void;
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
  totalCount,
  unwatchedMoviesCount,
  watchedMoviesCount,
  seriesCount,
  onScanWithPreview,
  onManualEntry,
}: FolderMediaHeaderProps) {
  return (
    <div className="fixed backdrop-blur-lg z-5  w-full bg-gradient-to-b from-[var(--bg-surface)] to-transparent border-b border-[var(--border-color)] p-6">
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

      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <motion.h1
            className="text-3xl font-bold text-[var(--text-primary)] mb-2 font-display"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {"/" + selectedFolder.name}
          </motion.h1>
          <motion.p
            className="text-sm text-[var(--text-secondary)] font-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {selectedFolder.path}
          </motion.p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4  flex  items-center gap-4">
        <SidebarTrigger className="z-20" />
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <Input
            type="text"
            placeholder="Buscar na biblioteca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="flex gap-4 items-center  justify-center z-30">
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

      {/* Animated Tabs */}
      <div className="flex items-center gap-3">
        {[
          { key: "all", label: "Tudo", icon: null, count: totalCount },
          { key: "movies", label: "Filmes", icon: Film, count: unwatchedMoviesCount },
          { key: "series", label: "Séries", icon: Tv, count: seriesCount },
          {
            key: "watched",
            label: "Assitidos",
            icon: CheckCircleIcon,
            count: watchedMoviesCount,
          },
        ].map((tab) => (
          <motion.div key={tab.key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="lg"
              onClick={() => setActiveTab(tab.key as any)}
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
