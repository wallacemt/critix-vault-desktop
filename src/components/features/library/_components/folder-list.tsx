import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Folder } from "@/types";
import { motion } from "framer-motion";
import { Folder as FolderIcon, X } from "lucide-react";
import { watchHistoryService } from "@/services/watchHistoryService";
import { tauriService } from "@/services/tauri";
import { useEffect, useState } from "react";

interface FolderListProps {
  folders: Folder[];
  selectedFolder: Folder;
  handleFolderSelect: (folder: Folder) => void;
  removeFolder: (id: string) => void;
}
export function FolderList({ folders, selectedFolder, handleFolderSelect, removeFolder }: FolderListProps) {
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});

  // Calculate unwatched media count for each folder
  useEffect(() => {
    const calculateCounts = async () => {
      const counts: Record<string, number> = {};
      const allMovies = await tauriService.getMovies();
      const allSeries = await tauriService.getSeries();

      for (const folder of folders) {
        const folderMovies = allMovies.filter((m) => m.folderId === folder.id);
        const folderSeries = allSeries.filter((s) => s.folderId === folder.id);

        // Count only unwatched movies
        const unwatchedMovies = folderMovies.filter((m) => !watchHistoryService.isMovieWatched(m.id));

        counts[folder.id] = unwatchedMovies.length + folderSeries.length;
      }

      setFolderCounts(counts);
    };

    if (folders.length > 0) {
      calculateCounts();
    }
  }, [folders]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* Folders List */}
      <div className="p-4 space-y-2">
        {folders.length === 0 ? (
          <motion.div className="p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <FolderIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)] font-sans">Nenhuma pasta adicionada</p>
          </motion.div>
        ) : (
          folders.map((folder, index) => (
            <div>
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
                  <FolderIcon className="w-5 h-5 text-[var(--color-primary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate font-display">
                    {folder.name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate font-sans">
                    {folderCounts[folder.id] ?? folder.mediaCount} itens
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
