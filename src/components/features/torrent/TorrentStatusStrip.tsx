"use client";

import { useEffect, useState } from "react";
import { tauriService } from "@/services/tauri";

interface TorrentItem {
  name?: string;
  /** uTorrent reports progress as an integer in tenths of a percent (0–1000). */
  progress?: number;
  downspeed?: number;
}

interface ApiResponse {
  torrents?: unknown[][];
}

/**
 * Maps a raw uTorrent torrent array entry to a typed `TorrentItem`.
 * uTorrent's torrent list format is an array of arrays; index 2 is the name
 * and index 5 is progress (0–1000 = 0%–100.0%).
 */
function parseTorrentEntry(entry: unknown[]): TorrentItem {
  return {
    name: typeof entry[2] === "string" ? entry[2] : undefined,
    progress: typeof entry[5] === "number" ? entry[5] : undefined,
    downspeed: typeof entry[9] === "number" ? entry[9] : undefined,
  };
}

interface Props {
  /** When false the strip renders nothing and the polling interval is cleared. */
  enabled: boolean;
}

/**
 * Displays up to three active torrents as a status strip.
 *
 * Polling behaviour (RF-12 / CA-17):
 * - Only polls when `enabled` is true.
 * - Silently hides itself if the API is unreachable — no error UI.
 * - Clears the interval and cancels in-flight state updates on unmount or
 *   when `enabled` flips to false.
 */
export function TorrentStatusStrip({ enabled }: Props) {
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setTorrents([]);
      setReachable(true);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const result = (await tauriService.proxyTorrentApi()) as ApiResponse;
        if (cancelled) return;

        const raw = result?.torrents ?? [];
        const parsed = raw
          .filter(Array.isArray)
          .map((entry) => parseTorrentEntry(entry as unknown[]));

        setTorrents(parsed);
        setReachable(true);
      } catch {
        if (!cancelled) setReachable(false);
      }
    };

    poll();
    const intervalId = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [enabled]);

  // Hide when disabled, unreachable, or nothing is active.
  if (!enabled || !reachable || torrents.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-2">
      {torrents.slice(0, 3).map((torrent, index) => (
        <div
          key={index}
          className="flex items-center gap-2 text-xs text-emerald-300"
        >
          <span className="max-w-[160px] truncate font-medium">
            {torrent.name ?? "Torrent"}
          </span>
          <span className="shrink-0 text-emerald-500">
            {torrent.progress != null
              ? `${Math.round(torrent.progress / 10)}%`
              : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
