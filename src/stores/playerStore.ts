import { create } from "zustand";

export interface PlayableItem {
  mediaId: string;
  episodeId?: string;
  title: string;
  filePath: string;
  mediaType: "MOVIE" | "SERIES";
  seasonNumber?: number;
  episodeNumber?: number;
  backdropUrl?: string;
}

export interface PendingPlay {
  item: PlayableItem;
  queue: PlayableItem[];
}

// Ephemeral state for an active external-player session (MKV / system player).
// Never persisted — lives only in Zustand for the duration of the session.
export interface ExternalSession {
  item: PlayableItem;
  queue: PlayableItem[];
  index: number;
  launchedAtMs: number;
  pauseStartMs: number | undefined;
  pausedAccumMs: number;
  isPaused: boolean;
  manualOffsetSeconds: number;
  runtimeSeconds: number | undefined;
}

interface PlayerState {
  // Embedded Vidstack player
  open: boolean;
  queue: PlayableItem[];
  index: number;
  positionSeconds: number;
  durationSeconds: number;
  activeAudioTrackId?: string;
  activeTextTrackId?: string;
  playbackRate: number;
  pendingPlay: PendingPlay | null;

  openMedia: (item: PlayableItem, queue?: PlayableItem[]) => void;
  closePlayer: () => void;
  advance: () => void;
  goTo: (index: number) => void;
  setPosition: (s: number) => void;
  setDuration: (s: number) => void;
  setAudioTrack: (id: string) => void;
  setTextTrack: (id: string | undefined) => void;
  setPlaybackRate: (rate: number) => void;
  setPendingPlay: (p: PendingPlay | null) => void;

  // External player (system OS / VLC)
  externalSession: ExternalSession | null;
  startExternal: (item: PlayableItem, queue?: PlayableItem[], runtimeSeconds?: number) => void;
  advanceExternal: () => void;
  closeExternal: () => void;
  toggleExternalPause: () => void;
  setExternalManualOffset: (seconds: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  open: false,
  queue: [],
  index: 0,
  positionSeconds: 0,
  durationSeconds: 0,
  playbackRate: 1,
  pendingPlay: null,
  externalSession: null,

  openMedia: (item, queue = []) => {
    const q = queue.length > 0 ? queue : [item];
    const idx = q.findIndex(
      (i) => i.mediaId === item.mediaId && i.episodeId === item.episodeId,
    );
    set({
      open: true,
      queue: q,
      index: Math.max(0, idx),
      positionSeconds: 0,
      durationSeconds: 0,
    });
  },

  closePlayer: () => set({ open: false, positionSeconds: 0 }),

  advance: () => {
    const { index, queue } = get();
    if (index + 1 < queue.length) {
      set({ index: index + 1, positionSeconds: 0, durationSeconds: 0 });
    } else {
      set({ open: false });
    }
  },

  goTo: (idx) => {
    const { queue } = get();
    const clamped = Math.max(0, Math.min(idx, queue.length - 1));
    set({ index: clamped, positionSeconds: 0, durationSeconds: 0 });
  },

  setPosition: (s) => set({ positionSeconds: s }),
  setDuration: (s) => set({ durationSeconds: s }),
  setAudioTrack: (id) => set({ activeAudioTrackId: id }),
  setTextTrack: (id) => set({ activeTextTrackId: id }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setPendingPlay: (p) => set({ pendingPlay: p }),

  startExternal: (item, queue = [], runtimeSeconds) => {
    const q = queue.length > 0 ? queue : [item];
    const idx = q.findIndex(
      (i) => i.mediaId === item.mediaId && i.episodeId === item.episodeId,
    );
    set({
      externalSession: {
        item,
        queue: q,
        index: Math.max(0, idx),
        launchedAtMs: Date.now(),
        pauseStartMs: undefined,
        pausedAccumMs: 0,
        isPaused: false,
        manualOffsetSeconds: 0,
        runtimeSeconds,
      },
    });
  },

  advanceExternal: () => {
    const { externalSession } = get();
    if (!externalSession) return;
    const newIndex = externalSession.index + 1;
    if (newIndex >= externalSession.queue.length) {
      set({ externalSession: null });
      return;
    }
    set({
      externalSession: {
        ...externalSession,
        item: externalSession.queue[newIndex],
        index: newIndex,
        launchedAtMs: Date.now(),
        pauseStartMs: undefined,
        pausedAccumMs: 0,
        isPaused: false,
        manualOffsetSeconds: 0,
      },
    });
  },

  closeExternal: () => set({ externalSession: null }),

  toggleExternalPause: () => {
    const { externalSession } = get();
    if (!externalSession) return;
    const now = Date.now();
    if (externalSession.isPaused) {
      const pauseDuration = externalSession.pauseStartMs != null
        ? now - externalSession.pauseStartMs
        : 0;
      set({
        externalSession: {
          ...externalSession,
          isPaused: false,
          pauseStartMs: undefined,
          pausedAccumMs: externalSession.pausedAccumMs + pauseDuration,
        },
      });
    } else {
      set({
        externalSession: {
          ...externalSession,
          isPaused: true,
          pauseStartMs: now,
        },
      });
    }
  },

  setExternalManualOffset: (seconds) => {
    const { externalSession } = get();
    if (!externalSession) return;
    set({ externalSession: { ...externalSession, manualOffsetSeconds: seconds } });
  },
}));
