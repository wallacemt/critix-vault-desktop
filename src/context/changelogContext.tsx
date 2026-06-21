"use client";

/**
 * ChangelogContext
 *
 * Provides changelog state (fetched entries, unseen-release detection) to the
 * entire (app) subtree without prop-drilling. This mirrors the pattern used by
 * apiConnectivityContext.
 *
 * The context is populated once in (app)/layout.tsx and consumed in:
 *   - LibraryLayout → AppSidebar (ChangelogBadge visibility)
 *   - (app)/layout.tsx (WhatsNewModal mount)
 *   - (app)/changelog/page.tsx (read entries + status directly from useChangelog)
 */

import { createContext, ReactNode, useContext } from "react";
import { ChangelogEntry, ChangelogStatus } from "@/components/features/changelog/types";
import { WhatsNewState } from "@/hooks/useWhatsNew";

interface ChangelogContextType {
  // From useChangelog
  entries: ChangelogEntry[];
  changelogStatus: ChangelogStatus;
  refetch: () => void;
  // From useWhatsNew
  hasUnseenRelease: boolean;
  shouldShow: boolean;
  currentEntry: ChangelogEntry | undefined;
  currentVersion: string;
  markSeen: () => Promise<void>;
}

const ChangelogContext = createContext<ChangelogContextType | undefined>(undefined);

export function ChangelogProvider({
  children,
  changelog,
  whatsNew,
}: {
  children: ReactNode;
  changelog: { entries: ChangelogEntry[]; status: ChangelogStatus; refetch: () => void };
  whatsNew: WhatsNewState;
}) {
  return (
    <ChangelogContext.Provider
      value={{
        entries: changelog.entries,
        changelogStatus: changelog.status,
        refetch: changelog.refetch,
        hasUnseenRelease: whatsNew.hasUnseenRelease,
        shouldShow: whatsNew.shouldShow,
        currentEntry: whatsNew.currentEntry,
        currentVersion: whatsNew.currentVersion,
        markSeen: whatsNew.markSeen,
      }}
    >
      {children}
    </ChangelogContext.Provider>
  );
}

export function useChangelogContext(): ChangelogContextType {
  const ctx = useContext(ChangelogContext);
  if (!ctx) {
    throw new Error("useChangelogContext must be used within a ChangelogProvider");
  }
  return ctx;
}
