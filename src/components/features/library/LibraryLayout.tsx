/**
 * Premium Library Layout Component
 * Main layout with animated sidebar, view modes, and premium UX
 */

"use client";
import { ArrowUp, Folder, Scan } from "lucide-react";
import { Media } from "@/types/media";
import { StreamingGrid } from "./_components/streaming-grid";
import { MediaGridSkeleton } from "@/components/ui/media-skeleton";
import { InlineError } from "@/components/ui/error-state";
import { motion, AnimatePresence } from "framer-motion";
import { EditMediaModal } from "@/components/ui/edit-media-modal";
import { NewMediaNotification } from "@/components/features/library/_components/new-media-notification";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ManualMediaEntryDialog } from "@/components/features/library/_components/manual-media-entry-dialog";
import { DeleteMediaDialog } from "@/components/features/library/_components/delete-media-dialog";
import { useLibraryLeyout } from "@/hooks/useLibraryLeyout";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { FolderMediaHeader } from "./_components/folder-media-header";
import { tauriService } from "@/services/tauri";
import { BulkActionsBar } from "./_components/BulkActionsBar";
import { useCallback, useEffect, useRef, useState } from "react";

interface LibraryLayoutProps {
  onAddFolder: () => void;
  onMediaClick: (media: Media) => void;
  onMediaPlay: (media: Media) => void;
}

export function LibraryLayout({ onAddFolder, onMediaClick, onMediaPlay }: LibraryLayoutProps) {
  const {
    folders,
    selectedFolder,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    yearRange,
    setYearRange,
    ratingRange,
    setRatingRange,
    durationRange,
    setDurationRange,
    watchedMonthFilter,
    watchedMonthOptions,
    setWatchedMonthFilter,
    localOnly,
    setLocalOnly,
    filteredMedia,
    handleFolderSelect,
    handleEditMedia,
    handleUpdateMedia,
    handleManualEntrySuccess,
    isAutoScanning,
    viewMode,
    setViewMode,
    scanFolder,
    scanning,
    scanProgress,
    totalCount,
    watchedMovies,
    setShowManualEntry,
    removeFolder,
    unwatchedMovies,
    watchedSeries,
    unwatchedSeries,

    loading,
    error,
    newMediaNotification,
    editingMedia,
    setEditingMedia,
    selectedMediaIds,
    selectedCount,
    toggleMediaSelection,
    clearSelection,
    bulkMarkSelectedAsWatched,
    bulkDeleteSelectedMedia,
    bulkSelectionAllWatched,
    filterPresets,
    saveFilterPreset,
    applyFilterPreset,
    deleteFilterPreset,

    showManualEntry,
    setNewMediaNotification,
    handleDeleteMedia,
    handleConfirmDelete,
    handleCancelDelete,
    deletingMedia,
    isDeletingMedia,
  } = useLibraryLeyout();
  useEffect(() => {
    if (selectedCount === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCount, clearSelection]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // selectedFolder is a dependency: the scroll container only mounts when a folder is selected,
  // so the ref is null on first render — re-running when folder changes attaches the listener correctly.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 100);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [selectedFolder]);

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  // Refs: direct DOM manipulation avoids React re-renders during drag
  const selRectEl = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number } | null>(null);
  const isDragging = useRef(false);
  const media = filteredMedia();
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !toggleMediaSelection) return;

      const target = e.target as HTMLElement;
      // Don't initiate rubber-band from inside a card — right-click handles that
      if (target.closest("[data-media-id]")) return;
      // Don't initiate from interactive elements
      if (target.closest('button, a, input, [role="button"]')) return;

      e.preventDefault();
      dragState.current = { startX: e.clientX, startY: e.clientY };
      isDragging.current = false;

      // Disable text selection for the entire drag
      document.body.style.userSelect = "none";

      const handleMove = (ev: MouseEvent) => {
        if (!dragState.current || !selRectEl.current) return;

        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;

        // Only enter drag mode after 5px movement
        if (!isDragging.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        isDragging.current = true;

        // Direct DOM update — no React setState, no re-render
        const el = selRectEl.current;
        el.style.display = "block";
        el.style.left = `${Math.min(dragState.current.startX, ev.clientX)}px`;
        el.style.top = `${Math.min(dragState.current.startY, ev.clientY)}px`;
        el.style.width = `${Math.abs(dx)}px`;
        el.style.height = `${Math.abs(dy)}px`;
      };

      const handleUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);

        // Restore text selection
        document.body.style.userSelect = "";

        // Hide rect
        if (selRectEl.current) selRectEl.current.style.display = "none";

        if (!isDragging.current || !dragState.current) {
          dragState.current = null;
          isDragging.current = false;
          return;
        }

        const selX = Math.min(dragState.current.startX, ev.clientX);
        const selY = Math.min(dragState.current.startY, ev.clientY);
        const selW = Math.abs(ev.clientX - dragState.current.startX);
        const selH = Math.abs(ev.clientY - dragState.current.startY);

        // Select all cards whose bounding box intersects the selection rect
        if (selW > 5 || selH > 5) {
          document.querySelectorAll("[data-media-id]").forEach((el) => {
            const rect = el.getBoundingClientRect();
            const intersects =
              rect.right > selX && rect.left < selX + selW && rect.bottom > selY && rect.top < selY + selH;

            if (!intersects) return;
            const mediaId = el.getAttribute("data-media-id");
            const found = media.find((m) => m.id === mediaId);
            if (found && !selectedMediaIds?.has(found.id)) {
              toggleMediaSelection(found.id);
            }
          });
        }

        dragState.current = null;
        isDragging.current = false;
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [media, toggleMediaSelection, selectedMediaIds],
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        {...{
          onAddFolder,
          folders,
          selectedFolder,
          handleFolderSelect,

          removeFolder,
        }}
      />

      {/* Main Content with SidebarInset */}
      <SidebarInset className="flex-1 flex flex-col overflow-x-hidden">
        {selectedFolder ? (
          <motion.div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <FolderMediaHeader
              {...{
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
                setStatusFilter,
                typeFilter,
                setTypeFilter,
                yearRange,
                setYearRange,
                ratingRange,
                setRatingRange,
                durationRange,
                setDurationRange,
                watchedMonthFilter,
                watchedMonthOptions,
                setWatchedMonthFilter,
                localOnly,
                setLocalOnly,
                totalCount,
                unwatchedMoviesCount: unwatchedMovies.length,
                watchedMoviesCount: watchedMovies.length,
                seriesCount: unwatchedSeries.length,
                watchedSeriesCount: watchedSeries.length,

                filterPresets,
                onSaveFilterPreset: saveFilterPreset,
                onApplyFilterPreset: applyFilterPreset,
                onDeleteFilterPreset: deleteFilterPreset,
                onManualEntry: () => setShowManualEntry(true),
                onOpenFolder: async () => {
                  if (selectedFolder) {
                    try {
                      console.log(selectedFolder);
                      await tauriService.openFileLocation(selectedFolder.path);
                    } catch (error) {
                      console.error("Error opening folder:", error);
                      alert(`Erro ao abrir pasta: ${error}`);
                    }
                  }
                },
              }}
            />

            {/* Content Area */}
            <div className="flex-1 p-2">
              {/* Selection rectangle — hidden by default, updated via direct DOM style */}
              <div
                ref={selRectEl}
                style={{ display: "none", position: "fixed", pointerEvents: "none", zIndex: 5 }}
                className="border-2 border-amber-400 bg-amber-400/10 rounded-sm"
              />
              <div className="p-4 pb-24">
                <AnimatePresence mode="wait">
                  {scanning && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40 flex flex-col items-center justify-center py-20 backdrop-blur-xs bg-[var(--bg-surface)]/50"
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
                  )}
                  {loading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <MediaGridSkeleton count={12} />
                    </motion.div>
                  )}
                  {error ? (
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
                        onMediaEdit={handleEditMedia}
                        onMediaDelete={handleDeleteMedia}
                        selectedMediaIds={selectedMediaIds}
                        onToggleMediaSelection={toggleMediaSelection}
                        viewMode={viewMode}
                        handleMouseDown={handleMouseDown}
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
        {/* Bulk actions bar — fixed floating, outside animated container to avoid transform stacking context */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <BulkActionsBar
              selectedCount={selectedCount}
              onClearSelection={clearSelection}
              onMarkWatched={bulkMarkSelectedAsWatched}
              onDelete={bulkDeleteSelectedMedia}
              allWatched={bulkSelectionAllWatched}
            />
          )}
        </AnimatePresence>

        {/* Scroll to top — appears after scrolling 300px */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              onClick={scrollToTop}
              className=" fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_6px_20px_rgba(0,0,0,0.35)] hover:brightness-110"
              aria-label="Voltar ao topo"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
        {/* New Media Notification */}
        {newMediaNotification && (
          <NewMediaNotification
            isOpen={!!newMediaNotification}
            onClose={() => setNewMediaNotification(null)}
            movies={newMediaNotification.movies}
            series={newMediaNotification.series}
          />
        )}

        {/* Auto-scanning indicator */}
        {isAutoScanning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-40 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Scan className="h-4 w-4 animate-spin" />
            <span className="font-medium">Scanning for new media...</span>
          </motion.div>
        )}

        {/* Edit Media Modal */}
        {editingMedia && (
          <EditMediaModal
            isOpen={!!editingMedia}
            onClose={() => setEditingMedia(null)}
            currentMedia={{
              title: editingMedia.title,
              type: editingMedia.type === "MOVIE" ? "MOVIE" : "SERIES",
            }}
            onSelectMedia={handleUpdateMedia}
          />
        )}

        {/* Manual Media Entry Dialog */}
        {selectedFolder && (
          <ManualMediaEntryDialog
            isOpen={showManualEntry}
            onClose={() => setShowManualEntry(false)}
            onSuccess={handleManualEntrySuccess}
            folderId={selectedFolder.id}
            folderPath={selectedFolder.path}
          />
        )}

        {/* Delete Media Confirmation Dialog */}
        <DeleteMediaDialog
          isOpen={!!deletingMedia}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          media={deletingMedia}
          isDeleting={isDeletingMedia}
        />
      </SidebarInset>

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
        .custom-scrollbar::-webkit-scrollbar:hover {
          background: var(--color-primary);
        }
      `}</style>
    </SidebarProvider>
  );
}
