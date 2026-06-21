# The Blueprint-2.0-PLAYER-MKV — MKV / External Player Strategy

## Metadata
- Project:              Critix Vault Desktop
- Date:                 2026-06-07
- Architect:            Morpheus Agent
- Blueprint version:    v1 (Draft)
- Status:               Draft (awaiting approval)
- Companion to:         `docs/tech/BLUEPRINT_2.0.md` (CA numbering continuous — this doc starts at CA-38)
- Release branch:       `release/2.0.0`

---

## 1. Context and Objective

Critix Vault's primary use case is local movie/series files the user has downloaded. The dominant container in the wild is **MKV** (H.264/HEVC video, AC3/DTS/EAC3 audio). The embedded player renders inside **WebView2 (Chromium)**, which **cannot decode the MKV container nor most of its audio codecs** for licensing/codec reasons. Result: the app's most common file type fails to play in the embedded Vidstack player.

The codebase has already built BOTH paths (Phase 3/4 on `release/2.0.0`):
- An **embedded Vidstack player** (`PlayerModal` → `VideoSurface`) fed by a range-capable `/api/stream` route, with autosave, resume, audio/subtitle track menus.
- An **external player launch** path via the existing `open_media` Tauri command + a legacy `/watching` lock-screen page.
- A `preferred_player` setting (`"ASK" | "INTERNAL" | "EXTERNAL"`, default `ASK`) and a `PlayerChoiceModal`/`PlayerChoiceGate` that routes a play action to one of the two.

The user's proposal (translated): *"Use the user's default OS media player, rendered/launched from the app. The app would only need a few utility buttons — advance episode, mark as watched."*

**Objective of this Blueprint:** decide the canonical MKV strategy and elevate the external-player experience from the bare `/watching` lock-screen into a proper, reliable **"Now Playing"** surface, while keeping the embedded player for the formats it can actually handle. No ffmpeg, no new npm packages, no Prisma schema changes.

---

## 2. Requirements

### Functional
- **RF-01** — The user can play any local file, including MKV, and reach a working video playback experience.
- **RF-02** — MKV (and other WebView2-unsupported containers/codecs) play in the user's OS default media player (or VLC), launched from the app.
- **RF-03** — While an external player is open, the app shows a **"Now Playing"** surface with: media title, episode label (SxxEyy + title), an elapsed/estimated-position indicator, "Mark as watched", and (for series) "Next episode".
- **RF-04** — "Next episode" looks up the next available episode in the existing in-memory series model, marks the current one watched, launches the next file externally, and updates the Now Playing surface.
- **RF-05** — "Mark as watched" reuses the existing watch-history write path (`POST /api/watch-history` via `databaseService`) and updates in-memory media state.
- **RF-06** — The embedded Vidstack player is retained for formats WebView2 can decode (MP4/H.264/AAC, WebM, M4V) and continues to provide accurate progress/resume.
- **RF-07** — When the embedded player hits a decode `error` event (the MKV failure mode), the app transparently falls back to the external player + Now Playing surface, without losing the queue.
- **RF-08** — The `preferred_player` setting continues to govern default behavior (`ASK` prompts, `INTERNAL`/`EXTERNAL` skip the prompt). The `PlayerChoiceModal` keeps warning that MKV may fail internally.

### Non-Functional
- **RNF-01 (Bundle size)** — Zero binary growth from this feature. No ffmpeg, no libmpv, no new native deps. (MSIX/Store size constraint; AppImage stays lean.)
- **RNF-02 (Dependencies)** — Zero new npm packages. Zero new Prisma models/fields. Zero new Next API routes (reuse `/api/watch-history`). At most ONE enriched existing Rust command.
- **RNF-03 (Cross-platform)** — Works on Windows (primary), Linux, macOS. The launch mechanism degrades gracefully when VLC is absent.
- **RNF-04 (Honesty of progress)** — Because we cannot read an external player's clock, progress in the external path is an **estimate**, and the UI must never present it as ground truth. Watch-history "completed" in the external path is driven by an explicit user action ("Mark as watched" / "Next episode"), NOT by the estimator.
- **RNF-05 (No regressions)** — The embedded player, resume, autosave, and track menus keep working unchanged for supported formats.
- **RNF-06 (Maintainability)** — Collapse the two divergent external-launch flows (`/watching` route vs. `PlayerChoiceModal` EXTERNAL branch) into ONE Now Playing surface to remove duplicate logic (`handlePlayerChoice` EXTERNAL branch, `playEpisodeForSeries` EXTERNAL branch, `handlePlayMovie` EXTERNAL branch, and the `/watching` page all currently repeat the same setWatchSession+openMedia+route dance).

---

## 3. Architectural Decisions (ADRs)

### ADR-01 — External player launch is the canonical strategy for MKV (Option A over Option B)

- **Context:** WebView2 cannot decode MKV. We must either (A) launch the OS/VLC player and orchestrate around it, or (B) bundle ffmpeg and transcode MKV → fMP4/HLS on the fly in the Node sidecar, streaming to Vidstack.
- **Options considered:**
  - **Option A — System player launch.** Pros: zero bundle growth (RNF-01); already 90% built (`open_media`, `/watching`, `PlayerChoiceModal`); plays *every* codec the user's player supports; trivial CPU; instant start; works offline. Cons: no access to the external player's clock → progress is an estimate (RNF-04); window/focus lives outside the app; "is it still playing?" is unknowable.
  - **Option B — Server-side transcoding (ffmpeg).** Pros: keeps playback inside the app with accurate progress, unified UI. Cons: **ffmpeg binary ~50–80 MB bundled** — violates RNF-01 and the MSIX/Store constraint outright; transcoding CPU cost (HEVC→H.264 real-time is heavy on low-end machines); startup latency before first frame; added failure surface (ffmpeg process supervision, HLS segment lifecycle, seek = re-transcode); a whole new subsystem in the Node sidecar. High complexity for a desktop app whose users already have VLC/MPC/PotPlayer installed.
- **Decision:** **Option A.** The complexity of Option B is not justified for a local-media desktop app where capable external players are ubiquitous and the bundle/Store size constraint is hard. This honors YAGNI and the "complexity must match the problem" principle. Option B is explicitly deferred (see §16) and could return as an *opt-in* "experimental transcode" toggle in a future major version if telemetry shows users lack any external player.
- **Consequences:**
  - (+) Ships within 2.0 with near-zero new surface area; no Store-size risk.
  - (+) Plays anything the user's player plays — the broadest possible format support.
  - (−) The external path cannot report real playback position. We embrace this: progress is a labeled estimate, and "completed" is an explicit user action. This is honest and matches how the user framed the feature ("a few utility buttons").
  - (−) The app cannot auto-detect that the external player closed or finished. The Now Playing surface persists until the user acts (Mark watched / Next / Close). Accepted.

### ADR-02 — Keep the embedded Vidstack player for supported formats; do NOT remove it

- **Context:** Should the embedded player route survive now that external launch is canonical?
- **Options considered:** (a) Remove embedded player, route everything external. (b) Keep embedded player as default for supported formats, external for the rest.
- **Decision:** **(b) Keep it.** MP4/H.264/AAC and WebM play perfectly in WebView2 with *real* progress, resume, in-app track switching, and no window-management friction. Throwing that away to serve MKV would regress the formats that work best.
- **Consequences:** Two playback engines coexist behind one decision point (`preferred_player` + `dispatchPlay`). The embedded `error`-event fallback (RF-07) bridges them so a misidentified MKV still ends up playing. The `PlayerChoiceModal` MKV warning (already present) sets user expectations.

### ADR-03 — Unify the external experience into ONE "Now Playing" surface; deprecate the `/watching` page route

- **Context:** External playback currently lands on the full-screen `/watching` route (`src/app/(app)/watching/page.tsx`). The `PlayerChoiceModal` EXTERNAL branch, `playEpisodeForSeries`, and `handlePlayMovie` each independently `setWatchSession` + `openMedia` + `router.push("/watching")`. This is duplicated, navigation-coupled logic that loses the user's place in the app (they're yanked to a different route).
- **Options considered:**
  - (a) Keep `/watching` route, just polish it.
  - (b) Replace the route with a **layout-mounted Now Playing overlay** (persistent, app-wide), following the established precedent (`PlayerModal`, `PlayerChoiceGate`, `TorrentStatusStrip`, `WhatsNewModal` are all layout-mounted via Zustand/context — see project memory).
- **Decision:** **(b).** Drive Now Playing from the existing `playerStore` (Zustand), render it from `(app)/layout.tsx`, and **deprecate the `/watching` route** (keep the file as a thin redirect for one release to avoid breaking any lingering `router.push("/watching")`, then delete in 2.1). This removes navigation coupling — the user keeps their current page while the overlay floats above it — and collapses 4 duplicated launch paths into one store action.
- **Consequences:**
  - (+) Single source of truth for "what is playing externally"; one place to test.
  - (+) No route hijack; Now Playing can be a dismissible bar/card rather than a full takeover.
  - (−) One migration step (redirect shim) and refactor of three `useActions` branches. Bounded, mechanical.

### ADR-04 — Progress in the external path is a wall-clock estimator, clearly labeled, never authoritative

- **Context:** We cannot read VLC/MPC position. The user proposed "start time + elapsed = estimated position."
- **Options considered:** (a) Free-running wall-clock estimator. (b) No progress at all, just elapsed-since-launch. (c) User-set position input.
- **Decision:** **(a) + (c) hybrid.** Run a wall-clock estimator (`elapsed = now − launchedAt`, paused-aware via a manual pause toggle) and show it as `~MM:SS` against the media's known runtime (TMDB `runtime`/episode runtime when available). Provide a small "set position" affordance (a number/range input) so the user can correct the estimate before marking watched, exactly as the task brief's Option A described. The estimate feeds the `positionSeconds` we *optionally* persist, but **`completed` is set only by explicit user action** (RNF-04).
- **Consequences:**
  - (+) Gives a believable progress readout without lying — it's labeled `~` (estimate).
  - (+) The optional "set position" lets resume work even for external playback.
  - (−) Estimator drifts if the user pauses in the external player without telling the app. Mitigated by the manual pause toggle and the "set position" input. Drift is cosmetic — it never drives `completed`.

### ADR-05 — Enrich `open_media`, do not replace it; surface launch failure to the renderer

- **Context:** `open_media` currently `spawn()`s and returns `Ok(())` even if, e.g., `vlc` is not on PATH (the spawn error IS captured for the `vlc` arm, but the `default` arm via `cmd /C start` / `xdg-open` almost always "succeeds" at the shell level even when no handler exists). The renderer therefore can't reliably tell the user "no player found."
- **Options considered:** (a) Leave as-is. (b) Add a best-effort existence/handler check and return a typed result so the Now Playing surface can show a helpful error + "Open file location" fallback.
- **Decision:** **(b), minimal.** Keep the signature and both arms. Add: when `player == "vlc"` and spawn fails on Windows/Linux, **fall back to the OS default** (`start`/`xdg-open`) instead of erroring out (a missing VLC shouldn't block playback). Validate the path via the existing `resolve_media_path` before launching (defense-in-depth + clearer error than a silent shell failure). Return the existing `Result<(), String>`; the renderer maps `Err` to a toast + "Open file location" action.
- **Consequences:**
  - (+) Robust to "VLC not installed" without a hard failure.
  - (+) Path is validated (canonicalize) before being handed to a shell — closes a small surface (consistent with the LSF-2026-004 hardening already in `player.rs`).
  - (−) Tiny Rust change; must preserve cross-platform arms. **Flag for Lawliet review** (shell command construction with a user-influenced path — see §12).

---

## 4. Technology Stack

No new technologies are introduced by this Blueprint. Everything below is **already installed and already verified** (see project memory, verified 2026-06-06/07 via context7 + npm). They are listed for completeness of the contract; **no new context7 verification was required because this Blueprint adds no library and changes no version.**

| Layer | Technology | Version (already in project) | Verified | Role in this feature |
|-------|-----------|------------------------------|----------|----------------------|
| Embedded player | `@vidstack/react` + `vidstack` | 0.6.15 | 2026-06-06 (memory) | Retained for supported formats (ADR-02); `error` event drives fallback (RF-07) |
| Native bridge | Tauri | v2 | 2026-06-07 (memory) | `open_media` (enriched, ADR-05), `resolve_media_path` (reused) |
| Rust launch | Rust `std::process::Command` | std (stable) | n/a (std lib) | Existing spawn logic; no crate added |
| State | `zustand` | already installed | — | `playerStore` extended with Now Playing slice (ADR-03) |
| Backend | Next.js | 16 | 2026-06-06 (memory) | Reuse `/api/watch-history`; NO new route |
| Persistence | Prisma | 7 + better-sqlite3 | 2026-06-06 (memory) | Reuse `WatchHistory` model; NO schema change |
| Animation | `framer-motion` | already installed | — | Now Playing overlay transitions (matches existing modals) |

> **Verification note (mandated by my own rules):** I did NOT pull fresh context7 docs in this pass because the Blueprint specifies no new library and no version bump — the only code changes are (a) renderer composition over existing modules and (b) an enriched call to `std::process::Command`, which is Rust std. If Neo, during implementation, needs to touch a Vidstack/Tauri API surface not already used in the codebase, that touch MUST be re-verified via context7 before coding (Vidstack 0.6.x APIs move fast).

---

## 5. Directory Structure

```
src/
  components/features/player/
    NowPlayingBar.tsx              # NEW — layout-mounted external "Now Playing" surface (ADR-03)
                                   #   bottom bar variant + expandable card; title, ~position, controls
    PlayerModal.tsx                # UNCHANGED — embedded Vidstack overlay
    PlayerChoiceModal.tsx          # UNCHANGED — keeps MKV warning
    PlayerChoiceGate.tsx           # UNCHANGED
    VideoSurface.tsx               # MINOR — onUnsupported already wired; ensure it hands the
                                   #   FULL queue+index to the external path on error (RF-07)
  stores/
    playerStore.ts                 # EXTEND — add NowPlaying slice (externalSession, estimator)
  hooks/
    useActions.ts                  # REFACTOR — collapse 3 EXTERNAL branches into store action;
                                   #   remove router.push("/watching")
    useNowPlayingEstimator.ts      # NEW — wall-clock estimator hook (ADR-04), paused-aware
  services/
    nowPlayingService.ts           # NEW (thin) — "advance episode" + "mark watched" orchestration
                                   #   composing existing databaseService + tauriService.openMedia
    playerService.ts               # UNCHANGED — saveProgress reused for optional position persist
  app/(app)/
    layout.tsx                     # EDIT — mount <NowPlayingBar /> alongside PlayerModal etc.
    watching/page.tsx              # DEPRECATE — replace body with redirect shim to current page;
                                   #   delete in 2.1 (ADR-03)

src-tauri/src/commands/
  files.rs                         # EDIT — open_media: validate path + VLC→default fallback (ADR-05)
```

No new directories. No new API routes. No Prisma migration.

---

## 6. Components and Responsibilities

### `playerStore` (extended) — single source of truth
- **Does:** Holds the existing embedded state AND a new `externalSession` slice: `{ item: PlayableItem, queue: PlayableItem[], index: number, launchedAtMs: number, pausedAccumMs: number, isPaused: boolean } | null`, plus actions `startExternal(item, queue)`, `advanceExternal()`, `closeExternal()`, `toggleExternalPause()`, `setExternalEstimate(seconds)`.
- **Does NOT:** Launch processes, hit the DB, or know about routing. It is pure state.

### `NowPlayingBar` (new) — the external "Now Playing" surface
- **Trigger:** Renders whenever `playerStore.externalSession != null`. Layout-mounted in `(app)/layout.tsx` (precedent: `PlayerModal`, `TorrentStatusStrip`).
- **Shows:** poster/backdrop thumb, title, episode label `SxxEyy — title` (series), an estimated position `~MM:SS / runtime` (from `useNowPlayingEstimator`), a pause/resume toggle (drives the estimator, NOT the external player), a "set position" input, and action buttons: **Mark as watched**, **Next episode** (series w/ next available), **Open file location** (fallback), **Close**.
- **Form factor:** A persistent **bottom bar** (collapsed) that the user can expand into a card — NOT a full-screen route takeover, NOT a modal that blocks the app. The user keeps browsing their library while a file plays externally.
- **Does NOT:** Decode video, read the external player's clock, or own watch-history logic (delegates to `nowPlayingService`).

### `useNowPlayingEstimator` (new) — wall-clock position estimate
- **Does:** Given `launchedAtMs`, `pausedAccumMs`, `isPaused`, and an optional `manualOffsetSeconds`, computes `estimatedSeconds = manualOffset + (now − launchedAt − pausedAccum)/1000` on a 1s tick. Clamps to `[0, runtime]` when runtime is known.
- **Does NOT:** Persist anything or decide completion.

### `nowPlayingService` (new, thin) — orchestration
- **`markWatched(session)`** — calls existing `markAsWatched` / `markEpisodeAsWatched` (`databaseService`), optionally `saveProgress` with the estimate, then `closeExternal()` and updates in-memory `mediaContext` (same in-memory update logic the `/watching` page does today).
- **`advanceEpisode(session)`** — marks current episode watched, finds next available episode (the exact `nextEpisode` memo logic from `watching/page.tsx`, lines 24–42), calls `tauriService.openMedia(next.filePath)`, then `playerStore.advanceExternal()`.
- **Does NOT:** Hold React state or render. Pure functions taking the session + collaborators.

### `useActions` (refactored)
- The three EXTERNAL branches (`handlePlayerChoice`, `playEpisodeForSeries`, `handlePlayMovie`) stop doing `setWatchSession + openMedia + router.push("/watching")`. They instead call `playerStore.startExternal(item, queue)` after `tauriService.openMedia(item.filePath)`. One path, no navigation.

### `open_media` (Rust, enriched — ADR-05)
- Validate `file_path` via canonicalize (reuse the pattern from `resolve_media_path`) before spawning. For the `vlc` arm on Windows/Linux, if `spawn()` errors, fall back to the default-player arm rather than returning `Err`. Return `Err(String)` only when even the default launch cannot be initiated, so the renderer can show "no player found."

---

## 7. Data Model

**Zero schema changes.** Reuses the existing `WatchHistory` model exactly as the embedded player and `/watching` page already use it. The only new data is **in-memory** (the `externalSession` slice in Zustand), which is ephemeral and never persisted.

`WatchHistory` fields touched (write path via `POST /api/watch-history`, unchanged):
- `mediaId`, `mediaType` (`"MOVIE" | "SERIES"`), `episodeId?`, `seasonNumber?`, `episodeNumber?`
- `positionSeconds?` ← optionally the **estimate** (labeled as such in UI; never used to compute `completed` in the external path)
- `durationSeconds?` ← media runtime when known
- `completed` ← set `true` ONLY by explicit "Mark as watched" / "Next episode" (RNF-04)
- `progress`, `watchedAt` ← handled server-side as today.

> `externalSession` (ephemeral, in-memory only):
> ```ts
> // ILLUSTRATIVE — reference for Neo Agent
> interface ExternalSession {
>   item: PlayableItem;          // reuse existing type from playerStore
>   queue: PlayableItem[];
>   index: number;
>   launchedAtMs: number;        // Date.now() at launch
>   pausedAccumMs: number;       // total time spent "paused" per the manual toggle
>   isPaused: boolean;
>   manualOffsetSeconds: number; // user "set position" correction, default 0
>   runtimeSeconds?: number;     // from TMDB runtime if available, else undefined
> }
> ```

---

## 8. API Contracts / Interfaces

**No new HTTP endpoints.** Reuses `POST /api/watch-history` (body shape unchanged, see `route.ts`).

New/changed in-process interfaces (illustrative):

```ts
// ILLUSTRATIVE — reference for Neo Agent

// playerStore additions
startExternal(item: PlayableItem, queue?: PlayableItem[]): void;
advanceExternal(): void;        // index++ ; resets launchedAt/pause accumulators
closeExternal(): void;
toggleExternalPause(): void;
setExternalManualOffset(seconds: number): void;

// nowPlayingService
async function markWatched(s: ExternalSession): Promise<void>;
async function advanceEpisode(s: ExternalSession): Promise<void>; // returns early if no next
```

```rust
// ILLUSTRATIVE — reference for Neo Agent (src-tauri/src/commands/files.rs)
#[tauri::command]
pub fn open_media(file_path: String, player: Option<String>) -> Result<(), String> {
    // 1. canonicalize(file_path) -> reject if not a file (reuse resolve_media_path logic)
    // 2. if player == "vlc": try spawn vlc; on Err, FALL THROUGH to default arm (don't error)
    // 3. default arm: start / open / xdg-open as today
    // 4. Err(...) only when even the default launch fails to spawn
}
```

---

## 9. Applied Design Patterns

- **Strategy** — `preferred_player` + `dispatchPlay` select between the embedded-player strategy and the external-launch strategy. Unchanged conceptually; just cleaned up.
- **Facade / Service** — `nowPlayingService` is a thin facade over `databaseService` + `tauriService` so the `NowPlayingBar` component stays declarative.
- **Single source of truth** — `playerStore` owns playback state (both embedded and external), per the existing layout-mounted-via-store precedent (ADR-03).
- **Adapter (existing)** — `playerService.buildStreamUrl/saveProgress` already adapt the Node sidecar; reused untouched.

---

## 10. Cross-Cutting Concerns

- **Config / settings:** `preferred_player` already lives in the Rust `AppSettings` struct and is read via `get_settings`. **No new setting needed.** When persisting changes to settings elsewhere, the read-modify-write rule still applies (project memory: `save_settings` preserves `torrent_client_pass`) — but this feature does not write settings except the already-existing "remember choice" path.
- **Error handling:** `open_media` returns `Err(String)` → renderer shows a toast ("Nenhum player de vídeo encontrado") + an "Abrir local do arquivo" action (existing `open_file_location` command). The external estimator failing is non-fatal (UI just shows `~--:--`).
- **Logging:** Reuse existing `console.error` patterns in services; Rust uses the existing `map_err` → `Result` propagation.
- **i18n:** UI strings are pt-BR, matching the existing player/watching components ("Assistindo...", "Já assisti", "Próximo SxxEyy").
- **Observability:** None added; this is local desktop, no telemetry in scope.

---

## 11. Scalability and Performance

- **Estimator cost:** one `setInterval(1s)` while an external session is active; negligible. Tear down on `closeExternal`.
- **No transcoding:** zero CPU/GPU cost beyond the OS player itself (the whole point of ADR-01).
- **Queue:** built once from the in-memory season model (existing `playEpisodeForSeries` logic); O(n) over a season's episodes — trivial.
- **Bundle:** unchanged (RNF-01) — the headline performance property of this design.
- **Complexity budget:** net new code is ~1 component + 1 hook + 1 thin service + a store slice + a small Rust tweak. Three duplicated branches are *removed*. Net complexity is roughly flat-to-negative.

---

## 12. Security

- **Path → shell handoff (ADR-05):** `open_media` hands a user-library path to a shell (`cmd /C start`, `xdg-open`, `open`, `vlc`). Adding `canonicalize` validation before spawn is a hardening step consistent with the existing `player.rs` LSF-2026-004 mitigation. **This change MUST go through Lawliet Agent review** — specifically: (a) confirm no argument-injection vector via crafted filenames on the Windows `cmd /C start "" <path>` arm, (b) confirm `canonicalize` + `is_file` is sufficient gating, (c) confirm the VLC fallback doesn't widen the surface.
- **No new network surface:** reuses `/api/watch-history` (already guarded) and `/api/stream` (already path-guarded via `resolveAndGuardPath`). No new route to audit.
- **No secrets, no PII** introduced.

**Lawliet boundary flagged:** ADR-05 Rust change to `open_media`.

---

## 13. Dependencies and External Services

- **External media player (VLC / OS default):** the core external dependency. Failure modes: not installed, no file association, user closes it. Handled by: VLC→default fallback (ADR-05), typed launch error → toast + "Open file location", and the Now Playing surface persisting until the user acts (we never assume the player is still alive).
- **TMDB:** only for `runtime` (to scale the estimate) and backdrop imagery — both optional and already fetched elsewhere. Offline → estimator shows elapsed without a runtime denominator; fully degradable.
- **No ffmpeg, no HLS server, no new third-party service.**

---

## 14. Implementation Plan (for Neo Agent)

> Sequenced. Each phase is independently shippable/reviewable.

### Phase A — Store + estimator foundation (no UI yet)
- A1. Extend `playerStore` with the `externalSession` slice + actions (`startExternal`, `advanceExternal`, `closeExternal`, `toggleExternalPause`, `setExternalManualOffset`). *DoD:* unit-testable store actions; existing embedded state untouched.
- A2. Add `useNowPlayingEstimator` hook (paused-aware wall clock, clamps to runtime). *DoD:* returns `~MM:SS`, ticks 1s, tears down cleanly.
- A3. Add `nowPlayingService` (`markWatched`, `advanceEpisode`) composing `databaseService` (`markAsWatched`/`markEpisodeAsWatched`) + `tauriService.openMedia` + the `nextEpisode` lookup ported from `watching/page.tsx`. *DoD:* `advanceEpisode` is a no-op-with-close when no next episode; reuses existing watch-history writes only.

### Phase B — Now Playing surface + wire-up
- B1. Build `NowPlayingBar` (bottom-bar + expandable card) reading `externalSession`; render the estimate, controls, and action buttons. Mount it in `(app)/layout.tsx`. *DoD:* appears only when `externalSession != null`; matches existing modal styling/framer-motion.
- B2. Refactor `useActions` EXTERNAL branches (`handlePlayerChoice`, `playEpisodeForSeries`, `handlePlayMovie`) to call `tauriService.openMedia` + `playerStore.startExternal(item, queue)` and STOP doing `setWatchSession + router.push("/watching")`. *DoD:* one external launch path; no `/watching` navigation remains in `useActions`.
- B3. Wire embedded-player `onUnsupported` (RF-07) to launch external + `startExternal` with the SAME queue/index, so an MKV that slipped into the embedded path recovers seamlessly. *DoD:* triggering a `<video>` error closes the modal and shows Now Playing with the queue intact.

### Phase C — Rust hardening + route deprecation
- C1. Enrich `open_media` (ADR-05): canonicalize+is_file gate, VLC→default fallback, typed error. *DoD:* missing VLC still plays in default player; truly unplayable path returns `Err`. **→ request Lawliet review before merge.**
- C2. Renderer: map `open_media` `Err` to a pt-BR toast + "Abrir local do arquivo" (`open_file_location`). *DoD:* simulated launch failure shows actionable UI.
- C3. Deprecate `/watching`: replace `watching/page.tsx` body with a redirect shim to the previous route (or `/library`), leaving Now Playing as the experience. *DoD:* no dead full-screen route; lingering `router.push("/watching")` (if any) lands safely. (Delete file in 2.1.)

---

## 15. Acceptance Criteria (for Agent Smith)

> Continuous numbering from BLUEPRINT_2.0 program (last was CA-37).

- **CA-38** — Playing an MKV with `preferred_player = "EXTERNAL"` launches the OS/VLC player AND shows the Now Playing surface (no navigation to a full-screen `/watching` route).
- **CA-39** — With `preferred_player = "ASK"`, the `PlayerChoiceModal` still appears and still shows the "MKV pode não funcionar no player interno" warning for `.mkv`.
- **CA-40** — In Now Playing, the position readout is prefixed/labeled as an estimate (e.g. `~12:34`) and advances ~1s/s while not paused; toggling pause halts the advance.
- **CA-41** — "Mark as watched" in Now Playing writes to `WatchHistory` via `POST /api/watch-history` with `completed = true`, updates in-memory media (`isWatched`), and dismisses the surface — for both a movie and an episode.
- **CA-42** — "Next episode" marks the current episode watched, launches the next AVAILABLE episode's file via `open_media`, and updates Now Playing to the next episode; when there is no next available episode, it marks watched and closes the surface.
- **CA-43** — "Completed" in the external path is NEVER set by the estimator alone: letting the estimator run past runtime without pressing a button does NOT write `completed = true`.
- **CA-44** — The embedded Vidstack player still plays a supported MP4 with real progress/resume/track menus (no regression).
- **CA-45** — When the embedded player emits an `error` (decode failure) mid-MKV, the app falls back to the external player + Now Playing with the SAME queue/index preserved.
- **CA-46** — With VLC selected but not installed (Windows/Linux), `open_media` falls back to the OS default player instead of failing; only when no launch is possible does the renderer show the "no player found" toast with an "Abrir local do arquivo" action.
- **CA-47** — `open_media` rejects a path that does not resolve to an existing regular file (canonicalize gate) with an `Err`, and the renderer surfaces it without crashing.
- **CA-48** — Navigating to `/watching` directly no longer renders the legacy lock-screen; it redirects (no dead route).
- **CA-49** — No new npm package, no new Prisma model/field/migration, and no new Next API route were added (verified by diff).

---

## 16. Out of Scope

- **ffmpeg / server-side transcoding (Option B)** — deferred (ADR-01). Possible future opt-in "experimental transcode" toggle if telemetry ever justifies it.
- **libmpv embedded backend** — already deferred to 2.1 in BLUEPRINT_2.0 (project memory); unchanged here.
- **Reading the external player's real position** (e.g., VLC HTTP interface / MPC web UI) — not pursued in 2.0; the estimator + manual "set position" is the contract. Could be a 2.1 enhancement for VLC specifically.
- **Detecting external-player exit** — not technically reliable cross-platform without process tracking; out of scope.
- **Subtitle selection for external playback** — handled by the external player itself; sidecar subtitle UX stays embedded-only.

---

## 17. Risks and Open Questions

- **R-01 (estimator trust) — RESOLVED:** Use `~MM:SS` prefix + small caption "posição estimada" below the readout. Owner confirmed.
- **R-02 (Lawliet gate):** ADR-05's shell-handoff change must clear Lawliet review before merge (§12). If Lawliet requires a stricter gate (e.g., allowlist of media extensions before spawn), that's an easy add.
- **OQ-1 (default behavior for MKV under `ASK`) — RESOLVED:** Keep the `PlayerChoiceModal` for all files including `.mkv`, but pre-highlight "App de vídeo padrão" for `.mkv` files. User preserves agency.
- **OQ-2 (Now Playing form factor) — RESOLVED:** Bottom bar (non-intrusive, persistente no rodapé). Expansível via clique para card maior. Não bloqueia a navegação da biblioteca.
- **OQ-3 (`/watching` redirect target) — RESOLVED:** Redirect to `/library`.
- **R-03 (runtime denominator):** TMDB runtime may be missing/wrong for some files; estimator then shows elapsed without a `/runtime`. Accepted (cosmetic).

---

## Handoff
- Generated artifact:  `docs/tech/BLUEPRINT_2.0_PLAYER_MKV.md`
- Status:              APPROVED (OQ-1/OQ-2/OQ-3/R-01 resolved by owner 2026-06-07)
- Next agent:          Neo Agent (implementation)
- Required action:     Owner reviews and approves the Blueprint, and resolves OQ-1/OQ-2/OQ-3 + R-01 wording. After approval, invoke Neo Agent to implement the Phase A→B→C plan (§14).
- Notes:               Phase C1 (`open_media` enrichment) MUST go through **Lawliet Agent** before merge (§12). Zero new npm/Prisma/API-route surface (CA-49). CA range for this companion doc: CA-38…CA-49 (continues the BLUEPRINT_2.0 program).
```