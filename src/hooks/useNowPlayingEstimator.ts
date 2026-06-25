"use client";

import { useEffect, useState } from "react";
import type { ExternalSession } from "@/stores/playerStore";

export function useNowPlayingEstimator(session: ExternalSession | null): number {
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);

  const launchedAtMs = session?.launchedAtMs;
  const pausedAccumMs = session?.pausedAccumMs;
  const isPaused = session?.isPaused;
  const pauseStartMs = session?.pauseStartMs;
  const manualOffsetSeconds = session?.manualOffsetSeconds ?? 0;
  const runtimeSeconds = session?.runtimeSeconds;

  useEffect(() => {
    if (!session) {
      setEstimatedSeconds(0);
      return;
    }

    const clamp = (v: number) =>
      runtimeSeconds != null ? Math.min(v, runtimeSeconds) : v;

    if (isPaused) {
      const frozenMs = (pauseStartMs ?? Date.now()) - (launchedAtMs ?? 0) - (pausedAccumMs ?? 0);
      setEstimatedSeconds(Math.max(0, clamp(manualOffsetSeconds + frozenMs / 1000)));
      return;
    }

    const tick = () => {
      const raw = manualOffsetSeconds + (Date.now() - (launchedAtMs ?? 0) - (pausedAccumMs ?? 0)) / 1000;
      setEstimatedSeconds(Math.max(0, clamp(raw)));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchedAtMs, pausedAccumMs, isPaused, pauseStartMs, manualOffsetSeconds, runtimeSeconds]);

  return estimatedSeconds;
}
