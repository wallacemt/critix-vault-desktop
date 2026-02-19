import { useFoldersContext } from "@/context/foldersContext";
import { Media } from "@/types/media";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { useEffect, useState } from "react";
import { useMediaLibrary } from "./useMediaLibrary";
import { folderScanService } from "@/services/folderScanService";
import { FolderPreview } from "@/types/folder";
import gsap from "gsap";
import { AppTabs } from "@/types/utils";
export const useLibraryLeyout = () => {
  const { folders, selectedFolder, selectFolder, removeFolder } = useFoldersContext();
  const [activeTab, setActiveTab] = useState<AppTabs>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "rating" | "duration" | "year">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [newMediaNotification, setNewMediaNotification] = useState<{ movies: Movie[]; series: Series[] } | null>(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [showScanPreview, setShowScanPreview] = useState(false);
  const [folderPreviews, setFolderPreviews] = useState<FolderPreview[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [historyRestored, setHistoryRestored] = useState(false);

  const { movies, series, loading, error, scanning, scanProgress, scanFolder, updateMedia, refreshMedia } =
    useMediaLibrary(selectedFolder?.id || null);

  // Restore last viewed folder on mount
  useEffect(() => {
    const restoreHistory = async () => {
      if (historyRestored || !folders.length) return;

      try {
        const { userActionService } = await import("@/services/userActionService");
        const lastFolderId = await userActionService.getLastViewedFolder();
        const lastTab = await userActionService.getLastViewedTab();
        if (lastFolderId) {
          const folder = folders.find((f) => f.id === lastFolderId);
          if (folder) {
            console.log("🔄 Restoring last viewed folder:", folder.name);
            selectFolder(folder);
          }
        }
        if(lastTab){
          setActiveTab(lastTab as AppTabs);
        }
      } catch (error) {
        console.error("Failed to restore folder history:", error);
      } finally {
        setHistoryRestored(true);
      }
    };

    restoreHistory();
  }, [folders, historyRestored, selectFolder]);

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

  const handleFolderSelect = async (folder: typeof selectedFolder) => {
    selectFolder(folder);
    setActiveTab("all");
    setSearchQuery("");

    // Save folder view action
    if (folder) {
      try {
        const { userActionService } = await import("@/services/userActionService");
        await userActionService.saveFolderView(folder.id);
      } catch (error) {
        console.error("Failed to save folder view:", error);
      }
    }
  };

  const handleEditMedia = (media: Media) => {
    setEditingMedia(media);
  };

  const handleUpdateMedia = async (mediaId: string, mediaType: "movie" | "tv") => {
    if (!editingMedia) return;

    await updateMedia(editingMedia, mediaId, mediaType);
    setEditingMedia(null);
  };

  const handleScanWithPreview = async () => {
    if (!folders.length) return;

    // Generate preview for all folders
    const previews = await Promise.all(
      folders.map(async (folder) => {
        const preview = await folderScanService.previewFolder(folder.path);
        return {
          path: folder.path,
          name: folder.name,
          ...preview,
        };
      }),
    );

    setFolderPreviews(previews);
    setShowScanPreview(true);
  };

  const handleConfirmScan = async (selectedPaths: string[]) => {
    // Scan only selected folders
    for (const path of selectedPaths) {
      const folder = folders.find((f) => f.path === path);
      if (folder) {
        await scanFolder(folder.path);
      }
    }
    refreshMedia();
  };

  const handleManualEntrySuccess = () => {
    refreshMedia();
  };

  const filteredMedia = () => {
    let allMedia: Media[] = [];

    switch (activeTab) {
      case "movies":
        allMedia = movies.filter((media) => !media.isWatched);
        break;
      case "series":
        allMedia = series;
        break;
      case "watched":
        allMedia = movies.filter((media) => media.isWatched);
        break;
      default:
        allMedia = [...movies, ...series].filter((media) => !media.isWatched);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allMedia = allMedia.filter(
        (media) => media.title.toLowerCase().includes(query) || media.originalTitle?.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    allMedia.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortBy) {
        case "title":
          compareA = a.title.toLowerCase();
          compareB = b.title.toLowerCase();
          break;
        case "rating":
          compareA = a.rating || 0;
          compareB = b.rating || 0;
          break;
        case "duration":
          compareA = a.duration || 0;
          compareB = b.duration || 0;
          break;
        case "year":
          compareA = a.year || 0;
          compareB = b.year || 0;
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return allMedia;
  };

  // Count unwatched media
  const unwatchedMovies = movies.filter((movie) => !movie.isWatched);
  const watchedMovies = movies.filter((movie) => movie.isWatched);
  const totalCount = unwatchedMovies.length + series.length;

  return {
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
    setIsAutoScanning,
    removeFolder,
    unwatchedMovies,
    series,
    viewMode,
    setViewMode,
    scanFolder,
    scanning,
    scanProgress,
    totalCount,
    watchedMovies,
    setShowManualEntry,
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
  };
};
