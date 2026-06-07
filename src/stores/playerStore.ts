import { create } from "zustand";

export interface PlayableItem {
  mediaId: string;
  episodeId?: string;
  title: string;
  filePath: string;
  mediaType: "MOVIE" | "SERIES";
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface PendingPlay {
  item: PlayableItem;
  queue: PlayableItem[];
}

interface PlayerState {
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
  setPosition: (s: number) => void;
  setDuration: (s: number) => void;
  setAudioTrack: (id: string) => void;
  setTextTrack: (id: string | undefined) => void;
  setPlaybackRate: (rate: number) => void;
  setPendingPlay: (p: PendingPlay | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  open: false,
  queue: [],
  index: 0,
  positionSeconds: 0,
  durationSeconds: 0,
  playbackRate: 1,
  pendingPlay: null,

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

  setPosition: (s) => set({ positionSeconds: s }),
  setDuration: (s) => set({ durationSeconds: s }),
  setAudioTrack: (id) => set({ activeAudioTrackId: id }),
  setTextTrack: (id) => set({ activeTextTrackId: id }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setPendingPlay: (p) => set({ pendingPlay: p }),
}));
