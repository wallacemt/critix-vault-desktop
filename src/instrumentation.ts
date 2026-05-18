// Runs once during Next.js server startup, before the HTTP server opens its port.
// Pre-initializes Prisma / better-sqlite3 so the native addon is loaded and scanned
// by Windows Defender *before* the first real request arrives.
// Without this, the first request that calls prisma() blocks the Node.js event loop
// for the duration of the Defender scan (30-120 s), causing every concurrent fetch
// in the frontend to hang indefinitely.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[critix] Warming up database (instrumentation)...");
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma();
      console.log("[critix] Database warm-up complete");
    } catch (err) {
      // Non-fatal: the server still starts; API routes will surface the error normally.
      console.error("[critix] Database warm-up failed (non-fatal):", err);
    }
  }
}
