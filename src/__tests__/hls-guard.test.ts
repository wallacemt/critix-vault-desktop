/**
 * TC-002 — Concurrent start for same hash yields one result (in-flight guard)
 * TC-003 — Killed transcode (exit code null) never produces cache file
 *
 * These tests validate the guard logic at a unit level without spawning FFmpeg.
 * Run: npx tsx src/__tests__/hls-guard.test.ts
 */

import assert from "node:assert/strict";

// ── TC-002: In-flight guard ───────────────────────────────────────────────────
// Simulates the Map-based guard in sessions.ts / start/route.ts.

{
  const inFlightTranscodes = new Map<string, Promise<{ sessionId: string; hlsUrl: string }>>();
  const hash = "abc123";
  const ffmpegCallCount = { value: 0 };

  // Simulates what start/route.ts does: register in-flight before awaiting FFmpeg.
  async function doTranscode(id: string): Promise<{ sessionId: string; hlsUrl: string }> {
    const existing = inFlightTranscodes.get(hash);
    if (existing) return existing; // second caller returns here

    let resolve!: (r: { sessionId: string; hlsUrl: string }) => void;
    const p = new Promise<{ sessionId: string; hlsUrl: string }>((res) => { resolve = res; });
    inFlightTranscodes.set(hash, p);

    try {
      ffmpegCallCount.value++;
      // Simulate async FFmpeg work (resolved synchronously for test speed)
      await Promise.resolve();
      const result = { sessionId: id, hlsUrl: `http://test/${id}` };
      resolve(result);
      return result;
    } finally {
      inFlightTranscodes.delete(hash);
    }
  }

  // Fire two concurrent calls for the same hash
  const [r1, r2] = await Promise.all([doTranscode("session-1"), doTranscode("session-2")]);

  // Both should succeed
  assert.ok(r1.sessionId, "TC-002: first call should return a session");
  assert.ok(r2.sessionId, "TC-002: second call should return a session");

  // Only one FFmpeg process should have been started (the second reused the in-flight promise)
  assert.strictEqual(ffmpegCallCount.value, 1, "TC-002: FFmpeg should only start once for the same hash");

  // Both callers get the same result
  assert.deepEqual(r1, r2, "TC-002: both callers should get identical results");

  // Guard is cleaned up
  assert.ok(!inFlightTranscodes.has(hash), "TC-002: in-flight entry should be removed after completion");
}

console.log("TC-002: in-flight guard — all assertions passed");

// ── TC-003: Signal kill exit code → never promotes to cache ──────────────────

{
  let tempFileRenamed = false;

  // Simulate the FFmpeg close handler and rename logic from start/route.ts
  async function simulateTranscode(exitCode: number | null): Promise<boolean> {
    // This mirrors: if (code === 0) resolve(); else reject(...)
    await new Promise<void>((resolve, reject) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${exitCode ?? "null (signal kill)"}`));
    });

    // Only reached on exit code 0
    tempFileRenamed = true;
    return true;
  }

  // Exit code null (SIGTERM/SIGKILL) must NOT promote temp file
  tempFileRenamed = false;
  try {
    await simulateTranscode(null);
    assert.fail("TC-003: should have thrown on null exit code");
  } catch (err: unknown) {
    assert.ok(err instanceof Error, "TC-003: should throw an Error");
    assert.ok((err as Error).message.includes("null"), "TC-003: error should mention null exit code");
  }
  assert.strictEqual(tempFileRenamed, false, "TC-003: temp file must NOT be renamed on signal kill");

  // Exit code 1 (FFmpeg error) must also NOT promote temp file
  tempFileRenamed = false;
  try {
    await simulateTranscode(1);
    assert.fail("TC-003: should have thrown on exit code 1");
  } catch {
    // expected
  }
  assert.strictEqual(tempFileRenamed, false, "TC-003: temp file must NOT be renamed on non-zero exit code");

  // Exit code 0 SHOULD promote temp file
  tempFileRenamed = false;
  await simulateTranscode(0);
  assert.strictEqual(tempFileRenamed, true, "TC-003: temp file should be renamed on exit code 0");
}

console.log("TC-003: signal kill handling — all assertions passed");
console.log("\nAll tests passed.");
