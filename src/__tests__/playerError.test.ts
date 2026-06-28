/**
 * TC-006 — Error overlay surfaces on post-transcode failure
 *
 * Tests the error suppression logic introduced in DEF-005.
 * Scenario: raw-stream error fires during transcoding (expected) → errorHandledRef NOT consumed.
 *            After transcode finishes and source switches to MP4, if the MP4 also fails,
 *            errorHandledRef IS consumed and the overlay callback fires.
 *
 * Run: npx tsx src/__tests__/playerError.test.ts
 */

import assert from "node:assert/strict";

// Extracted logic mirrors PlayerLogic's error effect in VideoSurface.tsx.
// The actual React component can't be tested without @testing-library, but the
// decision logic — "should I suppress or surface this error?" — is pure and testable.

function makeErrorHandler() {
  const errorHandledRef = { current: false };
  const calls: string[] = [];

  function onError(errorPresent: boolean, isTranscoding: boolean): void {
    // Mirrors the useEffect body in PlayerLogic:
    if (!errorPresent || errorHandledRef.current) return;
    if (isTranscoding) return; // DEF-005: suppress but DON'T consume the slot
    errorHandledRef.current = true;
    calls.push("overlay-shown");
  }

  return { errorHandledRef, calls, onError };
}

// ── TC-006a: Error during transcoding must NOT consume errorHandledRef ────────
{
  const { errorHandledRef, calls, onError } = makeErrorHandler();

  // Raw stream error fires while transcoding
  onError(true, /* isTranscoding */ true);

  assert.strictEqual(errorHandledRef.current, false,
    "TC-006a: errorHandledRef must remain false when error fires during transcoding");
  assert.strictEqual(calls.length, 0,
    "TC-006a: overlay must NOT be shown for expected transcode-phase error");
}

// ── TC-006b: Error after transcode completes MUST surface the overlay ─────────
{
  const { errorHandledRef, calls, onError } = makeErrorHandler();

  // Phase 1: raw stream error during transcoding — suppressed, ref not consumed
  onError(true, /* isTranscoding */ true);
  assert.strictEqual(errorHandledRef.current, false, "TC-006b: still false after suppressed error");

  // Phase 2: source switches to MP4 (isTranscoding = false), then MP4 fails
  onError(true, /* isTranscoding */ false);

  assert.strictEqual(errorHandledRef.current, true,
    "TC-006b: errorHandledRef must be set after post-transcode error");
  assert.strictEqual(calls.length, 1,
    "TC-006b: overlay MUST be shown when transcoded source fails");
  assert.strictEqual(calls[0], "overlay-shown", "TC-006b: overlay callback must fire");
}

// ── TC-006c: Without transcoding phase, first error always shows overlay ──────
{
  const { errorHandledRef, calls, onError } = makeErrorHandler();

  onError(true, /* isTranscoding */ false);

  assert.strictEqual(errorHandledRef.current, true, "TC-006c: ref consumed on direct error");
  assert.strictEqual(calls.length, 1, "TC-006c: overlay shown immediately");
}

// ── TC-006d: errorHandledRef prevents duplicate overlay on same error ─────────
{
  const { calls, onError } = makeErrorHandler();

  onError(true, false); // first: shows overlay
  onError(true, false); // second: already handled → no duplicate
  onError(true, false); // third: still no duplicate

  assert.strictEqual(calls.length, 1, "TC-006d: overlay fires exactly once per item");
}

console.log("TC-006: post-transcode error overlay — all assertions passed");
console.log("\nAll tests passed.");
