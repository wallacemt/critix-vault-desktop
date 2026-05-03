import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Folder } from "@/types/folder";
import { motion } from "framer-motion";
import { Folder as FolderIcon, X } from "lucide-react";
import { getMovies, getSeries } from "@/services/databaseService";
import { useEffect, useState } from "react";
import { SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FolderListProps {
  folders: Folder[];
  selectedFolder: Folder;
  handleFolderSelect: (folder: Folder) => void;
  removeFolder: (id: string) => void;
}
export function FolderList({ folders, selectedFolder, handleFolderSelect, removeFolder }: FolderListProps) {
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Calculate unwatched media count for each folder
  useEffect(() => {
    const calculateCounts = async () => {
      const counts: Record<string, number> = {};
      const allMovies = await getMovies();
      const allSeries = await getSeries();

      for (const folder of folders) {
        const folderMovies = allMovies.filter((m) => m.folderId === folder.id);
        const folderSeries = allSeries.filter((s) => s.folderId === folder.id);

        // Count only unwatched movies (isWatched property already loaded)
        const unwatchedMovies = folderMovies.filter((m) => !m.isWatched);

        counts[folder.id] = unwatchedMovies.length + folderSeries.length;
      }

      setFolderCounts(counts);
    };

    if (folders.length > 0) {
      calculateCounts();
    }
  }, [folders]);

  return (
    <SidebarMenuItem className="flex-1 overflow-y-auto custom-scrollbar">
      {/* Folders List */}
      <div className="p-4 space-y-2">
        {folders.length === 0 ? (
          <motion.div className="p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <FolderIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)] font-sans">Nenhuma pasta adicionada</p>
          </motion.div>
        ) : (
          folders.map((folder) => {
            const count = folderCounts[folder.id] ?? folder.mediaCount;

            const folderCard = (
              <div
                className={cn(
                  "group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl p-4 transition-all duration-300 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2",
                  selectedFolder?.id === folder.id
                    ? "border border-[var(--color-primary)]/30 bg-gradient-to-r from-[var(--color-primary)]/20 to-amber-500/20"
                    : "border border-transparent hover:bg-[var(--bg-surface-light)]",
                )}
                onClick={() => handleFolderSelect(folder)}
              >
                {selectedFolder?.id === folder.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-[var(--color-primary)] to-amber-500 group-data-[collapsible=icon]:hidden"
                    layoutId="selected-folder"
                    transition={{ type: "spring", damping: 20 }}
                  />
                )}

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20">
                  <FolderIcon className="h-5 w-5 text-[var(--color-primary)]" />
                </div>

                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate font-display text-sm font-semibold text-[var(--text-primary)]">
                    {folder.name}
                  </p>
                  <p className="truncate font-sans text-xs text-[var(--text-secondary)]">{count} itens</p>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100 group-data-[collapsible=icon]:hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFolder(folder.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );

            return (
              <div key={folder.id}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{folderCard}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {folder.name} ({count} itens)
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  folderCard
                )}
              </div>
            );
          })
        )}
      </div>
    </SidebarMenuItem>
  );
}
