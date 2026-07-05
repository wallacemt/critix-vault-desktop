"use client";

/**
 * App-group layout
 *
 * Wraps all routes under (app)/ (library, movie-details, series-details,
 * settings, changelog, etc.). These routes only render after the Splash screen
 * has navigated away from "/", so mounting the autoscan here guarantees it runs
 * exactly once per session — after folders are loaded and the user is in the
 * app — without polluting the root layout or the Splash page.
 *
 * PlayerChoiceGate is mounted here so it is available on every route without
 * duplicating it in individual pages. PlayerModal has been replaced by the
 * dedicated /player page, which eliminates the z-index stacking that caused
 * the black screen on top of the video element.
 *
 * TorrentStatusStrip is also mounted here so it is available on every route.
 * Its `enabled` prop is driven by the `torrent_proxy_enabled` setting so
 * polling only starts when the user has explicitly opted in (CA-17).
 *
 * WhatsNewModal is mounted here following the same pattern as AutoscanNotification:
 * a hook + a modal mounted in layout, shown once per version bump, non-blocking.
 * ChangelogProvider wraps children so the sidebar badge and the changelog page
 * can read unseen-release state without prop-drilling.
 */

import { useEffect, useState } from "react";
import { useStartupAutoscan } from "@/hooks/useStartupAutoscan";
import { useFolderWatcher } from "@/hooks/useFolderWatcher";
import { useChangelog } from "@/hooks/useChangelog";
import { useWhatsNew } from "@/hooks/useWhatsNew";
import { AutoscanNotification } from "@/components/features/autoscan/AutoscanNotification";
import { PlayerChoiceGate } from "@/components/features/player/PlayerChoiceGate";
import { TorrentStatusStrip } from "@/components/features/torrent/TorrentStatusStrip";
import { WhatsNewModal } from "@/components/features/changelog/WhatsNewModal";
import { ChangelogProvider } from "@/context/changelogContext";
import { tauriService } from "@/services/tauri";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const autoscan = useStartupAutoscan();
  // Reacts to filesystem changes in tracked folders (Rust `notify` watcher +
  // Tauri event) and reuses the same scan/match/notify pipeline as autoscan —
  // rendered as its own <AutoscanNotification> below so the startup flow above
  // is completely untouched.
  const folderWatcher = useFolderWatcher();
  const [torrentProxyEnabled, setTorrentProxyEnabled] = useState(false);

  // Changelog data — fetched lazily after mount (does not block startup).
  const changelog = useChangelog();
  const whatsNew = useWhatsNew(changelog.entries);

  // Internal open state for the What's New modal. Opens once when shouldShow
  // becomes true, closes when the user dismisses (which also calls markSeen).
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  useEffect(() => {
    if (whatsNew.shouldShow) {
      setWhatsNewOpen(true);
    }
  }, [whatsNew.shouldShow]);

  function handleWhatsNewClose() {
    setWhatsNewOpen(false);
    // markSeen writes last_seen_version and clears hasUnseenRelease.
    whatsNew.markSeen();
  }

  useEffect(() => {
    tauriService
      .getSettings()
      .then((s) => setTorrentProxyEnabled(s.torrent_proxy_enabled ?? false))
      .catch(() => {
        // Non-fatal: strip stays disabled on error.
      });
  }, []);

  return (
    <ChangelogProvider changelog={changelog} whatsNew={whatsNew}>
      {children}
      <AutoscanNotification
        status={autoscan.status}
        newMedia={{ movies: autoscan.newMovies, series: autoscan.newSeries }}
        unmatchedCount={autoscan.unmatchedCount}
        onConfirm={autoscan.confirm}
        onDismiss={autoscan.dismiss}
      />
      <AutoscanNotification
        status={folderWatcher.status}
        newMedia={{ movies: folderWatcher.newMovies, series: folderWatcher.newSeries }}
        unmatchedCount={folderWatcher.unmatchedCount}
        onConfirm={folderWatcher.confirm}
        onDismiss={folderWatcher.dismiss}
      />
      <PlayerChoiceGate />
      <TorrentStatusStrip enabled={torrentProxyEnabled} />
      <WhatsNewModal entry={whatsNew.currentEntry} open={whatsNewOpen} onClose={handleWhatsNewClose} />
    </ChangelogProvider>
  );
}
