# The Blueprint 2.0 — Feature Section: In-App Release Changelog

> Companion section to `docs/tech/BLUEPRINT_2.0.md`. Append-style design for a single new
> feature. CA numbering continues from CA-30 (last in the 2.0 Blueprint) → CA-31+.

## Metadata
- Project:              Critix Vault Desktop
- Date:                 2026-06-07
- Architect:            Morpheus Agent
- Blueprint version:    v1
- Status:               Draft — awaiting approval
- Verification:         context7 (`/websites/v2_tauri_app`) + GitHub REST docs, verified 2026-06-07

---

## 1. Context and Objective

Critix Vault ships continuously via the Tauri updater (GitHub Releases `latest.json`). After an
update the user has no in-app way to see *what changed*. The release notes already exist on GitHub
(authored as the release `body` in markdown). This feature surfaces those notes inside the running
app: a browsable changelog plus a one-time "What's New" prompt after an update.

Scope is deliberately small: single user, offline-first, no new persistence model, no new Rust
commands, no new npm packages. It composes existing infrastructure exactly like the Startup
Autoscan feature (a hook + a notification/modal mounted in `(app)/layout.tsx`).

---

## 2. Requirements

### Functional
- **RF-01** — Show changelog content per version/release (title, version tag, date, notes body).
- **RF-02** — Be reachable on-demand from within the running app (a dedicated changelog page).
- **RF-03** — Fetch release notes from GitHub when online; degrade gracefully when offline.
- **RF-04** — After an app update (current version != last-seen version), show a one-time
  "What's New" prompt focused on the current release. It must not block startup.
- **RF-05** — A "New" badge appears in navigation when an unseen release exists, clearing once
  the user views the changelog.

### Non-Functional
- **RNF-01** (offline-first) — No network at launch must never produce an error state; the feature
  is silently inert or shows a friendly offline message inside the page.
- **RNF-02** (no schema growth) — Use Rust `AppSettings` for `last_seen_version`; use a short-lived
  in-memory / `sessionStorage` cache for fetched releases. No Prisma model.
- **RNF-03** (minimal native surface) — At most ONE new Rust command, and only if reuse is
  impossible. (Result: zero new Rust commands — see ADR-04.)
- **RNF-04** (no new deps) — GitHub release bodies are markdown; render with a tiny in-house
  safe renderer, not a new markdown library (see ADR-05).
- **RNF-05** (non-intrusive) — The "What's New" prompt is dismissible and auto-suppresses on
  subsequent launches of the same version.
- **RNF-06** (security) — All rendered release-body content is treated as untrusted input from a
  remote source; no `dangerouslySetInnerHTML` of raw GitHub HTML. Flag for Lawliet review.

---

## 3. Architectural Decisions (ADRs)

### ADR-01 — Data source: fetch GitHub Releases REST API from the renderer (Option A)
- **Context:** Three candidate sources were specified: (A) live GitHub Releases REST API, (B)
  bundle a `CHANGELOG.md` at build time, (C) reuse the updater `latest.json`.
- **Options considered:**

  | Option | Online req. | Freshness | Complexity | Bundle size | CSP change |
  |--------|------------|-----------|------------|-------------|------------|
  | **A — `GET api.github.com/repos/.../releases`** | Needed at view time (cached after) | Always current incl. past releases | Low (one `fetch`) | None | **None** — CSP `connect-src` already allows `https://*` (verified in `tauri.conf.json`) |
  | **B — bundled `CHANGELOG.md`** | No | Frozen at build; stale for any release after install until next update | Medium (build script + parser + bundle plumbing) | +file in bundle | None |
  | **C — updater `latest.json`** | Needed | Latest release only; no history; `latest.json` is an updater manifest, its `notes` field is a single string not structured per-release | Low | None | None |
- **Decision:** **Option A.** It delivers full release history (RF-01), is always current (RF-03),
  needs zero CSP changes (the existing CSP already has `connect-src ... https://*`), zero bundle
  growth, and matches the offline-first model cleanly (a fetch that fails → offline UI).
- **Consequences:**
  - (+) Full history, always fresh, no build-time coupling, no CSP edit.
  - (+) GitHub's anonymous REST rate limit (60 req/hr/IP) is irrelevant for a single user viewing a
    changelog occasionally; we cache per session to be safe.
  - (−) Requires connectivity to view notes; mitigated by RNF-01 offline UI + session cache.
  - (−) Couples to GitHub API shape; isolated behind one hook (`useChangelog`) so the dependency
    is swappable. Option B remains a documented fallback if GitHub is ever unreachable by policy.
- **Rejected:** B (staleness defeats the purpose — a release published after the user's installed
  build would never show). C (no history, manifest semantics not changelog semantics).

### ADR-02 — Surface: dedicated page, NOT a forced modal, for browsing
- **Context:** RF-02 wants on-demand access; the "What's New" (RF-04) wants a focused post-update nudge.
- **Decision:** Two distinct surfaces with one shared data hook:
  - **Browse** = a route `src/app/(app)/changelog/page.tsx` (full history list). Consistent with the
    app's existing route-based pages (`settings`, `help`, `watching`).
  - **What's New** = a lightweight `WhatsNewModal` (reusing existing `dialog.tsx`) mounted in
    `(app)/layout.tsx`, shown once after a version bump, deep-linking to the page for more.
- **Consequences:** Browsing is non-modal and re-openable from navigation; the post-update prompt is
  focused and ephemeral. Mirrors the Autoscan precedent (hook + notification mounted in layout).

### ADR-03 — "Last seen version" stored in Rust `AppSettings`
- **Context:** Need to detect "version changed since last run" (RF-04) and clear the "New" badge.
- **Options considered:** localStorage/`sessionStorage` (renderer-only, cleared if webview data is
  wiped, not authoritative) vs Rust `AppSettings` (the app's canonical settings store, already has
  `get_settings`/`save_settings` round-trip).
- **Decision:** Add `last_seen_version: String` to the Rust `AppSettings` struct. Persisted across
  reinstalls-in-place via the existing `{AppData}/critix-vault` storage, consistent with every other
  durable preference in this app.
- **Consequences:** One field added to an existing struct + its TS mirror. No new command, no Prisma.
  Follows the project rule: "when a setting is needed, extend this struct."

### ADR-04 — Read current app version via `@tauri-apps/api/app` `getVersion()` — no new Rust command
- **Context:** Need the running build's version to compare against `last_seen_version`.
- **Decision:** Use `getVersion()` from `@tauri-apps/api/app` (already a dependency, `@tauri-apps/api ^2`).
  It returns the version from `tauri.conf.json` at runtime. Verified via context7
  (`/websites/v2_tauri_app`, 2026-06-07): signature `getVersion(): Promise<string>`. Permission is
  part of `core:app:default`, included by `core:default`, which is already in
  `src-tauri/capabilities/default.json` — **no capability change needed**.
- **Consequences:** Zero new Rust commands (satisfies RNF-03 at its strongest). One renderer import.

### ADR-05 — Render release-body markdown with a minimal in-house safe renderer, not a new dep
- **Context:** GitHub release `body` is GitHub-Flavored Markdown. No markdown library is installed
  (`react-markdown`/`marked` absent in `package.json`). RNF-04 forbids new deps unless critical.
- **Options considered:**
  - Add `react-markdown` — full GFM, but a new dependency + transitive tree (rejected by RNF-04).
  - Request `Accept: application/vnd.github.full+json` to get `body_html`, then render — returns
    GitHub-sanitized HTML, but rendering remote HTML via `dangerouslySetInnerHTML` is an XSS-shaped
    pattern we must not introduce (rejected by RNF-06).
  - **A minimal renderer** that converts a safe subset (headings, bold/italic, inline code, links,
    bullet/numbered lists, line breaks) to React elements, escaping everything else as plain text.
- **Decision:** Ship a small pure function `renderChangelogMarkdown(body: string): ReactNode` in
  `src/components/features/changelog/markdown.tsx`. It NEVER emits raw HTML; links render as
  text-with-href opened via the existing `opener` (or shown as plain text if not allowlisted).
- **Consequences:**
  - (+) No new dependency; no `dangerouslySetInnerHTML`; XSS surface minimized.
  - (−) Not 100% GFM-complete (no tables/images). Acceptable: release notes are short prose +
    bullet lists. If richer rendering is ever needed, revisit `react-markdown` as a follow-up.
  - Mark this renderer for **Lawliet Agent** review (untrusted-input rendering boundary).

---

## 4. Technology Stack

| Layer | Technology | Version (verified via context7 / package.json) | Verif. Date | Justification |
|-------|-----------|--------------------------------------------------|-------------|---------------|
| Version read | `@tauri-apps/api/app` `getVersion()` | `@tauri-apps/api ^2` (signature confirmed `/websites/v2_tauri_app`) | 2026-06-07 | Runtime app version, no new command (ADR-04) |
| Data fetch | `fetch` (WebView2/WebKit native) → `https://api.github.com/repos/wallacemt/critix-vault-desktop/releases` | GitHub REST "List releases" current shape confirmed (github.com REST docs) | 2026-06-07 | Live history, no CSP/deps (ADR-01) |
| Persistence | Rust `AppSettings` (`get_settings`/`save_settings`) | existing | 2026-06-07 | `last_seen_version` field (ADR-03) |
| UI primitives | existing `dialog.tsx` (shadcn) + project UI kit | existing | 2026-06-07 | Reuse; no new deps |
| Markdown | in-house `renderChangelogMarkdown` | n/a (no dep) | 2026-06-07 | Safe subset renderer (ADR-05) |

> No new npm packages. No new Rust crates. No CSP modification.

---

## 5. Directory Structure

```
src/
  app/(app)/
    changelog/
      page.tsx                         # NEW — full changelog history page (RF-02)
  components/features/changelog/
    ChangelogList.tsx                  # NEW — renders the list of ChangelogEntry (page body)
    ChangelogEntry.tsx                 # NEW — one release entry (header + rendered body)
    WhatsNewModal.tsx                  # NEW — one-time post-update prompt (RF-04), uses dialog.tsx
    ChangelogBadge.tsx                 # NEW — "New" dot/badge for nav (RF-05)
    markdown.tsx                       # NEW — renderChangelogMarkdown() safe subset renderer (ADR-05)
    types.ts                           # NEW — ChangelogEntry interface + GitHub mapping
  hooks/
    useChangelog.ts                    # NEW — fetch + session cache + offline state (ADR-01)
    useWhatsNew.ts                     # NEW — version-change detection + last_seen_version write (RF-04)

src-tauri/src/models/settings.rs       # EDIT — add `last_seen_version: String` field + Default
src/services/tauri.ts                  # EDIT — add last_seen_version to AppSettings TS interface
src/app/(app)/layout.tsx               # EDIT — mount <WhatsNewModal/> (like AutoscanNotification)
<navigation component>                 # EDIT — add Changelog link + <ChangelogBadge/>
```

Decision on the open "page or modal?" question (from the task): **both, with clear roles** — a
**page** for browsing (primary), a **modal** only for the one-time What's New nudge (secondary).
This matches ADR-02.

---

## 6. Components and Responsibilities

- **`useChangelog.ts`** — Single source of truth for release data. Responsibilities: call GitHub
  REST once, map to `ChangelogEntry[]`, filter out `draft`/`prerelease`, sort by `published_at`
  desc, cache in `sessionStorage` (key `critix.changelog.cache`) for the app lifetime, expose
  `{ entries, status: 'idle'|'loading'|'ready'|'offline'|'error', refetch }`. Does NOT render, does
  NOT touch settings.
- **`useWhatsNew.ts`** — Orchestrates RF-04/RF-05. Reads `getVersion()` + `get_settings().last_seen_version`.
  Computes `hasUnseenRelease = currentVersion !== lastSeenVersion`. Exposes `shouldShow`, the
  `currentEntry` (matched from `useChangelog` by tag), and `markSeen()` which writes
  `last_seen_version = currentVersion` via `save_settings`. Does NOT render.
- **`ChangelogList.tsx`** — Presentational; maps `entries` → `ChangelogEntry`. Renders offline/empty
  states. No fetching.
- **`ChangelogEntry.tsx`** — Presentational; one release: version tag, name, formatted date, body via
  `renderChangelogMarkdown`. No fetching, no HTML injection.
- **`WhatsNewModal.tsx`** — Wraps `dialog.tsx`; shows `currentEntry`; "View full changelog" navigates
  to `/changelog`; close → `markSeen()`. Renders nothing when `shouldShow` is false.
- **`ChangelogBadge.tsx`** — Tiny indicator; visible when `useWhatsNew().hasUnseenRelease` is true.
- **`markdown.tsx`** — Pure `renderChangelogMarkdown(body) => ReactNode`. Safe subset only.

Integration: `useWhatsNew` consumes `useChangelog`. The page and the badge consume the same hooks.
`markSeen()` clears both the modal and the badge in one settings write.

---

## 7. Data Model

No Prisma changes. Only the durable field below + an ephemeral session cache.

```rust
// ILLUSTRATIVE — reference for Neo Agent  (src-tauri/src/models/settings.rs)
pub struct AppSettings {
    // ...existing fields unchanged...
    /// Last app version for which the user saw the "What's New" prompt.
    /// Empty string on first run => treat as "show on first launch suppressed"
    /// per ADR (see useWhatsNew first-run rule). Compared against getVersion().
    pub last_seen_version: String,
}
// Default: last_seen_version: String::new()
```

```ts
// ILLUSTRATIVE — reference for Neo Agent  (src/services/tauri.ts, AppSettings interface)
interface AppSettings {
  // ...existing fields unchanged...
  /** Last app version for which the user dismissed the "What's New" prompt. */
  last_seen_version: string;
}
```

Session cache value = serialized `ChangelogEntry[]`.

---

## 8. API Contracts / Interfaces

**Outbound (read-only, anonymous):**
```
GET https://api.github.com/repos/wallacemt/critix-vault-desktop/releases?per_page=30
Accept: application/vnd.github+json
```
No auth header (public repo). Default page returns up to 30 releases — sufficient; no pagination in v1.

**Data shape (ADR-05: use `body` raw markdown, NOT `body_html`):**
```ts
// ILLUSTRATIVE — reference for Neo Agent  (src/components/features/changelog/types.ts)

/** Subset of the GitHub Releases REST object we depend on. */
interface GitHubRelease {
  tag_name: string;        // e.g. "v2.0.0"  -> map to version
  name: string | null;     // release title; fall back to tag_name
  body: string | null;     // GFM markdown notes
  html_url: string;        // link to the release on GitHub
  published_at: string;    // ISO 8601
  draft: boolean;          // filter out true
  prerelease: boolean;     // filter out true (v1)
}

/** UI-facing entry. */
export interface ChangelogEntry {
  version: string;         // normalized tag without leading "v" if present
  rawTag: string;          // original tag_name (for matching getVersion())
  title: string;           // name ?? tag_name
  notes: string;           // body ?? "" (rendered via renderChangelogMarkdown)
  publishedAt: string;     // ISO; formatted in the component (pt-BR locale)
  url: string;             // html_url
}

export type ChangelogStatus = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

export interface UseChangelogResult {
  entries: ChangelogEntry[];
  status: ChangelogStatus;
  refetch: () => void;
}
```

**Version matching for "What's New":** `getVersion()` returns `"2.0.0"` (no `v`). Match against
`ChangelogEntry.rawTag` by stripping a leading `v`/`V` from the tag before comparing. Use a
normalized compare; if no release matches the running version, the modal does not show (the release
notes for that build aren't published yet) but `last_seen_version` is still updated on next view to
avoid nagging.

---

## 9. Applied Design Patterns

- **Hook-as-repository:** `useChangelog` isolates the GitHub dependency (ADR-01 swappability).
- **Container/Presentational split:** hooks fetch/decide; components only render.
- **Composition over new infra:** mirrors the Autoscan precedent (hook + layout-mounted notifier).
- **Adapter:** `types.ts` maps `GitHubRelease` → `ChangelogEntry`, decoupling UI from the API shape.

---

## 10. Cross-Cutting Concerns

- **Connectivity:** reuse `apiConnectivityContext.isOnline` to set the initial fetch posture; even
  so, treat any failed/aborted `fetch` as `offline`/`error` (don't trust the flag alone).
- **Error handling:** never throw to the UI tree; hook converts failures to a status enum.
- **Settings I/O:** reuse `tauriService.getSettings()/saveSettings()`. NOTE: `save_settings`
  preserves `torrent_client_pass` server-side, so round-tripping the full settings object to write
  `last_seen_version` is safe — but Neo must read-modify-write (fetch current settings, set the one
  field, save) to avoid clobbering other fields.
- **i18n:** user-facing strings in pt-BR to match existing UI; dates formatted with pt-BR locale.
- **Logging/observability:** console-level warn on fetch failure only; no telemetry.

---

## 11. Scalability and Performance

- Single fetch per app session, cached in `sessionStorage`; `per_page=30` is one small JSON response.
- No rendering of remote HTML, no large bundle additions.
- Anonymous GitHub rate limit (60/hr/IP) is a non-issue at single-user cadence; session cache
  guarantees at most a handful of calls per day.

---

## 12. Security

- **Untrusted remote content:** release `body` is rendered through a safe-subset renderer (ADR-05);
  **no `dangerouslySetInnerHTML`, no `body_html` injection.** Links are constrained.
- **No secrets:** anonymous public-repo request; no token in the renderer.
- **Settings write path:** confirmed `save_settings` cannot exfiltrate or clobber torrent password.
- **Lawliet Agent review required** for: `markdown.tsx` (untrusted-input rendering boundary) and the
  link-opening behavior (ensure only `https://github.com/...` style URLs are openable).

---

## 13. Dependencies and External Services

- **GitHub REST API** (`api.github.com`) — external, read-only, anonymous. Failure modes (offline,
  rate-limited, 404, malformed) all collapse to the hook's `offline`/`error` status → friendly UI.
- No other external services. No infrastructure changes.

---

## 14. Implementation Plan (for Neo Agent)

**Phase A — Persistence + version surface**
- A1. `src-tauri/src/models/settings.rs`: add `last_seen_version: String` + `String::new()` default.
  DoD: project compiles; `get_settings` returns the new field.
- A2. `src/services/tauri.ts`: add `last_seen_version: string` to the `AppSettings` interface.
  DoD: type-checks; existing callers unaffected.

**Phase B — Data layer**
- B1. `src/components/features/changelog/types.ts`: `GitHubRelease`, `ChangelogEntry`, statuses, mapping helper.
- B2. `src/components/features/changelog/markdown.tsx`: `renderChangelogMarkdown` safe-subset renderer.
- B3. `src/hooks/useChangelog.ts`: fetch + map + filter + sort + `sessionStorage` cache + status enum.
  DoD: returns `ready` with entries online; `offline`/`error` on failure; cached on second mount.

**Phase C — Browse UI** (depends on B)
- C1. `ChangelogEntry.tsx`, `ChangelogList.tsx`.
- C2. `src/app/(app)/changelog/page.tsx` wiring `useChangelog` → `ChangelogList`.
- C3. Add a Changelog link to the navigation component.
  DoD: `/changelog` renders history online and an offline message offline.

**Phase D — What's New + badge** (depends on A, B)
- D1. `src/hooks/useWhatsNew.ts`: `getVersion()` + settings compare + `markSeen()` (read-modify-write).
- D2. `WhatsNewModal.tsx` (uses `dialog.tsx`); `ChangelogBadge.tsx`.
- D3. Mount `<WhatsNewModal/>` in `src/app/(app)/layout.tsx`; place `<ChangelogBadge/>` in nav.
  DoD: after a simulated version bump the modal shows once, `markSeen()` clears modal + badge, and it
  does not reappear on next launch of the same version.

**Phase E — Lawliet review**
- E1. Submit `markdown.tsx` + link-open path to Lawliet Agent before merge.

---

## 15. Acceptance Criteria (for Agent Smith)

- **CA-31** — With network available, opening `/changelog` lists releases (title, version, date,
  rendered notes), newest first, excluding `draft` and `prerelease` entries.
- **CA-32** — With no network (or GitHub unreachable), `/changelog` shows a friendly offline/empty
  state and never throws or shows a stack/error toast; the app remains usable.
- **CA-33** — When the running app version differs from `AppSettings.last_seen_version`, the
  "What's New" modal appears exactly once after entering the app and is dismissible; it does not
  block startup or autoscan.
- **CA-34** — Dismissing/closing the What's New modal writes `last_seen_version = getVersion()` via
  `save_settings`, and the modal does not reappear on a subsequent launch of the same version.
- **CA-35** — Writing `last_seen_version` does not alter any other `AppSettings` field (verified:
  torrent settings, player prefs, theme unchanged after a read-modify-write).
- **CA-36** — The release-notes body is rendered without `dangerouslySetInnerHTML`; an entry whose
  `body` contains a raw `<script>`/HTML string renders that content inert as text (no execution).
- **CA-37** — The "New" badge in navigation is visible when an unseen release exists and disappears
  after the user has seen the changelog (`last_seen_version` updated).

---

## 16. Out of Scope

- Pagination beyond the first 30 releases.
- Rendering images, tables, or full GFM in release notes (safe subset only — ADR-05).
- Authenticated GitHub requests / private repo support / rate-limit handling beyond session cache.
- Localizing the GitHub-authored release body content itself.
- Bundling `CHANGELOG.md` (Option B) — documented fallback only.

---

## 17. Risks and Open Questions

- **R-01 (low):** GitHub API shape change. Mitigated by the adapter in `types.ts`; only 7 fields used.
- **R-02 (low):** A build is shipped before its GitHub release is published → no matching entry; the
  What's New modal silently won't show. Acceptable; releases should be published with the binary.
- **OQ-1:** First-run behavior — on a fresh install `last_seen_version` is empty. Recommend: do NOT
  show What's New on the very first launch (empty `last_seen_version` is treated as "current"), to
  avoid greeting brand-new users with a changelog. Confirm this preference.
- **OQ-2:** Should `prerelease` builds be shown in the browse list for users on a beta channel? v1
  excludes them; confirm if a beta channel is planned.

---

## Handoff
- Generated artifact:  docs/tech/BLUEPRINT_2.0_CHANGELOG.md
- Status:              Awaiting approval
- Next agent:          Neo Agent (implementation)
- Required action:     Review and approve this Blueprint, then resolve OQ-1 (first-run) and OQ-2
                       (prerelease visibility). After approval, invoke Neo Agent to implement the
                       Implementation Plan (Section 14), Phases A→E.
- Notes:               Lawliet Agent review REQUIRED for `markdown.tsx` (untrusted remote-content
                       rendering) and the link-open path (Section 12 / Phase E). Zero new Rust
                       commands, zero new npm packages, zero CSP changes — all verified against the
                       current codebase and context7 (2026-06-07).
```

