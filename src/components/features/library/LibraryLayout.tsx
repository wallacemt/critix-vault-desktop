/**
 * Premium Library Layout Component
 * Main layout with animated sidebar, view modes, and premium UX
 */

"use client";
import { Folder, Scan } from "lucide-react";
import { Media } from "@/types/media";
import { StreamingGrid } from "./_components/streaming-grid";
import { MediaGridSkeleton } from "@/components/ui/media-skeleton";
import { InlineError } from "@/components/ui/error-state";
import { motion, AnimatePresence } from "framer-motion";
import { EditMediaModal } from "@/components/ui/edit-media-modal";
import { NewMediaNotification } from "@/components/features/library/_components/new-media-notification";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScanPreviewDialog } from "@/components/features/library/_components/scan-preview-dialog";
import { ManualMediaEntryDialog } from "@/components/features/library/_components/manual-media-entry-dialog";
import { DeleteMediaDialog } from "@/components/features/library/_components/delete-media-dialog";
import { useLibraryLeyout } from "@/hooks/useLibraryLeyout";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { FolderMediaHeader } from "./_components/folder-media-header";
import { tauriService } from "@/services/tauri";

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
    localOnly,
    setLocalOnly,
    filteredMedia,
    handleFolderSelect,
    handleEditMedia,
    handleUpdateMedia,
    handleScanWithPreview,
    handleConfirmScan,
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
    series,
    loading,
    error,
    newMediaNotification,
    editingMedia,
    setEditingMedia,
    showScanPreview,
    setShowScanPreview,
    folderPreviews,
    showManualEntry,
    setNewMediaNotification,
    handleDeleteMedia,
    handleConfirmDelete,
    handleCancelDelete,
    deletingMedia,
    isDeletingMedia,
  } = useLibraryLeyout();
  return (
    <SidebarProvider defaultOpen={true}>
      {/* ShadCN Sidebar */}
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
                localOnly,
                setLocalOnly,
                totalCount,
                unwatchedMoviesCount: unwatchedMovies.length,
                watchedMoviesCount: watchedMovies.length,
                seriesCount: unwatchedSeries.length,
                watchedSeriesCount: watchedSeries.length,
                onScanWithPreview: handleScanWithPreview,
                onManualEntry: () => setShowManualEntry(true),
                onOpenFolder: async () => {
                  if (selectedFolder) {
                    try {
                      console.log(selectedFolder)
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
            <div className="flex-1">
              <div className="p-6">
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

        {/* Scan Preview Dialog */}
        <ScanPreviewDialog
          isOpen={showScanPreview}
          onClose={() => setShowScanPreview(false)}
          onConfirm={handleConfirmScan}
          folders={folderPreviews}
        />

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
