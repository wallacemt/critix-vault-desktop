/**
 * Premium Library Layout Component
 * Main layout with animated sidebar, view modes, and premium UX
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Folder, FolderPlus, X, Film, Tv, AlertCircle, Scan, Grid3x3, List, Search } from "lucide-react";
import { Media } from "@/types";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { useFoldersContext } from "@/context/foldersContext";
import { StreamingGrid } from "./_components/streaming-grid-premium";
import { MediaGridSkeleton } from "@/components/ui/media-skeleton";
import { InlineError } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { Input } from "@/components/ui/input";

interface LibraryLayoutProps {
  onAddFolder: () => void;
  onMediaClick: (media: Media) => void;
  onMediaPlay: (media: Media) => void;
}

export function LibraryLayout({ onAddFolder, onMediaClick, onMediaPlay }: LibraryLayoutProps) {
  const { folders, selectedFolder, selectFolder, removeFolder } = useFoldersContext();
  const [activeTab, setActiveTab] = useState<"all" | "movies" | "series">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const { movies, series, loading, error, scanning, scanProgress, scanFolder } = useMediaLibrary(
    selectedFolder?.id || null,
  );

  // Debug log
  useEffect(() => {
    console.log("📚 LibraryLayout - Folders:", folders);
    console.log("📚 LibraryLayout - Selected Folder:", selectedFolder);
  }, [folders, selectedFolder]);

  useEffect(() => {
    gsap.from(".folder-item", {
      x: -30,
      opacity: 0,
      stagger: 0.1,
      duration: 0.5,
      ease: "power2.out",
    });
  }, [folders]);

  const handleFolderSelect = (folder: typeof selectedFolder) => {
    selectFolder(folder);
    setActiveTab("all");
    setSearchQuery("");
  };

  const filteredMedia = () => {
    let allMedia: Media[] = [];

    switch (activeTab) {
      case "movies":
        allMedia = movies;
        break;
      case "series":
        allMedia = series;
        break;
      default:
        allMedia = [...movies, ...series];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allMedia = allMedia.filter(
        (media) => media.title.toLowerCase().includes(query) || media.originalTitle?.toLowerCase().includes(query),
      );
    }

    return allMedia;
  };

  const totalCount = movies.length + series.length;

  return (
    <div className="flex h-screen bg-[var(--bg-body)] overflow-hidden">
      {/* Animated Sidebar */}
      <motion.aside
        className="w-72 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col backdrop-blur-xl"
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 font-display">Biblioteca</h2>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onAddFolder}
              size="lg"
              className="w-full bg-gradient-to-r from-[var(--color-primary)] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-[var(--color-on-primary)] font-semibold shadow-lg"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Adicionar Pasta
            </Button>
          </motion.div>
        </div>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-2">
            {folders.length === 0 ? (
              <motion.div className="p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Folder className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)] font-sans">Nenhuma pasta adicionada</p>
              </motion.div>
            ) : (
              folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  className="folder-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div
                    className={cn(
                      "group flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden",
                      selectedFolder?.id === folder.id
                        ? "bg-gradient-to-r from-[var(--color-primary)]/20 to-amber-500/20 border border-[var(--color-primary)]/30"
                        : "hover:bg-[var(--bg-surface-light)] border border-transparent",
                    )}
                    onClick={() => handleFolderSelect(folder)}
                  >
                    {selectedFolder?.id === folder.id && (
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--color-primary)] to-amber-500"
                        layoutId="selected-folder"
                        transition={{ type: "spring", damping: 20 }}
                      />
                    )}

                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                      <Folder className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate font-display">
                        {folder.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate font-sans">
                        {folder.mediaCount} itens
                      </p>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFolder(folder.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Footer Stats */}
        {movies.length + series.length > 0 && (
          <motion.div
            className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-surface-light)]/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)] font-display">{movies.length}</p>
                <p className="text-xs text-[var(--text-secondary)] font-sans">Filmes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)] font-display">{series.length}</p>
                <p className="text-xs text-[var(--text-secondary)] font-sans">Séries</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedFolder ? (
          <motion.div
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header with Gradient */}
            <div className="relative bg-gradient-to-b from-[var(--bg-surface)] to-transparent border-b border-[var(--border-color)] p-6">
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

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <motion.h1
                      className="text-3xl font-bold text-[var(--text-primary)] mb-2 font-display"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {selectedFolder.name}
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

                  <div className="flex gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex gap-1 bg-[var(--bg-surface-light)] rounded-lg p-1">
                      <Button
                        size="icon"
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          viewMode === "grid" && "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
                        )}
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={viewMode === "list" ? "default" : "ghost"}
                        onClick={() => setViewMode("list")}
                        className={cn(
                          viewMode === "list" && "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
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
                        className="bg-[var(--bg-surface-light)] border-[var(--border-color)] hover:bg-[var(--bg-surface-light)] hover:border-[var(--color-primary)]"
                      >
                        <Scan className={cn("w-4 h-4 mr-2", scanning && "animate-spin")} />
                        {scanning ? `Escaneando... ${Math.round(scanProgress)}%` : "Reescanear"}
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <Input
                      type="text"
                      placeholder="Buscar na biblioteca..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[var(--bg-surface-light)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>

                {/* Animated Tabs */}
                <div className="flex gap-3">
                  {[
                    { key: "all", label: "Tudo", icon: null, count: totalCount },
                    { key: "movies", label: "Filmes", icon: Film, count: movies.length },
                    { key: "series", label: "Séries", icon: Tv, count: series.length },
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
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {scanning ? (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mb-6">
                        <Scan className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">
                        Escaneando pasta...
                      </h3>
                      <p className="text-[var(--text-secondary)] mb-4 font-sans">
                        {Math.round(scanProgress)}% concluído
                      </p>
                      <div className="w-64 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[var(--color-primary)] to-amber-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${scanProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  ) : loading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <MediaGridSkeleton count={12} />
                    </motion.div>
                  ) : error ? (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <InlineError message={error} onRetry={() => scanFolder(selectedFolder.path)} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <StreamingGrid
                        media={filteredMedia()}
                        onMediaClick={onMediaClick}
                        onMediaPlay={onMediaPlay}
                        viewMode={viewMode}
                        emptyMessage={
                          searchQuery
                            ? `Nenhum resultado para "${searchQuery}"`
                            : activeTab === "all"
                              ? "Nenhuma mídia encontrada nesta pasta"
                              : `Nenhum(a) ${activeTab === "movies" ? "filme" : "série"} encontrado(a)`
                        }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="flex-1 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <motion.div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Folder className="w-16 h-16 text-[var(--text-muted)]" />
              </motion.div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-display">Selecione uma pasta</h3>
              <p className="text-[var(--text-secondary)] font-sans">
                Escolha uma pasta na barra lateral para visualizar seu conteúdo
              </p>
            </div>
          </motion.div>
        )}
      </main>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--bg-body);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--bg-surface-light);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
