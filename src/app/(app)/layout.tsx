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
 */

import { useStartupAutoscan } from "@/hooks/useStartupAutoscan";
import { AutoscanNotification } from "@/components/features/autoscan/AutoscanNotification";
import { PlayerModal } from "@/components/features/player/PlayerModal";
import { PlayerChoiceGate } from "@/components/features/player/PlayerChoiceGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const autoscan = useStartupAutoscan();

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
    </>
  );
}
