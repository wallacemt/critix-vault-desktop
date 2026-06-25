/** Subset of the GitHub Releases REST shape we depend on. */
export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
}

/** UI-facing changelog entry, decoupled from the GitHub API shape. */
export interface ChangelogEntry {
  /** tag_name stripped of a leading "v" or "V" (e.g. "2.0.0"). */
  version: string;
  /** Original tag_name as returned by the API (e.g. "v2.0.0"). Used for matching getVersion(). */
  rawTag: string;
  /** Release title — falls back to tag_name when GitHub `name` is null. */
  title: string;
  /** Release notes as raw GFM markdown — falls back to empty string. Rendered via renderChangelogMarkdown. */
  notes: string;
  /** ISO 8601 publication date; formatted in the component with pt-BR locale. */
  publishedAt: string;
  /** Direct link to the release on GitHub. */
  url: string;
}

export type ChangelogStatus = "idle" | "loading" | "ready" | "offline" | "error";

export interface UseChangelogResult {
  entries: ChangelogEntry[];
  status: ChangelogStatus;
  refetch: () => void;
}

/** Maps a raw GitHub API release object to a UI-facing ChangelogEntry. */
export function adaptRelease(release: GitHubRelease): ChangelogEntry {
  const rawTag = release.tag_name;
  const version = rawTag.replace(/^[vV]/, "");

  return {
    version,
    rawTag,
    title: release.name ?? rawTag,
    notes: release.body ?? "",
    publishedAt: release.published_at,
    url: release.html_url,
  };
}
