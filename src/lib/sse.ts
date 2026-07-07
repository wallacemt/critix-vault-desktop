import "server-only";

/**
 * Wraps a "read current in-memory state" function into an SSE response.
 * The state (bg-transcode queue, HLS session progress, etc.) already lives
 * as a plain object mutated in place by server code — there's no event
 * emitter to hook into — so this checks it on an interval and only pushes a
 * frame when the serialized snapshot actually changed. That moves the poll
 * loop server-side and collapses it to one long-lived connection instead of
 * the client re-fetching every few seconds.
 */
export function sseFromSnapshot<T>(request: Request, getSnapshot: () => T, intervalMs = 1000): Response {
  const encoder = new TextEncoder();
  let lastSerialized = "";
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        if (closed) return;
        const serialized = JSON.stringify(getSnapshot());
        if (serialized === lastSerialized) return;
        lastSerialized = serialized;
        controller.enqueue(encoder.encode(`data: ${serialized}\n\n`));
      };

      send();
      const interval = setInterval(send, intervalMs);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
