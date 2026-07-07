"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a server-sent-events endpoint that emits JSON frames and
 * keeps the latest one in state. Pass `url: null` to stay disconnected
 * (e.g. no active session yet) — the effect no-ops and returns `initial`.
 */
export function useSSE<T>(url: string | null, initial: T): T {
  const [data, setData] = useState<T>(initial);

  useEffect(() => {
    if (!url) return;

    const source = new EventSource(url);
    source.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data) as T);
      } catch {
        // malformed frame — ignore, next one will land
      }
    };

    return () => source.close();
  }, [url]);

  return data;
}
