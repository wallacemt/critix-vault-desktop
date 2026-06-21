/**
 * useWhatsNew
 *
 * Orchestrates the "What's New" post-update nudge (RF-04) and "New" badge (RF-05).
 *
 * Reads:
 *   - getVersion() from @tauri-apps/api/app — the running build's semver string.
 *   - AppSettings.last_seen_version — last version the user acknowledged.
 *
 * Rules:
 *   - Empty last_seen_version (fresh install) → hasUnseenRelease = false (OQ-1).
 *   - currentVersion !== lastSeenVersion && lastSeenVersion !== "" → hasUnseenRelease = true.
 *   - shouldShow = hasUnseenRelease && the running version has a matching ChangelogEntry.
 *
 * markSeen() is a read-modify-write: fetches current settings, sets last_seen_version,
 * saves — preventing accidental clobber of unrelated fields (CA-35).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { tauriService } from "@/services/tauri";
import { ChangelogEntry } from "@/components/features/changelog/types";

// Lazy import of getVersion to avoid SSR crash (same pattern as invoke in tauri.ts).
let _getVersion: (() => Promise<string>) | null = null;
async function getVersion(): Promise<string> {
  if (!_getVersion) {
    _getVersion = (await import("@tauri-apps/api/app")).getVersion;
  }
  return _getVersion();
}

function normalizeVersion(tag: string): string {
  return tag.replace(/^[vV]/, "");
}

export interface WhatsNewState {
  /** True when the running version differs from last_seen_version and last_seen_version is non-empty. */
  hasUnseenRelease: boolean;
  /** True when hasUnseenRelease and the running version has a matching ChangelogEntry. */
  shouldShow: boolean;
  /** The ChangelogEntry matching the running version, or undefined if not found yet. */
  currentEntry: ChangelogEntry | undefined;
  /** The running app version (e.g. "2.0.0"). */
  currentVersion: string;
  /** Persists last_seen_version = currentVersion via read-modify-write. */
  markSeen: () => Promise<void>;
}

export function useWhatsNew(entries: ChangelogEntry[]): WhatsNewState {
  const [currentVersion, setCurrentVersion] = useState("");
  const [hasUnseenRelease, setHasUnseenRelease] = useState(false);

  // Stable ref so markSeen() always uses the latest version even after re-renders.
  const currentVersionRef = useRef("");

  useEffect(() => {
    async function init() {
      try {
        const [version, settings] = await Promise.all([
          getVersion(),
          tauriService.getSettings(),
        ]);

        const normalizedCurrent = normalizeVersion(version);
        const normalizedLastSeen = normalizeVersion(settings.last_seen_version);

        currentVersionRef.current = normalizedCurrent;
        setCurrentVersion(normalizedCurrent);

        // OQ-1: empty last_seen_version → treat as "already seen" (suppress on fresh install).
        const unseen =
          settings.last_seen_version !== "" &&
          normalizedCurrent !== normalizedLastSeen;

        setHasUnseenRelease(unseen);
      } catch (err) {
        // Non-fatal: if version or settings are unavailable, stay silent.
        console.warn("[useWhatsNew] Failed to initialize:", err);
      }
    }

    init();
  }, []);

  // Derive currentEntry from the (possibly async) entries list.
  const currentEntry =
    currentVersion.length > 0
      ? entries.find((e) => normalizeVersion(e.rawTag) === currentVersion)
      : undefined;

  const shouldShow = hasUnseenRelease && currentEntry !== undefined;

  const markSeen = useCallback(async () => {
    const version = currentVersionRef.current;
    if (!version) return;

    try {
      // Read-modify-write: never send a stale settings object (CA-35).
      const current = await tauriService.getSettings();
      await tauriService.saveSettings({ ...current, last_seen_version: version });
      setHasUnseenRelease(false);
    } catch (err) {
      console.warn("[useWhatsNew] Failed to persist last_seen_version:", err);
    }
  }, []);

  return { hasUnseenRelease, shouldShow, currentEntry, currentVersion, markSeen };
}
