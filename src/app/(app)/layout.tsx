"use client";

/**
 * App-group layout
 *
 * Wraps all routes under (app)/ (library, movie-details, series-details,
 * settings, etc.). These routes only render after the Splash screen has
 * navigated away from "/", so mounting the autoscan here guarantees it runs
 * exactly once per session — after folders are loaded and the user is in the
 * app — without polluting the root layout or the Splash page.
 *
 * PlayerModal and PlayerChoiceGate are also mounted here so they are available
 * on every route without duplicating them in individual pages.
 *
 * TorrentStatusStrip is also mounted here so it is available on every route.
 * Its `enabled` prop is driven by the `torrent_proxy_enabled` setting so
 * polling only starts when the user has explicitly opted in (CA-17).
 */

import { useEffect, useState } from "react";
import { useStartupAutoscan } from "@/hooks/useStartupAutoscan";
import { AutoscanNotification } from "@/components/features/autoscan/AutoscanNotification";
import { PlayerModal } from "@/components/features/player/PlayerModal";
import { PlayerChoiceGate } from "@/components/features/player/PlayerChoiceGate";
import { TorrentStatusStrip } from "@/components/features/torrent/TorrentStatusStrip";
import { tauriService } from "@/services/tauri";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const autoscan = useStartupAutoscan();
  const [torrentProxyEnabled, setTorrentProxyEnabled] = useState(false);

  useEffect(() => {
    tauriService
      .getSettings()
      .then((s) => setTorrentProxyEnabled(s.torrent_proxy_enabled ?? false))
      .catch(() => {
        // Non-fatal: strip stays disabled on error.
      });
  }, []);

  return (
    <>
      {children}
      <AutoscanNotification
        status={autoscan.status}
        newMedia={{ movies: autoscan.newMovies, series: autoscan.newSeries }}
        unmatchedCount={autoscan.unmatchedCount}
        onConfirm={autoscan.confirm}
        onDismiss={autoscan.dismiss}
      />
      <PlayerModal />
      <PlayerChoiceGate />
      <TorrentStatusStrip enabled={torrentProxyEnabled} />
    </>
  );
}
