"use client";

import { tauriService } from "@/services/tauri";

/**
 * Button that opens the sandboxed torrent browser pane.
 *
 * The pane is a separate Tauri WebviewWindow restricted to allowlisted hosts.
 * IPC is fully blocked from that webview, so this component is the only
 * entry-point into the torrent browsing flow from the main window.
 */
export function TorrentLauncherButton() {
  const handleOpen = async () => {
    try {
      await tauriService.openTorrentPane();
    } catch (err) {
      console.error("Failed to open torrent browser:", err);
    }
  };

  return (
    <button
      onClick={handleOpen}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-600 hover:bg-emerald-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      Torrent Browser
    </button>
  );
}
