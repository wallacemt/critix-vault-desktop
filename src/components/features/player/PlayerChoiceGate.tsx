"use client";

import { usePlayerStore } from "@/stores/playerStore";
import { useActions } from "@/hooks/useActions";
import { PlayerChoiceModal } from "./PlayerChoiceModal";

/**
 * Reads pendingPlay from the shared Zustand store (set by any media page via
 * useActions) and renders PlayerChoiceModal. Mounted once in the (app) layout.
 */
export function PlayerChoiceGate() {
  const pendingPlay = usePlayerStore((s) => s.pendingPlay);
  const setPendingPlay = usePlayerStore((s) => s.setPendingPlay);
  const { handlePlayerChoice } = useActions();

  return (
    <PlayerChoiceModal
      open={!!pendingPlay}
      filePath={pendingPlay?.item.filePath ?? ""}
      onChoose={handlePlayerChoice}
      onCancel={() => setPendingPlay(null)}
    />
  );
}
