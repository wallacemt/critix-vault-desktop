/**
 * TC-004 — Progress reaches >0 during a real transcode (parser logic)
 *
 * Tests the FFmpeg -progress pipe:1 line parser introduced in DEF-009.
 * Validates:
 *   - out_time_ms lines are parsed correctly
 *   - out_time_us lines (some FFmpeg builds) are parsed the same way
 *   - "N/A" values are tolerated gracefully (no NaN, no crash)
 *   - Progress is monotonically bounded to [0, 99]
 *   - Irrelevant lines are ignored
 *
 * Run: npx tsx src/__tests__/hls-progress.test.ts
 */

import assert from "node:assert/strict";

// Extracted logic from start/route.ts — must stay in sync with the actual implementation.
function parseProgressLine(line: string, durationSeconds: number): number | null {
  const match = line.match(/^out_time_(?:ms|us)=(.+)$/);
  if (!match) return null;
  const raw = match[1].trim();
  if (raw === "N/A") return null;
  const val = parseInt(raw, 10);
  if (isNaN(val) || val < 0) return null;
  // Both out_time_ms and out_time_us are microseconds despite the _ms suffix on one.
  const elapsedSec = val / 1_000_000;
  return Math.min(99, Math.round((elapsedSec / durationSeconds) * 100));
}

// ── TC-004: progress parser ───────────────────────────────────────────────────

// out_time_ms: 30s elapsed of 60s total → 50%
assert.strictEqual(parseProgressLine("out_time_ms=30000000", 60), 50, "out_time_ms 50%");

// out_time_us: same value, same result (DEF-009 fix)
assert.strictEqual(parseProgressLine("out_time_us=30000000", 60), 50, "out_time_us 50%");

// N/A early frames should return null without crashing (DEF-009 fix)
assert.strictEqual(parseProgressLine("out_time_ms=N/A", 60), null, "N/A value → null");
assert.strictEqual(parseProgressLine("out_time_us=N/A", 60), null, "N/A on _us → null");

// Progress is capped at 99 (never reports 100 — server sets 100 on completion)
assert.strictEqual(parseProgressLine("out_time_ms=120000000", 60), 99, "capped at 99");

// Bare out_time= (timestamp format) must NOT match — it would clobber progress to 0
assert.strictEqual(parseProgressLine("out_time=00:00:30.000000", 60), null, "bare out_time= → null (not matched)");

// Irrelevant lines return null
assert.strictEqual(parseProgressLine("fps=25.00", 60), null, "irrelevant line → null");
assert.strictEqual(parseProgressLine("speed=1.2x", 60), null, "irrelevant line → null");
assert.strictEqual(parseProgressLine("progress=continue", 60), null, "progress=continue → null");

// Monotonically increasing values should yield increasing percentages
{
  const duration = 120;
  const samples = [10_000_000, 30_000_000, 60_000_000, 90_000_000, 100_000_000];
  const percentages = samples.map((us) =>
    parseProgressLine(`out_time_ms=${us}`, duration)
  ) as number[];

  for (let i = 1; i < percentages.length; i++) {
    assert.ok(
      percentages[i] >= percentages[i - 1],
      `TC-004: percentage should be monotonically non-decreasing (${percentages[i - 1]} → ${percentages[i]})`,
    );
  }

  // At least one value must be > 0 to confirm the chain is live
  assert.ok(percentages.some((p) => p > 0), "TC-004: at least one progress value must be > 0");
}

console.log("TC-004: progress parser — all assertions passed");
console.log("\nAll tests passed.");
