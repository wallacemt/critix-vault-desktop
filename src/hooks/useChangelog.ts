/**
 * useChangelog
 *
 * Fetches GitHub Releases for critix-vault-desktop, maps them to ChangelogEntry[],
 * and caches the result in sessionStorage for the lifetime of the app session.
 *
 * - Filters out draft and prerelease entries (v1, OQ-2 resolved).
 * - Sorts by published_at descending (newest first).
 * - On any failure (network error, non-2xx, offline): status becomes
 *   "offline" when navigator.onLine is false, otherwise "error".
 * - Never throws to the caller.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { adaptRelease, ChangelogEntry, ChangelogStatus, GitHubRelease, UseChangelogResult } from "@/components/features/changelog/types";

const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/wallacemt/critix-vault-desktop/releases?per_page=30";

const CACHE_KEY = "critix.changelog.cache";

function readCache(): ChangelogEntry[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChangelogEntry[];
  } catch {
    return null;
  }
}

function writeCache(entries: ChangelogEntry[]): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Storage quota exceeded or unavailable — non-fatal.
  }
}

export function useChangelog(): UseChangelogResult {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [status, setStatus] = useState<ChangelogStatus>("idle");

  // Guard against state updates after unmount.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchReleases = useCallback(async () => {
    // Return cached result immediately if available (skip fetch).
    const cached = readCache();
    if (cached) {
      if (isMounted.current) {
        setEntries(cached);
        setStatus("ready");
      }
      return;
    }

    if (isMounted.current) setStatus("loading");

    try {
      const response = await fetch(GITHUB_RELEASES_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }

      const releases: GitHubRelease[] = await response.json();

      const mapped = releases
        .filter((r) => !r.draft && !r.prerelease)
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        .map(adaptRelease);

      writeCache(mapped);

      if (isMounted.current) {
        setEntries(mapped);
        setStatus("ready");
      }
    } catch (err) {
      console.warn("[useChangelog] Failed to fetch releases:", err);
      if (isMounted.current) {
        setStatus(navigator.onLine ? "error" : "offline");
      }
    }
  }, []);

  // Expose a refetch that clears the cache first, allowing a fresh network request.
  const refetch = useCallback(() => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // Non-fatal.
    }
    fetchReleases();
  }, [fetchReleases]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  return { entries, status, refetch };
}
