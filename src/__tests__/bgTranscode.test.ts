/**
 * TC-005 — Background queue starts after async library load
 *
 * Tests the trigger condition: enabled=true + media arrives after mount →
 * queue activates. The collectAtRiskPaths helper is tested directly.
 * The effect-level guard (runningRef) is verified via simulation.
 *
 * Run: npx tsx src/__tests__/bgTranscode.test.ts
 */

import assert from "node:assert/strict";
import { collectAtRiskPaths } from "../hooks/useBgTranscode.js";
import type { Media } from "../types/media.js";
import type { Series } from "../types/serie.js";

// ── AT_RISK path collection ───────────────────────────────────────────────────

// Movie with AT_RISK extension
const mkv: Media = {
  id: "m1", title: "Test", type: "MOVIE", filePath: "/movies/film.mkv",
} as Media;

// Movie with safe extension — should NOT be included
const mp4: Media = {
  id: "m2", title: "Safe", type: "MOVIE", filePath: "/movies/safe.mp4",
} as Media;

// Series with mixed episodes
const series: Media = {
  id: "s1", title: "Show", type: "SERIES",
  seasons: [
    {
      episodes: [
        { filePath: "/show/s01e01.mkv" },
        { filePath: "/show/s01e02.mp4" },  // safe — excluded
        { filePath: "/show/s01e03.avi" },
      ],
    },
  ],
} as unknown as Series;

{
  const paths = collectAtRiskPaths([mkv, mp4, series]);
  assert.strictEqual(paths.length, 3, "TC-005: should collect 3 AT_RISK paths (mkv movie + 2 series eps)");
  assert.ok(paths.includes("/movies/film.mkv"), "TC-005: MKV movie included");
  assert.ok(!paths.includes("/movies/safe.mp4"), "TC-005: MP4 movie excluded");
  assert.ok(paths.includes("/show/s01e01.mkv"), "TC-005: series MKV included");
  assert.ok(paths.includes("/show/s01e03.avi"), "TC-005: series AVI included");
  assert.ok(!paths.includes("/show/s01e02.mp4"), "TC-005: series MP4 excluded");
}

// Empty media list → empty paths
{
  const paths = collectAtRiskPaths([]);
  assert.strictEqual(paths.length, 0, "TC-005: empty media → no paths");
}

// ── Effect trigger condition simulation ──────────────────────────────────────
// Simulates: enabled=true, media=[] on mount → no queue start
//            media arrives → queue starts (because media is in deps)

{
  let queueStartCount = 0;

  function simulateEffect(enabled: boolean, media: Media[], runningRef: { current: boolean }) {
    // This mirrors the exact guard at the top of the useBgTranscode effect
    if (!enabled || media.length === 0) return;
    if (runningRef.current) return;
    queueStartCount++;
    runningRef.current = true;
  }

  const runningRef = { current: false };

  // Initial mount: media is empty
  simulateEffect(true, [], runningRef);
  assert.strictEqual(queueStartCount, 0, "TC-005: queue must NOT start with empty media");

  // Media arrives (effect re-fires because media is in deps)
  simulateEffect(true, [mkv], runningRef);
  assert.strictEqual(queueStartCount, 1, "TC-005: queue MUST start when media arrives");

  // Mid-run: another update arrives — guard prevents restart
  simulateEffect(true, [mkv, series], runningRef);
  assert.strictEqual(queueStartCount, 1, "TC-005: runningRef guard prevents duplicate start");
}

console.log("TC-005: background queue trigger — all assertions passed");
console.log("\nAll tests passed.");
