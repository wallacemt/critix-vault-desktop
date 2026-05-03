import { useFoldersContext } from "@/context/foldersContext";
import { Media } from "@/types/media";
import { Movie } from "@/types/movie";
import { Series } from "@/types/serie";
import { useEffect, useMemo, useState } from "react";
import { useMediaLibrary } from "./useMediaLibrary";
import { FolderPreview } from "@/types/folder";
import gsap from "gsap";
import { AppTabs } from "@/types/utils";
import { useApiConnectivity } from "@/context/apiConnectivityContext";
import { useMediaSelection } from "./useMediaSelection";
import { markAsWatched, removeMovie, removeSeries, setSeriesEpisodesWatchStatus, clearWatchHistory } from "@/services/databaseService";

const FILTER_KEY = "critix_filter_last";
const PRESETS_KEY = "critix_filter_presets";

type FilterSnapshot = {
  sortBy: "modified" | "title" | "rating" | "duration" | "year";
  sortOrder: "asc" | "desc";
  statusFilter: "all" | "watched" | "unwatched";
  typeFilter: "all" | "movie" | "series" | "anime";
  yearRange: "all" | "before-2000" | "2000-2009" | "2010-2019" | "2020-plus";
  ratingRange: "all" | "8-plus" | "7-plus" | "6-plus";
  durationRange: "all" | "short" | "medium" | "long";
  localOnly: boolean;
  viewMode: "grid" | "list";
};

export type FilterPreset = FilterSnapshot & { name: string };

const FILTER_DEFAULTS: FilterSnapshot = {
  sortBy: "modified",
  sortOrder: "desc",
  statusFilter: "all",
  typeFilter: "all",
  yearRange: "all",
  ratingRange: "all",
  durationRange: "all",
  localOnly: false,
  viewMode: "grid",
};

function loadFilterSnapshot(): FilterSnapshot {
  if (typeof window === "undefined") return FILTER_DEFAULTS;
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return FILTER_DEFAULTS;
    return { ...FILTER_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return FILTER_DEFAULTS;
  }
}

function loadFilterPresets(): FilterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FilterPreset[];
  } catch {
    return [];
  }
}

export const useLibraryLeyout = () => {
  const { folders, selectedFolder, selectFolder, removeFolder } = useFoldersContext();
  const { isOnline } = useApiConnectivity();
  const { selectedMediaIds, selectedCount, isSelected, toggleMediaSelection, clearSelection } = useMediaSelection();
  const [activeTab, setActiveTab] = useState<AppTabs>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => loadFilterSnapshot().viewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"modified" | "title" | "rating" | "duration" | "year">(() => loadFilterSnapshot().sortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => loadFilterSnapshot().sortOrder);
  const [statusFilter, setStatusFilter] = useState<"all" | "watched" | "unwatched">(() => loadFilterSnapshot().statusFilter);
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "series" | "anime">(() => loadFilterSnapshot().typeFilter);
  const [yearRange, setYearRange] = useState<"all" | "before-2000" | "2000-2009" | "2010-2019" | "2020-plus">(() => loadFilterSnapshot().yearRange);
  const [ratingRange, setRatingRange] = useState<"all" | "8-plus" | "7-plus" | "6-plus">(() => loadFilterSnapshot().ratingRange);
  const [durationRange, setDurationRange] = useState<"all" | "short" | "medium" | "long">(() => loadFilterSnapshot().durationRange);
  const [watchedMonthFilter, setWatchedMonthFilter] = useState<string>("all");
  const [localOnly, setLocalOnly] = useState(() => loadFilterSnapshot().localOnly);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(() => loadFilterPresets());
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<Media | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [newMediaNotification, setNewMediaNotification] = useState<{ movies: Movie[]; series: Series[] } | null>(null);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [showScanPreview, setShowScanPreview] = useState(false);
  const [folderPreviews, setFolderPreviews] = useState<FolderPreview[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [historyRestored, setHistoryRestored] = useState(false);

  const { movies, series, loading, error, scanning, scanProgress, scanFolder, updateMedia, deleteMedia, refreshMedia } =
    useMediaLibrary(selectedFolder?.id || null);

  // Auto-persist filter state to localStorage whenever any filter value changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snap: FilterSnapshot = { sortBy, sortOrder, statusFilter, typeFilter, yearRange, ratingRange, durationRange, localOnly, viewMode };
    localStorage.setItem(FILTER_KEY, JSON.stringify(snap));
  }, [sortBy, sortOrder, statusFilter, typeFilter, yearRange, ratingRange, durationRange, localOnly, viewMode]);

  const saveFilterPreset = (name: string) => {
    const preset: FilterPreset = { name, sortBy, sortOrder, statusFilter, typeFilter, yearRange, ratingRange, durationRange, localOnly, viewMode };
    const updated = [...filterPresets.filter((p) => p.name !== name), preset];
    setFilterPresets(updated);
    if (typeof window !== "undefined") localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  };

  const applyFilterPreset = (name: string) => {
    const preset = filterPresets.find((p) => p.name === name);
    if (!preset) return;
    setSortBy(preset.sortBy);
    setSortOrder(preset.sortOrder);
    setStatusFilter(preset.statusFilter);
    setTypeFilter(preset.typeFilter);
    setYearRange(preset.yearRange);
    setRatingRange(preset.ratingRange);
    setDurationRange(preset.durationRange);
    setLocalOnly(preset.localOnly);
    setViewMode(preset.viewMode);
  };

  const deleteFilterPreset = (name: string) => {
    const updated = filterPresets.filter((p) => p.name !== name);
    setFilterPresets(updated);
    if (typeof window !== "undefined") localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  };

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
        if (lastTab) {
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

  const handleDeleteMedia = (media: Media) => {
    setDeletingMedia(media);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMedia) return;
    setIsDeletingMedia(true);
    try {
      await deleteMedia(deletingMedia);
      setDeletingMedia(null);
    } catch (error) {
      console.error("Failed to delete media:", error);
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingMedia(null);
  };

  const handleUpdateMedia = async (mediaId: string, mediaType: "movie" | "tv") => {
    if (!editingMedia) return;

    await updateMedia(editingMedia, mediaId, mediaType);
    setEditingMedia(null);
  };

  const handleConfirmScan = async (selectedPaths: string[]) => {
    if (!isOnline) {
      alert("Modo offline ativo. Reconecte para executar scans com API externa.");
      return;
    }

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

  const watchedMonthOptions = useMemo(() => {
    const months = new Map<string, string>();

    [...movies, ...series]
      .filter((media) => media.isWatched && media.lastWatchedAt)
      .forEach((media) => {
        const watchedDate = new Date(media.lastWatchedAt as string);
        if (!Number.isFinite(watchedDate.getTime())) return;

        const value = `${watchedDate.getFullYear()}-${String(watchedDate.getMonth() + 1).padStart(2, "0")}`;
        if (!months.has(value)) {
          const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(watchedDate);
          months.set(value, label.charAt(0).toUpperCase() + label.slice(1));
        }
      });

    return [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([value, label]) => ({ value, label }));
  }, [movies, series]);

  const filteredMedia = () => {
    let allMedia: Media[] = [];

    switch (activeTab) {
      case "movies":
        allMedia = movies.filter((media) => !media.isWatched);
        break;
      case "series":
        allMedia = series.filter((s) => !s.isWatched);
        break;
      case "watched":
        allMedia = [...movies.filter((media) => media.isWatched), ...series.filter((s) => s.isWatched)];
        break;
      default:
        allMedia = [...movies.filter((media) => !media.isWatched), ...series.filter((s) => !s.isWatched)];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allMedia = allMedia.filter(
        (media) => media.title.toLowerCase().includes(query) || media.originalTitle?.toLowerCase().includes(query),
      );
    }

    if (statusFilter === "watched") {
      allMedia = allMedia.filter((media) => media.isWatched);
    } else if (statusFilter === "unwatched") {
      allMedia = allMedia.filter((media) => !media.isWatched);
    }

    if (typeFilter !== "all") {
      const typeMap: Record<"all" | "movie" | "series" | "anime", Media["type"] | null> = {
        all: null,
        movie: "MOVIE",
        series: "SERIES",
        anime: "ANIME",
      };

      const expectedType = typeMap[typeFilter];
      if (expectedType) {
        allMedia = allMedia.filter((media) => media.type === expectedType);
      }
    }

    if (yearRange !== "all") {
      allMedia = allMedia.filter((media) => {
        const year = media.year || 0;
        switch (yearRange) {
          case "before-2000":
            return year > 0 && year < 2000;
          case "2000-2009":
            return year >= 2000 && year <= 2009;
          case "2010-2019":
            return year >= 2010 && year <= 2019;
          case "2020-plus":
            return year >= 2020;
          default:
            return true;
        }
      });
    }

    if (ratingRange !== "all") {
      allMedia = allMedia.filter((media) => {
        const rating = media.rating || 0;
        switch (ratingRange) {
          case "8-plus":
            return rating >= 8;
          case "7-plus":
            return rating >= 7;
          case "6-plus":
            return rating >= 6;
          default:
            return true;
        }
      });
    }

    if (durationRange !== "all") {
      allMedia = allMedia.filter((media) => {
        const duration = media.duration || 0;
        switch (durationRange) {
          case "short":
            return duration > 0 && duration < 90;
          case "medium":
            return duration >= 90 && duration <= 150;
          case "long":
            return duration > 150;
          default:
            return true;
        }
      });
    }

    if (localOnly) {
      allMedia = allMedia.filter((media) => {
        if (media.type === "MOVIE") {
          return !!media.filePath && !media.filePath.includes("/demo/");
        }

        const mediaWithSeasons = media as Series;
        return mediaWithSeasons.seasons?.some((season) =>
          season.episodes?.some((episode) => !!episode.filePath && !episode.filePath.includes("/demo/")),
        );
      });
    }

    if (activeTab === "watched" && watchedMonthFilter !== "all") {
      allMedia = allMedia.filter((media) => {
        if (!media.lastWatchedAt) return false;

        const watchedDate = new Date(media.lastWatchedAt);
        if (!Number.isFinite(watchedDate.getTime())) return false;

        const monthKey = `${watchedDate.getFullYear()}-${String(watchedDate.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === watchedMonthFilter;
      });
    }

    // Apply sorting
    allMedia.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortBy) {
        case "modified":
          compareA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          compareB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          break;
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
  const unwatchedSeries = series.filter((s) => !s.isWatched);
  const watchedSeries = series.filter((s) => s.isWatched);
  const totalCount = unwatchedMovies.length + unwatchedSeries.length;

  const bulkSelectionAllWatched = useMemo(() => {
    const selected = [...movies, ...series].filter((m) => selectedMediaIds.has(m.id));
    return selected.length > 0 && selected.every((m) => m.isWatched);
  }, [movies, series, selectedMediaIds]);

  const bulkMarkSelectedAsWatched = async () => {
    const selectedMedia = [...movies, ...series].filter((media) => selectedMediaIds.has(media.id));
    const targetWatched = !bulkSelectionAllWatched;

    for (const media of selectedMedia) {
      if (media.type === "MOVIE") {
        if (targetWatched && !media.isWatched) {
          await markAsWatched(media.id, "MOVIE");
        } else if (!targetWatched && media.isWatched) {
          await clearWatchHistory(media.id);
        }
        continue;
      }

      const seriesMedia = media as Series;
      const episodes = (seriesMedia.seasons || []).flatMap((season) =>
        (season.episodes || []).map((episode) => ({
          id: episode.id,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
        })),
      );

      if (episodes.length > 0) {
        await setSeriesEpisodesWatchStatus(media.id, episodes, targetWatched);
      }
    }

    clearSelection();
    await refreshMedia();
  };

  const bulkDeleteSelectedMedia = async () => {
    const selectedMedia = [...movies, ...series].filter((media) => selectedMediaIds.has(media.id));

    for (const media of selectedMedia) {
      if (media.type === "MOVIE") {
        await removeMovie(media.id);
      } else {
        await removeSeries(media.id);
      }
    }

    clearSelection();
    await refreshMedia();
  };


  

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
    setWatchedMonthFilter,
    watchedMonthOptions,
    localOnly,
    setLocalOnly,
    filteredMedia,
    handleFolderSelect,
    handleEditMedia,
    handleDeleteMedia,
    handleConfirmDelete,
    handleCancelDelete,
    deletingMedia,
    isDeletingMedia,
    handleUpdateMedia,
    handleConfirmScan,
    handleManualEntrySuccess,
    isAutoScanning,
    setIsAutoScanning,
    removeFolder,
    unwatchedMovies,
    watchedMovies,
    unwatchedSeries,
    watchedSeries,
    series,
    viewMode,
    setViewMode,
    scanFolder,
    scanning,
    scanProgress,
    totalCount,
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
    selectedMediaIds,
    selectedCount,
    isSelected,
    toggleMediaSelection,
    clearSelection,
    bulkMarkSelectedAsWatched,
    bulkDeleteSelectedMedia,
    bulkSelectionAllWatched,
    filterPresets,
    saveFilterPreset,
    applyFilterPreset,
    deleteFilterPreset,
  };
};
