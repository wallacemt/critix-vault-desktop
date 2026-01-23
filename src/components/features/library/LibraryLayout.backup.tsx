/**
 * Library Layout Component
 * Main layout with sidebar and content area
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Folder, FolderPlus, X, Loader2, Film, Tv, AlertCircle } from "lucide-react";
import { Folder as FolderType, Media } from "@/types";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { StreamingGrid } from "./_components/streaming-grid";
import { cn } from "@/lib/utils";

interface LibraryLayoutProps {
  folders: FolderType[];
  onAddFolder: () => void;
  onRemoveFolder: (folderId: string) => void;
  onMediaClick: (media: Media) => void;
  onMediaPlay: (media: Media) => void;
}

export function LibraryLayout({ folders, onAddFolder, onRemoveFolder, onMediaClick, onMediaPlay }: LibraryLayoutProps) {
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(folders[0] || null);
  const [activeTab, setActiveTab] = useState<"all" | "movies" | "series">("all");

  const { movies, series, loading, error, scanFolder } = useMediaLibrary(selectedFolder?.id || null);

  const handleFolderSelect = async (folder: FolderType) => {
    setSelectedFolder(folder);
    setActiveTab("all");
    await scanFolder(folder.path);
  };

  const filteredMedia = () => {
    const allMedia: Media[] = [...movies, ...series];
    switch (activeTab) {
      case "movies":
        return movies;
      case "series":
        return series;
      default:
        return allMedia;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-2">Library</h2>
          <Button
            onClick={onAddFolder}
            size="sm"
            variant="outline"
            className="w-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Folder
          </Button>
        </div>

        {/* Folders List */}
        <div className="flex-1 overflow-auto">
          <div className="p-2 space-y-1">
            {folders.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No folders added yet</div>
            ) : (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                    selectedFolder?.id === folder.id ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300",
                  )}
                  onClick={() => handleFolderSelect(folder)}
                >
                  <Folder className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{folder.name}</p>
                    <p className="text-xs opacity-70 truncate">{folder.mediaCount} items</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFolder(folder.id);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">Critix Vault v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedFolder ? (
          <>
            {/* Header */}
            <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">{selectedFolder.name}</h1>
                  <p className="text-sm text-slate-400">{selectedFolder.path}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("all")}
                  className={cn(activeTab === "all" && "bg-blue-600 hover:bg-blue-700")}
                >
                  All ({movies.length + series.length})
                </Button>
                <Button
                  variant={activeTab === "movies" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("movies")}
                  className={cn(activeTab === "movies" && "bg-blue-600 hover:bg-blue-700")}
                >
                  <Film className="w-4 h-4 mr-1" />
                  Movies ({movies.length})
                </Button>
                <Button
                  variant={activeTab === "series" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("series")}
                  className={cn(activeTab === "series" && "bg-blue-600 hover:bg-blue-700")}
                >
                  <Tv className="w-4 h-4 mr-1" />
                  Series ({series.length})
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-400">Scanning folder...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-400 mb-2">Failed to load media</p>
                    <p className="text-sm text-slate-500">{error}</p>
                  </div>
                ) : (
                  <StreamingGrid
                    media={filteredMedia()}
                    onMediaClick={onMediaClick}
                    onMediaPlay={onMediaPlay}
                    emptyMessage={activeTab === "all" ? "No media found in this folder" : `No ${activeTab} found`}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Folder className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a folder to view media</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
