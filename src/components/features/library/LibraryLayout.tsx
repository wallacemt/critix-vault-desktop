/**
 * Premium Library Layout Component
 * Main layout with animated sidebar, view modes, and premium UX
 */

"use client";
import { Button } from "@/components/ui/button";
import { Folder, FolderPlus, Scan, Settings, Home, CircleHelp } from "lucide-react";
import { Media } from "@/types/media";
import { StreamingGrid } from "./_components/streaming-grid";
import { MediaGridSkeleton } from "@/components/ui/media-skeleton";
import { InlineError } from "@/components/ui/error-state";
import { motion, AnimatePresence } from "framer-motion";

import { FolderList } from "./_components/folder-list";
import { FolderMediaHeader } from "./_components/folder-media-header";
import { EditMediaModal } from "@/components/ui/edit-media-modal";
import { NewMediaNotification } from "@/components/features/library/_components/new-media-notification";
import Link from "next/link";
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
} from "@/components/ui/sidebar";
import { ScanPreviewDialog } from "@/components/features/library/_components/scan-preview-dialog";
import { ManualMediaEntryDialog } from "@/components/features/library/_components/manual-media-entry-dialog";
import { DeleteMediaDialog } from "@/components/features/library/_components/delete-media-dialog";
import { useLibraryLeyout } from "@/hooks/useLibraryLeyout";

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
      <Sidebar variant="floating" collapsible="offcanvas" className="border-r border-[var(--border-color)]">
        <SidebarHeader className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-display mb-4">Biblioteca</h2>
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
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-[var(--text-secondary)] px-4 py-2">
              Pastas Monitoradas
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <FolderList
                folders={folders}
                handleFolderSelect={handleFolderSelect}
                selectedFolder={selectedFolder!}
                removeFolder={removeFolder}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {/* Footer Stats */}
          {unwatchedMovies.length + unwatchedSeries.length > 0 && (
            <motion.div
              className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface-light)]/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)] font-display">{unwatchedMovies.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] font-sans">Filmes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)] font-display">{unwatchedSeries.length}</p>
                  <p className="text-xs text-[var(--text-secondary)] font-sans">Séries</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Settings Link */}
          <SidebarSeparator />
          <div className="p-4 space-y-1">
            <Link href="/landing?home=true">
              <Button
                variant="ghost"
                className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-light)]"
              >
                <Home className="w-4 h-4 mr-2" />
                Início
              </Button>
            </Link>
            <Link href="/settings">
              <Button
                variant="ghost"
                className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-light)]"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
            </Link>
            <Link href="/help">
              <Button
                variant="ghost"
                className="w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-light)]"
              >
                <CircleHelp className="w-4 h-4 mr-2" />
                Ajuda e FAQ
              </Button>
            </Link>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content with SidebarInset */}
      <SidebarInset className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
        {selectedFolder ? (
          <motion.div
            className="flex-1 flex flex-col"
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
                      const { openPath } = await import("@tauri-apps/plugin-opener");
                      await openPath(selectedFolder.path);
                    } catch (e) {
                      console.error("Failed to open folder:", e);
                    }
                  }
                },
              }}
            />
            {/* Content Area */}
            <div className="flex-1 mt-62 overflow-y-auto custom-scrollbar">
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {scanning && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20 inset-0 fixed z-1  backdrop-blur-xs bg-[var(--bg-surface)]/50"
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
            className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
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
