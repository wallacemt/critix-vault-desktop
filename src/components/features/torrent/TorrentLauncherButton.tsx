"use client";

import { useRouter } from "next/navigation";
import { Magnet } from "lucide-react";

/**
 * Navigates to the in-app torrent search page (/torrent-search).
 *
 * Previously this opened a separate Tauri WebviewWindow, which violated the
 * single-window contract of the app. Now it uses Next.js router.push so the
 * torrent browser renders inside the existing window without spawning a second
 * Tauri window.
 */
export function TorrentLauncherButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/torrent-search")}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-600 hover:bg-emerald-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Magnet className="w-4 h-4" />
      Torrent Browser
    </button>
  );
}
