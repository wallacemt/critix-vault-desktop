/**
 * TC-001 — getLastWatchedEpisode unit tests
 * TC-007 — recently-watched sort ordering unit tests
 *
 * Run: npx tsx src/__tests__/mediaUtils.test.ts
 */

import assert from "node:assert/strict";
import { getLastWatchedEpisode } from "../utils/mediaUtils.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSeries(episodes: Array<{ s: number; e: number; watched: boolean }>) {
  const seasonMap = new Map<number, Array<{ episode_number: number; isWatched: boolean }>>();
  for (const ep of episodes) {
    if (!seasonMap.has(ep.s)) seasonMap.set(ep.s, []);
    seasonMap.get(ep.s)!.push({ episode_number: ep.e, isWatched: ep.watched });
  }
  return {
    seasons: [...seasonMap.entries()].map(([sn, eps]) => ({
      season_number: sn,
      episodes: eps,
    })),
  };
}

// ── TC-001: getLastWatchedEpisode ─────────────────────────────────────────────

// (a) E1,E2 watched of 5 → expect the furthest watched = E2
{
  const series = makeSeries([
    { s: 1, e: 1, watched: true },
    { s: 1, e: 2, watched: true },
    { s: 1, e: 3, watched: false },
    { s: 1, e: 4, watched: false },
    { s: 1, e: 5, watched: false },
  ]);
  const result = getLastWatchedEpisode(series);
  assert.ok(result !== null, "TC-001a: should return non-null");
  assert.strictEqual(result!.episodeNumber, 2, "TC-001a: should return E2");
  assert.strictEqual(result!.seasonNumber, 1, "TC-001a: should be S1");
}

// (b) Only S1E3 watched (non-sequential) → must return S1E3, not null
{
  const series = makeSeries([
    { s: 1, e: 1, watched: false },
    { s: 1, e: 2, watched: false },
    { s: 1, e: 3, watched: true },
    { s: 1, e: 4, watched: false },
    { s: 1, e: 5, watched: false },
  ]);
  const result = getLastWatchedEpisode(series);
  assert.ok(result !== null, "TC-001b: should return non-null for a single watched episode");
  assert.strictEqual(result!.episodeNumber, 3, "TC-001b: should return E3");
}

// (c) All episodes watched → returns the last episode
{
  const series = makeSeries([
    { s: 1, e: 1, watched: true },
    { s: 1, e: 2, watched: true },
    { s: 2, e: 1, watched: true },
    { s: 2, e: 5, watched: true },
  ]);
  const result = getLastWatchedEpisode(series);
  assert.ok(result !== null, "TC-001c: should return non-null");
  assert.strictEqual(result!.seasonNumber, 2, "TC-001c: should be S2");
  assert.strictEqual(result!.episodeNumber, 5, "TC-001c: should be E5");
}

// (d) No episodes watched → null
{
  const series = makeSeries([
    { s: 1, e: 1, watched: false },
    { s: 1, e: 2, watched: false },
  ]);
  const result = getLastWatchedEpisode(series);
  assert.strictEqual(result, null, "TC-001d: no watched episodes → null");
}

// Extra: out-of-order viewing (S2E5 watched before S1 complete)
{
  const series = makeSeries([
    { s: 1, e: 1, watched: true },
    { s: 1, e: 2, watched: true },
    { s: 2, e: 5, watched: true },
    { s: 1, e: 3, watched: false },
  ]);
  const result = getLastWatchedEpisode(series);
  assert.ok(result !== null, "TC-001e: should return non-null");
  // Furthest watched = S2E5, not S1E2 (the old heuristic would return S1E2)
  assert.strictEqual(result!.seasonNumber, 2, "TC-001e: out-of-order: should be S2");
  assert.strictEqual(result!.episodeNumber, 5, "TC-001e: out-of-order: should be E5");
}

console.log("TC-001: getLastWatchedEpisode — all assertions passed");

// ── TC-007: recently-watched sort ordering ────────────────────────────────────

// Extract the sort logic from filteredMedia (recently-watched case).
function sortByRecentlyWatched<T extends { lastWatchedAt?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0;
    const tb = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0;
    // Descending: most recently watched first; 0 (never watched) always sinks to end
    if (ta < tb) return 1;
    if (ta > tb) return -1;
    return 0;
  });
}

{
  const now = Date.now();
  const items = [
    { id: "a", lastWatchedAt: null },
    { id: "b", lastWatchedAt: new Date(now - 1000).toISOString() },  // 1s ago
    { id: "c", lastWatchedAt: null },
    { id: "d", lastWatchedAt: new Date(now - 3000).toISOString() },  // 3s ago
    { id: "e", lastWatchedAt: new Date(now - 500).toISOString() },   // 0.5s ago
  ];

  const sorted = sortByRecentlyWatched(items);

  // Most recently watched (e, then b, then d) should come first
  assert.strictEqual(sorted[0].id, "e", "TC-007: most recent should be first");
  assert.strictEqual(sorted[1].id, "b", "TC-007: second most recent");
  assert.strictEqual(sorted[2].id, "d", "TC-007: third most recent");

  // Never-watched items (null lastWatchedAt) must sink to end
  assert.ok(sorted[3].lastWatchedAt === null, "TC-007: never-watched should be at end");
  assert.ok(sorted[4].lastWatchedAt === null, "TC-007: never-watched should be at end");
}

console.log("TC-007: recently-watched sort ordering — all assertions passed");
console.log("\nAll tests passed.");
