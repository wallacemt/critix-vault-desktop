# The Blueprint — Critix Vault 2.0

> All code in this document is **`// ILLUSTRATIVE — reference for the implementer`**.
> This is a design contract, not an implementation. The implementer fills in the bodies.

## Metadata
- Project:              Critix Vault (desktop)
- Date:                 2026-06-06
- Architect:            Morpheus Agent
- Blueprint version:    v3 (Startup Autoscan feature added 2026-06-06; Section 4.8, CA-24…CA-30)
- Status:               Draft — Approved (OQ-1, OQ-2 resolved; Autoscan added in v3)
- Baseline:             v1.1.9 (`package.json`, `src-tauri/Cargo.toml`, `tauri.conf.json` all aligned at 1.1.9)
- Target:               v2.0.0

---

## 0. Reality Check — Correcting the Brief

Before designing, I read the code. One framing in the task brief is **inaccurate and must be corrected**, because the whole player/torrent design depends on it:

> The brief says "Next.js 16 **static export**". **It is not.**

The actual runtime architecture (`src-tauri/src/server.rs`, `next.config.mjs`):

- `next.config.mjs` uses **`output: "standalone"`** — a full Next.js Node server, *not* `output: "export"`.
- `tauri.conf.json` declares `frontendDist: "../out"` (a static shell) **but** `server.rs` spawns a **Node child process** running `server.js` on `127.0.0.1:1422`. This is the real backend.
- Prisma 7 + `better-sqlite3` run **server-side inside that Node process**, against `{AppData}/critix-vault/critix.db`. The DB is *not* in the browser.
- The `127.0.0.1:1422` server is **the Next.js standalone server itself** — it already serves the app and the `/api/*` route handlers. It is *not* a separate Axum/Warp file server. (The brief's mention of "Axum/Warp `server.rs`" is wrong; `server.rs` is a process supervisor + HTTP health-check client, not an HTTP server.)
- "uTorrent on port 8080" **collides** with the app's own fallback external-API default (`server.rs` falls back to `http://127.0.0.1:8080` when no API URL is configured). See ADR-05 — we will not assume uTorrent owns 8080.

This correction matters: it means **media streaming and watch-history persistence already have a server-side home** (the Next.js API routes), and we should extend that rather than invent a new Rust HTTP server. The Rust side stays a thin native bridge (process control, file dialogs, OS handoff).

A second reality check on **BUG-2**: the granular, correct watch logic **already exists** in `src/services/databaseService.ts` (`markEpisodeAsWatched`, `isEpisodeWatched`, `getSeriesEpisodeWatchStatus`, lines 469–647). The bug lives in the **legacy class** `src/services/watchHistoryService.ts` (`isEpisodeWatched`, `markEpisodeWatched`), which is still imported by `src/components/features/media/MovieDetails.tsx`. So BUG-2 is largely a **consolidation + dead-code-removal** problem, not a green-field write. See Section 3.2.

### 0.1 Open Questions — RESOLVED (2026-06-06)

Both open questions raised in v1 (tracked as R1/OQ-1 and R2/OQ-2 in Section 17) are now answered by the user. The Blueprint has been revised in place accordingly:

- **OQ-1 (codec coverage / player choice) — RESOLVED.** Use case: watch media inside the app, but **keep the existing external-player handoff** as a first-class option. On Play, when no preference is saved, show a **modal** asking "internal" vs "default video app", with a **"remember my choice"** checkbox that persists a `preferredPlayer` setting (changeable in Settings). Because most media are **MKV** (locally downloaded series/films) and WebView2 does **not** natively support the MKV container, the internal player is a **best-effort HTML5 player** with **warn-and-fallback**: on a `<video>` error event it auto-switches to the external player. Full MKV support via libmpv is **deferred to 2.1** (Section 16). → Revises ADR-01; adds Section 4.7 (Player Preference System).
- **OQ-2 (torrent client port) — RESOLVED.** The user's actual torrent-client listening port is **10800** (uTorrent/qBittorrent "Preferences > Listening ports"). Port is now **user-configurable in Settings** (`torrentClientPort: Int`, default `10800` — chosen to avoid the confirmed collision with the app's own `8080` external-API fallback, Section 0). The Rust proxy reads the port from settings **at call time**, never hardcoded. → Revises ADR-05; updates Section 5.5.

---

## 1. Context and Objective

Critix Vault is a local-media library desktop app (Tauri v2 shell + Next.js standalone sidecar). v1.x catalogs local movies/series with TMDB metadata. **2.0 turns it from a catalog into a media center**: watch state must be trustworthy, content must be playable in-app, and acquisition (torrents) is integrated — without compromising the clean MSIX/NSIS/AppImage packaging.

**2.0 achieves vs 1.x:**

| Area | 1.x | 2.0 |
|---|---|---|
| Watch state | Series marked watched → whole series flips; resets after days | Per-episode granularity, idempotent, survives MSIX DB resets |
| Playback | Hand off to external player | Embedded player (audio tracks, subs, speed, resume, auto-advance) |
| Acquisition | None | Sandboxed torrent browser + magnet handoff + optional progress |
| Packaging | Works, some artifact bloat | Audited, minimal, version-aligned |

---

## 2. Requirements

### Functional
- **RF-01** — Marking an episode watched MUST affect only that episode (season/series rollups are *derived*, never stored as a blanket flag).
- **RF-02** — Watch state MUST survive app restart and MUST survive a SQLite reset caused by an MSIX update (shadow-cache restore).
- **RF-03** — Shadow-cache restore MUST fire only on a genuine cold/empty DB, never compete with a populated DB.
- **RF-04** — Embedded player MUST play local video files served via `127.0.0.1:1422`.
- **RF-05** — Player MUST allow switching audio tracks (e.g. PT/EN dub) when present.
- **RF-06** — Player MUST load subtitles from sidecar `.srt`/`.vtt` files and from embedded text tracks.
- **RF-07** — Player MUST support playback-speed control.
- **RF-08** — Player MUST resume from last position and auto-advance to the next episode.
- **RF-09** — Player MUST persist progress (absolute seconds + percent) to `WatchHistory`.
- **RF-10** — App MUST embed a restricted browser pane for an allowlisted set of torrent sites.
- **RF-11** — App MUST detect magnet/`.torrent` activations and hand them off to the system torrent client.
- **RF-12** — App MAY display active torrent progress via the torrent client's local API (best-effort).

### Non-Functional
- **RNF-01 (Scale)** — Single user, single machine. Libraries up to ~10k media rows; episode counts up to ~5k per series tail. No multi-tenancy. Apply YAGNI hard.
- **RNF-02 (Latency)** — Watch-state read for a series detail page < 150 ms; player seek-to-resume < 1 frame visible jump.
- **RNF-03 (Availability)** — Offline-first. Playback and watch state MUST work with no internet. TMDB/torrent are the only network-optional paths.
- **RNF-04 (Security)** — Untrusted third-party HTML (torrent sites) MUST be isolated from the app's IPC and from `tauri://`/`asset://` privileges. No arbitrary URL open. → Lawliet Agent review required (Section 12).
- **RNF-05 (Maintainability)** — One watch-history module, one source of truth. Delete the legacy duplicate.
- **RNF-06 (Packaging)** — MSIX/NSIS/AppImage MUST all build green; no native plugin may break the Linux AppImage.

---

## 3. Bug Fix Architecture

### 3.1 BUG-1 — SQLite persistence regression (shadow cache fires on normal startup)

**Root cause (confirmed in `databaseService.ts`):**
The shadow restore (lines 311–345) gates only on `history.length === 0 && shadow.length > 0` with a module-scoped `_shadowRestoreChecked` flag. Two defects:

1. **False-empty race.** `getWatchHistory()` with no `mediaId` can legitimately return `[]` on the *first* call during app boot if the Node sidecar/Prisma isn't fully warm yet (`server.rs` itself documents a Defender-scan window where the server is up but slow). An empty-but-not-cold response triggers a full shadow re-insert, which then **double-writes** entries and, combined with the legacy series-level writes, corrupts state. Over days the shadow accumulates stale/duplicate entries and "wins" against real deletes (unmarking).
2. **No idempotency / no deletion mirror for the cold path.** `removeFromWatchShadow` is called on the unmark paths, but a *restore* re-adds everything in the shadow regardless of whether the user later unmarked it on a previous session whose delete never reached the shadow (e.g. legacy `unmarkEpisodeWatched` in `watchHistoryService.ts` deletes via API but never touches the shadow).

**Design — make restore a deliberate, verifiable migration, not a startup heuristic:**

- **Decision (ADR-04):** Replace the "empty == restore" heuristic with an explicit **DB generation marker**. On the server side, store a row `meta(key='db_generation', value=<uuid>)` created at DB init. Mirror that uuid into `localStorage` as `critix_db_generation`. Shadow restore fires **only** when:
  - server reports a `db_generation` that differs from the one in `localStorage` (DB was recreated), **AND**
  - the server confirms zero watch rows (`count == 0`, a dedicated cheap endpoint, not a list).
  This distinguishes "DB was wiped by MSIX update" from "list call raced an unwarmed server".
- The shadow becomes a **write-through, delete-aware mirror**: every successful add mirrors in; every successful delete mirrors out (fix the legacy delete paths to call `removeFromWatchShadow`, or route all deletes through one function — see 3.2).
- Restore is **idempotent**: keyed by `(mediaId, episodeId)` upsert on the server (see 3.2 write path), so a re-run cannot duplicate.
- After a successful restore, write the new `db_generation` to `localStorage` so it never fires twice for the same generation.

```
// ILLUSTRATIVE — reference for the implementer (databaseService.ts)
async function maybeRestoreFromShadow(): Promise<void> {
  const localGen = localStorage.getItem("critix_db_generation");
  const { generation, watchCount } = await fetchDbMeta();      // GET /api/db-meta
  if (generation !== localGen) {                                // DB identity changed
    if (watchCount === 0) {
      await restoreWatchHistoryFromShadow(loadWatchShadow());   // idempotent upserts
    }
    localStorage.setItem("critix_db_generation", generation);   // adopt new identity
  }
  // If generation matches, DB is the same one we've been using — NEVER restore.
}
```

**New server endpoint:** `GET /api/db-meta` → `{ generation: string, watchCount: number }` (single `SELECT` + `COUNT`). Cheap, no list payload, no race with large fetches.

**Acceptance:** RF-02, RF-03. See CA-01…CA-03.

### 3.2 BUG-2 — Granular episode watch state

**Root cause (confirmed):**
- `watchHistoryService.ts:isEpisodeWatched()` (lines 112–120) ignores `seasonNumber`/`episodeNumber`/`episodeId` and returns true for *any* completed `SERIES` row.
- `watchHistoryService.ts:markEpisodeWatched()` (lines 64–94) writes only `{mediaId, mediaType, completed, progress}` — never the episode coordinates — so the data needed to be granular is never persisted by that path.
- `MovieDetails.tsx` only uses the *movie* methods of this class, but the class is the one documented as the bug. The **series detail UI** must be confirmed to use `databaseService` (which is already correct), not this class.

**The schema is already sufficient.** `WatchHistory` already has `episodeId`, `seasonNumber`, `episodeNumber`. No column changes are required for granularity. The fix is **write-path correctness + consolidation + a uniqueness guarantee**.

**Design:**

1. **Single source of truth.** Promote `src/services/databaseService.ts` watch functions to the *only* watch API. **Delete** `watchHistoryService.ts`. Repoint `MovieDetails.tsx` to `databaseService` (`markAsWatched`/`clearWatchHistory`/`isMediaWatched`).
2. **Write path** always carries episode coordinates for series (already true in `markEpisodeAsWatched`, lines 469–486). Movies write with `episodeId: undefined` (already true).
3. **Read path** filters by coordinates (already correct in `databaseService.isEpisodeWatched`, lines 488–505, and `getSeriesEpisodeWatchStatus`, 551–569).
4. **Season/series rollups are derived, never stored.** `isSeasonWatched` (574–582) already computes "all episodes watched". Keep this. There must be **no** `completed` row at the series level that means "whole series done" — that blanket flag is exactly BUG-2.
5. **Schema migration — add a uniqueness constraint** to make writes idempotent (required by 3.1 restore and prevents duplicate rows accumulating over days, the secondary BUG-1 symptom):

```prisma
// ILLUSTRATIVE — reference for the implementer (prisma/schema.prisma)
model WatchHistory {
  // ...existing fields...
  // Episode rows are unique per (mediaId, episodeId).
  // Movie rows have episodeId = NULL — handled with a sentinel in the unique index.
  @@index([mediaId])
  @@index([watchedAt])
}
```

SQLite treats multiple `NULL`s as distinct in a unique index, which would *not* dedupe movie rows. Two clean options — pick one in ADR (recommend B):

- **Option A:** store a sentinel `episodeId = "__MOVIE__"` for movies, then `@@unique([mediaId, episodeId])`. Simple, but pollutes data.
- **Option B (recommended):** keep `episodeId` nullable; enforce upsert idempotency in the **API route** (`SELECT … WHERE mediaId=? AND (episodeId=? OR (episodeId IS NULL AND ? IS NULL))` then insert-or-update). No schema sentinel, write path owns the invariant.

**Migration:** new Prisma migration `20260606_xxxxxx_watch_history_dedup` that (a) collapses existing duplicate rows to one per `(mediaId, episodeId)` keeping the latest `watchedAt`, and (b) **deletes the BUG-2 blanket series rows** (`mediaType='SERIES' AND episodeId IS NULL AND completed=1`) which carry no episode coordinates and are the corruption source. This is a **data-cleaning migration**; it must be reversible-safe (back up `critix.db` first — the migration runner in `server.rs` copies prisma on every boot, so guard with a one-time marker).

**Acceptance:** RF-01. See CA-04…CA-07.

---

## 4. Feature Architecture — Embedded Media Player

### 4.1 Technology decision (ADR-01)

Three options were evaluated against the *actual* architecture (local files behind a `127.0.0.1:1422` HTTP server, WebView2/WebKitGTK runtime, Linux AppImage must keep building):

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **A. `react-player` (HTML5 `<video>` wrapper)** | Thin wrapper | Tiny, familiar | **No audio-track API**, weak text-track control, no built-in resume UX → we'd reimplement RF-05/06 by hand. |
| **B. `libmpv` via Rust (`tauri-plugin-mpv`/custom)** | Native player surface | Best codec coverage, true multi-track | Native dep ships per-platform; **risks the AppImage build (RNF-06)**; renders *outside* the webview (overlay/embed friction); large native surface. Violates YAGNI for a single-user catalog. |
| **C. Vidstack Player (React) over HTML5/`<video>`** | Production media player lib, framework-native | First-class **audio-tracks** (`audio-tracks-change`, `audioTracks.select`), **text-tracks** (`.vtt`/`.srt` via `<Track>`), **playback rate**, **`time-update`**/**`seek`** for resume, accessible UI, pure web → zero native deps → **AppImage-safe**. | Codec support bounded by the platform webview (WebView2 / WebKitGTK). Mitigated below. |

**Decision: Option C — Vidstack Player (`@vidstack/react`), as a best-effort HTML5 internal player, paired with a first-class external-player handoff and a per-user player preference.** (Revised 2026-06-06 after OQ-1.)

Rationale: it gives RF-05/06/07/08/09 out of the box with verified APIs, ships **no native code** (critical for RNF-06 — no AppImage risk), and slots directly into the existing React 19 / Next standalone stack streaming from `127.0.0.1:1422`.

**Codec reality — MKV (decisive for OQ-1).** The user's library is **predominantly MKV** (locally downloaded series/films). WebView2 (Windows) does **not** natively decode the **MKV/Matroska container**, so the embedded `<video>`/Vidstack path will **fail on most of the user's files** even though it works for MP4/WebM/OGG. We therefore scope the internal player explicitly as a **best-effort HTML5 player** (native WebView2/WebKitGTK codec support only) and design around the failure rather than pretending it away:

1. **"Ask on play" is a first-class feature, not a footnote.** Because both internal and external playback are legitimate paths, when no preference is stored the app shows `<PlayerChoiceModal>` (Internal / External + "remember my choice"). See **Section 4.7**.
2. **Warn-and-fallback on internal failure.** When the internal player is selected and the `<video>`/Vidstack element fires an **`error`** event for an unsupported format (the expected outcome for most MKV), the player **automatically closes and re-routes to the external handoff** (`tauri-plugin-opener`) and shows a toast: *"MKV não suportado internamente — abrindo no player padrão"*. This is graceful degradation, not a hard failure.
3. `bundleMediaFramework: true` is already set for the Linux AppImage (broadens WebKitGTK codec support — Linux MKV may play where Windows WebView2 will not), so behavior is platform-dependent and the fallback path is the safety net on both.

**Consequences:**
- (+) Zero native deps; AppImage stays green (RNF-06). Internal playback "just works" for MP4/WebM and any container the webview supports.
- (+) The external handoff (which the user already relies on) is preserved and elevated to an explicit, remembered choice.
- (−) For Windows + MKV, internal playback will typically fall back to external. This is acceptable for 2.0 given the codec reality and the YAGNI constraint on native deps.
- **Deferred (2.1):** full native MKV decoding via **libmpv** (sidecar binary spawned through `tauri-plugin-shell`). Documented in Section 16 as a deliberate YAGNI deferral — **not designed in 2.0.**

**Verified versions (context7 + npm, 2026-06-06):**
- `@vidstack/react` **0.6.15**, `vidstack` **0.6.15** (latest stable on npm at verification date).
- Vidstack event/method APIs confirmed via context7 `/vidstack/player`: `audio-tracks-change` + `audioTracks.select(track)`, `text-tracks-change` + `textTracks.select(track)`, `remoteControl.setPlaybackRate(rate)`, `remoteControl.seek(time)`, `time-update` event (`e.detail` = current time), `duration-change`, `ended`.

### 4.2 Streaming the file — extend the existing server, don't add one (ADR-02 ties in)

Local files are already meant to be served by `127.0.0.1:1422`. **Add a range-capable streaming route to the Next.js standalone server**, not a new Rust HTTP server. Range support (`Accept-Ranges`/`Content-Range`/`206`) is mandatory for seek/resume to work in `<video>`.

```
// ILLUSTRATIVE — reference for the implementer
// src/app/api/stream/route.ts  (GET, supports Range)
//   ?path=<encoded absolute file path, validated against the media library roots>
//   - Reject any path not under a known Folder.path  (path-traversal guard — Lawliet)
//   - Respond 206 with Content-Range when Range header present
//   - Content-Type from extension (video/mp4, video/x-matroska, etc.)
```

Subtitles served the same way: `GET /api/subtitle?path=...` returning `text/vtt` (convert `.srt`→`.vtt` server-side on the fly; `<track>` only eats VTT).

### 4.3 Component tree / module breakdown

```
src/
  components/features/player/
    PlayerModal.tsx          // Full-screen overlay host; owns open/close; mounts Vidstack
    VideoSurface.tsx         // <MediaPlayer>/<MediaProvider> + custom layout; wires events
    AudioTrackMenu.tsx       // Reads audioTracks state, calls audioTracks.select()
    SubtitleMenu.tsx         // Lists embedded + sidecar tracks; textTracks.select()
    SpeedMenu.tsx            // remoteControl.setPlaybackRate()
    NextEpisodeOverlay.tsx   // Auto-advance countdown on 'ended'
  stores/
    playerStore.ts           // Zustand slice (see 4.5)
  services/
    playerService.ts         // resolveSources(), listSidecarSubtitles(), saveProgress(), getResume()
```

Responsibilities — single-purpose:
- `PlayerModal` knows *when* the player is open and *what* media is queued. It does **not** know codec/track details.
- `VideoSurface` owns the Vidstack instance and translates Vidstack events ↔ store actions. It does **not** persist (delegates to `playerService`).
- `playerService` owns all HTTP I/O (`/api/stream`, `/api/subtitle`, `/api/watch-history`). It does **not** touch React state.

### 4.4 IPC / interface contracts

The brief lists `open_file`, `get_tracks`, `set_audio_track`, `load_subtitle`, `save_position`, `restore_position` as **Rust↔frontend IPC commands**. Given Option C, **most of these are not Rust IPC** — they're web-layer concerns (Vidstack reads tracks from the media element; track switching is JS). Forcing them through Rust would be needless complexity (YAGNI). The split:

| Brief operation | Where it lives in 2.0 | Why |
|---|---|---|
| `open_file` | **Rust command** `resolve_media_path(mediaId, episodeId)` → absolute path + validation; OR frontend builds `/api/stream?path=`. Keep the path-resolution + traversal guard server-side. | Filesystem authority stays native/server. |
| `get_tracks` | **Web** — Vidstack `audio-tracks-change` / `text-tracks-change`. | Tracks are a property of the decoded media element. |
| `set_audio_track` | **Web** — `player.audioTracks.select(track)`. | Pure player state. |
| `load_subtitle` | **Web + server** — `<Track src="/api/subtitle?path=...">`; sidecar discovery via `list_sidecar_subtitles` (Rust, reads dir next to video). | Disk scan is native; rendering is web. |
| `save_position` | **Web → API** — `POST /api/watch-history` with `{progress%, positionSeconds}`. | Persistence already lives in Prisma/API. |
| `restore_position` | **Web → API** — `GET /api/watch-history?mediaId&episodeId` → `positionSeconds`. | Same store. |

**New `WatchHistory` field needed:** absolute seconds. `progress` (Float 0–100) exists; add `positionSeconds Int?` so resume is frame-accurate regardless of duration. Schema delta:

```prisma
// ILLUSTRATIVE — prisma/schema.prisma
model WatchHistory {
  // ...
  progress        Float?   // 0-100 (existing)
  positionSeconds Int?     // NEW: absolute resume point
  durationSeconds Int?     // NEW (optional): enables %↔seconds reconcile
}
```

**Rust commands to add** (`src-tauri/src/commands/`), registered in `commands/mod.rs` + `lib.rs` invoke handler:

```rust
// ILLUSTRATIVE — src-tauri/src/commands/player.rs
#[tauri::command]
fn resolve_media_path(media_id: String, episode_id: Option<String>) -> Result<String, String>;
// Validates the resolved path is under a known library root; returns absolute path.

#[tauri::command]
fn list_sidecar_subtitles(video_path: String) -> Result<Vec<SubtitleEntry>, String>;
// Scans the video's directory for *.srt/*.vtt with matching basename; returns {label, lang, path}.
```

(Path resolution could also be a Next API route; keeping it Rust centralizes the filesystem trust boundary. Decide in implementation — both are acceptable; the **traversal guard is non-negotiable**.)

### 4.5 State management (ADR — slice choice)

**Decision: Zustand slice**, not React Context. Rationale: playback state (`positionSeconds`, `isPlaying`, `currentMediaId`, `queue`, `activeAudioTrack`, `activeTextTrack`, `playbackRate`) updates on a high-frequency `time-update` and must be read by sibling menus without re-rendering the whole tree. Context would cause cascade re-renders on every time tick; Zustand subscribes selectively. The project has no global store yet, so this introduces one *small, scoped* slice — justified by the high-frequency update pattern (not over-engineering).

```ts
// ILLUSTRATIVE — src/stores/playerStore.ts
interface PlayerState {
  open: boolean;
  queue: PlayableEpisode[];   // for auto-advance
  index: number;
  positionSeconds: number;    // throttled write target
  activeAudioTrackId?: string;
  activeTextTrackId?: string;
  playbackRate: number;
  openMedia(media: PlayableEpisode, queue?: PlayableEpisode[]): void;
  advance(): void;            // 'ended' → next in queue
  setPosition(s: number): void;
  reset(): void;
}
```

Persisted progress is throttled: write to `/api/watch-history` **on pause, on `ended`, on close, and every 10 s** while playing (debounced), never on every `time-update` tick.

### 4.6 Resume-position data flow

```
OPEN
 user clicks "Play" on episode
        │
        ▼
 playerStore.openMedia(ep, seasonQueue)
        │
        ▼
 playerService.getResume(mediaId, episodeId)  ──GET /api/watch-history?mediaId&episodeId──▶ Prisma
        │  ◀── { positionSeconds: 742, progress: 38 }
        ▼
 VideoSurface mounts <MediaPlayer src="/api/stream?path=...">
        │ on 'can-play':
        ▼
 player.remoteControl.seek(742)           // resume at 742s  (Vidstack verified API)
        │
        ▼
 PLAYBACK ───── 'time-update' (frequent) ──▶ playerStore.setPosition(t)   // in-memory only
        │
        │  every 10s / on pause / on close / on 'ended':
        ▼
 playerService.saveProgress(mediaId, episodeId, positionSeconds=t,
                            progress = round(t/duration*100),
                            completed = progress >= 90)
        │
        ▼  POST /api/watch-history  (idempotent upsert by mediaId+episodeId — see 3.2)
      Prisma  ──▶ also mirrors into localStorage shadow (3.1)

ENDED
 'ended' event ──▶ saveProgress(completed=true) ──▶ playerStore.advance()
        │
        ▼
 NextEpisodeOverlay countdown ──▶ openMedia(queue[index+1])  // auto-advance (RF-08)
```

**"Completed" definition:** `progress >= 90%` OR `ended` event. Series rollup uses these per-episode completed flags (3.2) — never a blanket series flag.

### 4.7 Player Preference System (resolves OQ-1)

The "ask on play" flow makes both playback paths first-class. This sub-feature is a small, self-contained addition layered on top of the existing settings infrastructure.

#### 4.7.1 Where the preference lives — REALITY CHECK on the brief

The brief proposed a **Prisma `UserSettings`/`AppSettings` field** and a **`PUT /api/settings/player-preference`** route. **The real architecture does not store app settings in Prisma.** App settings live in the Rust struct `AppSettings` (`src-tauri/src/models/settings.rs`), serialized into `AppData.settings` JSON and read/written through the existing **Tauri commands `get_settings` / `save_settings`** (`src-tauri/src/commands/settings.rs`), surfaced to the renderer via `src/services/tauri.ts`. There is **already** a `default_player: String` field there.

**Decision:** persist `preferredPlayer` in the **existing `AppSettings` struct**, alongside `default_player` — *not* in Prisma, *not* behind a new Next API route. This aligns with the established settings pattern (RNF-05, "one source of truth") and avoids inventing a parallel settings store. The brief's Prisma/route proposal is **superseded by this reality check**; if the implementer ever needs an HTTP surface, it should wrap the Tauri command, not duplicate the store.

> Note on `default_player`: that existing field names *which external app* to hand off to ("default" = OS default). The new `preferredPlayer` field is orthogonal — it decides *whether* to use the internal player, the external app, or to ask. The two coexist: when the resolved choice is "external", `default_player` selects the target.

```rust
// ILLUSTRATIVE — src-tauri/src/models/settings.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub default_player: String,        // existing — which external app
    pub enable_image_cache: bool,      // existing
    pub auto_scan_on_startup: bool,    // existing
    pub theme: String,                 // existing
    pub preferred_player: String,      // NEW — "ASK" | "INTERNAL" | "EXTERNAL", default "ASK"
    pub torrent_client_port: u16,      // NEW — see Section 5.5 (default 10800)
}
// Default impl: preferred_player = "ASK".to_string(), torrent_client_port = 10800
```

TypeScript mirror (the renderer's view of settings, in `src/services/tauri.ts`):

```ts
// ILLUSTRATIVE — settings type the renderer consumes
type PreferredPlayer = "ASK" | "INTERNAL" | "EXTERNAL";
interface AppSettings {
  defaultPlayer: string;
  enableImageCache: boolean;
  autoScanOnStartup: boolean;
  theme: string;
  preferredPlayer: PreferredPlayer;   // NEW — default "ASK"
  torrentClientPort: number;          // NEW — default 10800
}
```

> If the implementer prefers an HTTP surface for parity with other 2.0 routes, an optional thin wrapper `PUT /api/settings/player-preference` (`{ preferredPlayer }`) MAY be added that simply calls the `save_settings` Tauri command. It is **not required** and must not become a second source of truth.

#### 4.7.2 `<PlayerChoiceModal>` component spec

```
src/components/features/player/
  PlayerChoiceModal.tsx   // NEW — "ask on play" dialog
```

- **Props:**
  ```ts
  // ILLUSTRATIVE
  interface PlayerChoiceModalProps {
    open: boolean;
    media: PlayableEpisode;                       // what was clicked
    onChoose: (choice: "INTERNAL" | "EXTERNAL", remember: boolean) => void;
    onCancel: () => void;
  }
  ```
- **Local state:** `remember: boolean` (the "lembrar minha escolha" checkbox, default unchecked).
- **Layout:** title ("Como deseja assistir?"), two primary buttons — **"Player interno"** and **"App de vídeo padrão"** — and a checkbox **"Lembrar minha escolha"**. For MKV files, show a subtle hint under the internal button: *"MKV pode não funcionar no player interno"* (informational, derived from the file extension).
- **Interaction flow:** on a button click → call `onChoose(choice, remember)`. If `remember === true`, the handler persists `preferredPlayer = choice` via `save_settings` and updates the in-memory settings context so the modal won't show again this session.

#### 4.7.3 Play-time decision flow

The preference is read from the settings context (already loaded at app start via `get_settings`) **before** any player is spawned:

```
user clicks "Play" on episode
        │
        ▼
 read settings.preferredPlayer   (from settings context — no async round-trip)
        │
        ├── "INTERNAL"  ─▶ open internal Vidstack player (Section 4.1)
        │                     └─ on <video> 'error' (unsupported, e.g. MKV on WebView2):
        │                          close player → external handoff → toast
        │                          "MKV não suportado internamente — abrindo no player padrão"
        │
        ├── "EXTERNAL"  ─▶ tauri-plugin-opener handoff to default_player (existing path)
        │
        └── "ASK"       ─▶ <PlayerChoiceModal open>
                              └─ onChoose(choice, remember):
                                   if remember → save_settings({ preferredPlayer: choice })
                                   then dispatch to INTERNAL or EXTERNAL branch above
```

#### 4.7.4 Settings page integration

Under the player/general settings section, add a control for `preferredPlayer` — a **radio group** (or select) with three options:

- **Perguntar sempre** (`ASK`) — default
- **Sempre player interno** (`INTERNAL`)
- **Sempre app externo** (`EXTERNAL`)

Changing it calls `save_settings` and updates the settings context immediately. This is the user's escape hatch from the modal and the place to undo a remembered choice.

---

## 4.8 Feature Architecture — Startup Autoscan

### 4.8.1 Feature overview

When `AppSettings.auto_scan_on_startup` is enabled, the app — once per startup — scans every registered folder, diffs the filesystem against the library already in SQLite, and if it finds media that is not yet catalogued, surfaces a **non-blocking notification** ("encontrei X novas mídias") with a preview and two actions: **Adicionar** (persist the new media and refresh the library) or **Ignorar** (dismiss). The entire feature **composes infrastructure that already exists** — `scanAndMatchFolder`, `getMovies`/`getSeries`, `saveMovies`/`saveSeries`, `get_settings`, the `foldersContext`, and `apiConnectivityContext`. **No new Rust commands, no new libraries, no new API routes.** The only new code is one React hook and one UI component, plus a Settings toggle.

> **Reality check on the brief (do not regress).** The brief said the diff inputs (`existingMovies`/`existingSeries`) come from `mediaContext`. **They do not.** `mediaContext` (`src/context/mediaContext.tsx`) holds only the *currently-selected* `movie`/`serie`/`watchSession` — it has **no library arrays**. The canonical "scan a folder and persist" flow already lives in `src/hooks/useActions.ts` (~lines 168–193): it sources the existing library from `databaseService.getMovies()` / `getSeries()`, runs `scanAndMatchFolder(folderId, folderPath, onProgress, existingMovies, existingSeries)`, then persists via `saveMovies([...existing, ...new])` / `saveSeries(...)`. **Autoscan MUST reuse that exact pattern** — read the library from `databaseService`, not `mediaContext` — so the diff and the persist match the manual path bit-for-bit. This is the single most important correction in this section.

### 4.8.2 Startup flow diagram (ASCII)

```
APP BOOT
  RootLayout mounts providers (Folders, ApiConnectivity, Media…)
        │  SplashScreen gating children
        ▼
  SplashScreen.onReady()  ── app becomes interactive ──▶ children render
        │
        ▼
  useStartupAutoscan()  (mounted once inside the provider tree, below Splash)
        │
        ├── hasRunThisSession?  ──── true ──▶  DO NOTHING (run-once guard, 4.8.3)
        │                                       (navigation/re-render never re-triggers)
        ▼ false
  read settings  ── tauriService.getSettings()  (Tauri get_settings)
        │
        ├── auto_scan_on_startup === false  ──▶  mark ran=true, DO NOTHING
        ▼ true
  set hasRunThisSession = true   (set BEFORE awaiting — prevents double-run)
        │
        ▼
  load existing library ONCE:
        existingMovies = getMovies()      (databaseService — NOT mediaContext)
        existingSeries = getSeries()
        │
        ▼
  for each folder in foldersContext.folders   (sequential or Promise.all, background):
        scanAndMatchFolder(folder.id, folder.path, onProgress?,
                           existingMovies, existingSeries)
        │   └─ scanAndMatchFolder already filters out paths in the existing set,
        │      so result.movies / result.series contain ONLY new, matched media.
        ▼
  aggregate across folders →  newMovies[], newSeries[],  unmatchedFiles[]
        │
        ├── isOnline === false (apiConnectivityContext)
        │        AND (unmatchedFiles.length > 0 OR scan could not match)
        │        ──▶ status = "offline-warning"   (4.8.4)  — skip TMDB-dependent matching
        │
        ├── newMovies.length + newSeries.length === 0  ──▶  status = "no-items"  (silent; no banner)
        │
        └── newMovies.length + newSeries.length > 0    ──▶  status = "found-items"
                 │
                 ▼
        <AutoscanNotification>  (non-blocking banner / bottom-sheet — NOT a modal)
                 │
                 ├── "Ignorar"   ──▶  dismiss; status = "dismissed"; nothing persisted
                 │
                 └── "Adicionar" ──▶  saveMovies([...existingMovies, ...newMovies])     (if any)
                                       saveSeries([...existingSeries, ...newSeries])     (if any)
                                       then trigger a library refresh (reload hook /
                                       refetch) so the new media appears immediately
                                       status = "added"
```

### 4.8.3 `useStartupAutoscan` hook spec

New file: `src/hooks/useStartupAutoscan.ts`. A single custom hook that encapsulates the whole autoscan lifecycle and exposes only the state the notification needs. Mounted **once**, inside the provider tree, below the Splash gate.

**State shape** (returned to the consumer):

```ts
// ILLUSTRATIVE — reference for the implementer (src/hooks/useStartupAutoscan.ts)
type AutoscanStatus =
  | "idle"            // not started / disabled
  | "scanning"        // background scan in progress
  | "found-items"     // new media found — show notification
  | "no-items"        // scan done, nothing new — stay silent
  | "offline-warning" // new files found but TMDB unreachable — can't identify
  | "added"           // user confirmed; persisted + library refreshed
  | "dismissed";      // user ignored

interface AutoscanState {
  status: AutoscanStatus;
  newMovies: Movie[];          // aggregated across all folders (already DB-diffed)
  newSeries: Series[];
  unmatchedCount: number;      // files found but not matched (drives offline-warning copy)
  confirm: () => Promise<void>; // persist new media + refresh library, set "added"
  dismiss: () => void;          // set "dismissed", persist nothing
}
```

**Side effects (in a single `useEffect` with the run-once guard):**
1. **Run-once guard.** A guard ref (`useRef(false)`) — or a module-scoped boolean — set to `true` **synchronously before any `await`**, so a re-render or a navigation that remounts the consumer cannot start a second scan. This is the "once per app lifecycle" requirement. A `useRef` is preferred over `useState` so reading/writing the guard never itself triggers a render. (If the hook can unmount/remount within a session, use a **module-scoped** flag so the guard survives remounts.)
2. **Read settings** via `tauriService.getSettings()`. If `auto_scan_on_startup === false`, set `status = "idle"` and stop. No scan, no I/O.
3. **Load existing library once** with `getMovies()` / `getSeries()` from `databaseService` (NOT `mediaContext` — see 4.8.1). Cache both in the hook so `confirm()` can build the persist union without re-fetching.
4. **Scan each folder** from `foldersContext.folders`, passing the same `existingMovies`/`existingSeries` to `scanAndMatchFolder`. Run in the background (do not block render; this is inside `useEffect`, the UI is already interactive). Set `status = "scanning"` while in flight.
5. **Offline handling.** Read `apiConnectivityContext.isOnline`. If `false`, **skip TMDB-dependent matching** and, if any new files were found on disk, set `status = "offline-warning"` with the file count. `scanAndMatchFolder` only calls TMDB for unmatched files; when offline those cannot be identified, so they surface as `unmatchedFiles`/count rather than matched `movies`/`series`. The hook must not attempt to persist unidentified media.
6. **Aggregate & classify** into `found-items` / `no-items` per the diagram.

**`confirm()`** — replicates the manual persist path (`useActions`): `saveMovies([...existingMovies, ...newMovies])` and/or `saveSeries([...existingSeries, ...newSeries])` (only the non-empty sides), then triggers the library reload so the UI reflects the additions, then sets `status = "added"`. **`dismiss()`** sets `status = "dismissed"` and persists nothing.

**Guards / invariants:**
- Runs **at most once per app lifecycle** (guard ref / module flag). Navigation, tab switches, and re-renders never re-trigger it.
- **Never blocks the UI** — all work is in `useEffect` after the app is interactive; there is no spinner gate.
- **Never persists unidentified media** — offline ⇒ warning only.
- Reads the library from `databaseService`, writes via `saveMovies`/`saveSeries` — same source of truth as the manual flow (RNF-05).

### 4.8.4 `<AutoscanNotification>` component spec

New file: `src/components/features/autoscan/AutoscanNotification.tsx`. A **non-blocking** banner / bottom-sheet (NOT a `window.confirm`, NOT a full-screen blocking modal). The user can keep using the app while it is shown.

**Props:**

```ts
// ILLUSTRATIVE — reference for the implementer
interface AutoscanNotificationProps {
  status: AutoscanStatus;          // from useStartupAutoscan
  newMedia: { movies: Movie[]; series: Series[] };
  unmatchedCount: number;
  onConfirm: () => void;           // → hook.confirm()
  onDismiss: () => void;           // → hook.dismiss()
}
```

**Local state:** `expanded: boolean` (the "Ver tudo" full-list toggle; default collapsed). No business logic in the component — confirm/dismiss delegate to the hook.

**UX states (driven by `status`):**
| `status` | Rendering |
|---|---|
| `idle` / `no-items` | Render **nothing**. |
| `scanning` | Optional subtle indicator (e.g. a small "Verificando novas mídias…" toast). Non-intrusive; MAY render nothing if scan is fast. |
| `found-items` | The banner: headline "Encontramos **X** novas mídias" (X = movies+series); a **preview list** (poster + title, **max 5**, "+N mais" overflow); actions **Adicionar** / **Ignorar**; a **"Ver tudo"** link that expands the full list (sets `expanded`). |
| `offline-warning` | Warning banner: *"Autoscan encontrou X arquivos novos, mas a conexão com a API está indisponível para identificá-los. Tente mais tarde."* No **Adicionar** action (nothing to add). A single **Fechar** / dismiss action. |
| `added` | Brief success confirmation ("X mídias adicionadas") then auto-dismiss. |
| `dismissed` | Render **nothing**. |

**Interaction:**
- **Adicionar** → `onConfirm()` → hook persists + refreshes → component shows `added` then closes.
- **Ignorar** / **Fechar** → `onDismiss()` → component disappears; scan does not re-run this session.
- **Ver tudo** → toggles `expanded` to show the complete list (does not navigate away; non-blocking).
- Component is mounted once in the layout (4.8.6) and is purely presentational over the hook's state.

### 4.8.5 Settings integration

- **Field:** `AppSettings.auto_scan_on_startup: bool` — **already exists** end-to-end (`src-tauri/src/models/settings.rs`, default `false`; persisted via `get_settings`/`save_settings`; mirrored in `src/services/tauri.ts` as `autoScanOnStartup`). **No Rust change.**
- **UI element:** add a **toggle** "Verificar novas mídias ao iniciar" to the Settings page (`src/app/(app)/settings/page.tsx`) under a **"Biblioteca"** section. Reads `settings.autoScanOnStartup`; on change calls `tauriService.saveSettings({ ...settings, autoScanOnStartup: value })` and updates the in-memory settings so it takes effect on the next startup.
- A short hint MAY note: "Ao abrir o app, procura por mídias novas nas pastas monitoradas e pergunta se deseja adicioná-las."

### 4.8.6 Layout integration

Mount the hook and the notification **once**, inside the provider tree (so `foldersContext`, `apiConnectivityContext`, and settings are available), below the Splash gate (so it runs after `onReady`). Because `app/layout.tsx` is a Server Component wrapping the providers, the cleanest seam is a small **client component** (e.g. an `AutoscanHost` or the existing client shell that already renders `{children}` after Splash) that calls `useStartupAutoscan()` and renders `<AutoscanNotification>` alongside `{children}`:

```tsx
// ILLUSTRATIVE — client component mounted once below the Splash gate
function AutoscanHost() {
  const autoscan = useStartupAutoscan();
  return (
    <AutoscanNotification
      status={autoscan.status}
      newMedia={{ movies: autoscan.newMovies, series: autoscan.newSeries }}
      unmatchedCount={autoscan.unmatchedCount}
      onConfirm={autoscan.confirm}
      onDismiss={autoscan.dismiss}
    />
  );
}
```

It must sit **below** `FoldersProvider` / `ApiConnectivityProvider` and after the SplashScreen `onReady` transition. Do **not** call the hook from a Server Component.

---

## 5. Feature Architecture — Torrent Integration

### 5.1 Threat framing (drives every decision here)

We are embedding **untrusted third-party HTML** (e.g. `apachetorrent.com`) inside a Tauri app that has IPC access to the filesystem and process control. This is the single highest-risk addition in 2.0. The governing rule: **the torrent webview must never share an origin or IPC surface with the app's main window.** → Lawliet Agent review is **mandatory** before this ships (Section 12).

### 5.2 Isolation model (ADR-03)

**Decision: a separate `WebviewWindow`/child webview with NO capabilities**, loaded with an external `https://` URL, **not** an iframe inside the main app window.

- An `<iframe>` inside the main window shares the app's CSP `frame-src` and sits one `postMessage` away from the privileged context — wrong trust boundary.
- A **separate webview** (created via `core:webview:allow-create-webview-window`, verified in context7) gets its **own capability set**. We give that capability set **no `core`/`opener`/`shell`/`dialog` permissions** — it can render web content and nothing else. The app's IPC handlers are scoped via `capabilities[].windows` to the **main** window only, so the torrent webview physically cannot invoke them.

```json
// ILLUSTRATIVE — src-tauri/capabilities/torrent.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "torrent-pane",
  "description": "Sandboxed browser pane for allowlisted torrent sites. No native access.",
  "windows": ["torrent-pane"],
  "permissions": []          // deliberately empty — render only
}
```

```json
// ILLUSTRATIVE — add to src-tauri/capabilities/default.json (main window only)
"permissions": [
  "core:default", "opener:default", "dialog:default", "dialog:allow-open",
  "dialog:allow-save", "process:allow-restart", "updater:default",
  "core:webview:allow-create-webview-window",
  { "identifier": "opener:allow-open-url",
    "allow": [ { "url": "magnet:*" } ] }   // ONLY magnet handoff, nothing else
]
```

### 5.3 Domain allowlist (no arbitrary URL open)

A Rust-side **navigation allowlist** is the second gate. Maintain a constant list of permitted hosts; intercept navigation in the torrent webview and **block** any host not on the list. The list is curated and shipped with the app (not user-editable at runtime, to keep the trust boundary fixed).

```rust
// ILLUSTRATIVE — src-tauri/src/commands/torrent.rs
const ALLOWED_TORRENT_HOSTS: &[&str] = &["apachetorrent.com"];  // curated, extend deliberately

// On the torrent WebviewWindow, attach on_navigation:
//   if !ALLOWED_TORRENT_HOSTS.iter().any(|h| url.host_str() == Some(h)) { return false; } // block
```

### 5.4 Magnet / `.torrent` interception (ADR-05)

When the user clicks a magnet link or a `.torrent` download in the sandboxed pane, navigation to a non-`http(s)` scheme or to a `.torrent` resource is intercepted by the navigation handler and **handed to the OS / configured client** — the app never parses the torrent itself.

```rust
// ILLUSTRATIVE — src-tauri/src/commands/torrent.rs
#[tauri::command]
fn intercept_torrent_link(app: tauri::AppHandle, link: String) -> Result<(), String> {
    // Accept ONLY: scheme == "magnet"  OR  url path ends_with(".torrent") from an allowed host.
    // Reject everything else.
    if link.starts_with("magnet:?") {
        // Hand off to OS default magnet handler (system torrent client).
        // Uses tauri-plugin-opener openUrl with the magnet:* allowlist (5.2).
        opener::open_url(&link, None::<&str>)?;   // OS routes to default torrent client
        Ok(())
    } else { Err("rejected: not a magnet link".into()) }
}
```

Rationale for OS handoff over bundling a torrent engine: bundling libtorrent is a large native dependency that would jeopardize the AppImage build (RNF-06) and expand attack surface massively for a feature the brief frames as "trigger downloads via uTorrent". The OS already knows the user's torrent client. **YAGNI.**

### 5.5 uTorrent JSON-RPC proxy (optional, ADR-05)

uTorrent's WebUI API lives at `http://127.0.0.1:<port>/gui/` and requires a token (`/gui/token.html`) plus the user's WebUI credentials. **Two hard problems** the brief glosses over:

1. **Port collision — RESOLVED via OQ-2.** `server.rs` already defaults the app's external API to `127.0.0.1:8080`, and uTorrent's WebUI default is also commonly 8080 — a confirmed collision. We **must not hardcode 8080** for the torrent client. The user's **actual** listening port (from their client's "Preferências > Portas de escuta") is **10800**, which does **not** collide with 8080. **Decision:** make the torrent-client port **user-configurable in Settings** via `torrent_client_port` / `torrentClientPort` (stored in the existing `AppSettings` struct — see 4.7.1), **default `10800`**. The host stays `127.0.0.1` (local client). The Rust proxy reads this port **at call time** from settings, never from a compiled-in constant. Credentials, when the WebUI requires auth, remain user-configured and live only in Rust (`torrentApiUser`, `torrentApiPass`); the API feature stays **opt-in, disabled by default**.
2. **CSRF token + auth dance.** The WebUI requires fetching a token first, sending it with every request, and HTTP Basic auth. Doing this from the webview is blocked by CORS/CSP; doing it from the browser exposes credentials in the renderer.

**Decision:** proxy through a **Rust command** (credentials never touch the renderer; CORS is irrelevant in Rust). Feature is **opt-in and disabled by default**. The command signature takes the configured port so it is read from settings at call time:

```rust
// ILLUSTRATIVE — src-tauri/src/commands/torrent.rs
#[tauri::command]
async fn proxy_torrent_api(
    port: u16,                       // from AppSettings.torrent_client_port (default 10800), read at call time
    user: Option<String>,            // optional WebUI credentials, never exposed to renderer
    pass: Option<String>,
) -> Result<serde_json::Value, String> {
    let base = format!("http://127.0.0.1:{port}");   // host fixed to localhost; port from settings
    // 1) GET {base}/gui/token.html  (Basic auth)  -> parse token from <div id='token'>
    // 2) GET {base}/gui/?list=1&token=<t>          (Basic auth, same cookie jar)
    // 3) return parsed JSON of active torrents { name, progress(per-mille), downspeed, ... }
    // reqwest is already a dependency; add a cookie jar.
}
```

> The `port` argument MUST be sourced from the live `AppSettings` (via the settings context / `get_settings`) on each invocation, so a Settings change takes effect without a rebuild or restart. Do **not** capture it in a constant or at process start.

CSP: add the *user-configured* torrent host to `connect-src` only if the feature is enabled, **or** (cleaner) keep all torrent-API traffic in Rust so the renderer never connects directly — then **no CSP change is needed** for the proxy. Recommended: Rust-only proxy, zero CSP change for the API.

### 5.6 UI/UX

**Side-panel is wrong here** — a sandboxed *separate webview* cannot be a React side-panel inside the main window (different process/origin by design, 5.2). Use a **dedicated borderless child window** ("Torrent Browser") launched from a main-window button, sized to overlay the app. Active-torrent progress (5.5) renders in the **main** window as a small status strip polling `proxy_torrent_api` every few seconds (only when enabled). This keeps untrusted HTML fully out of the React tree.

**Settings UI — Torrent Integration section (resolves OQ-2):** under the torrent settings group, expose:
- A **numeric input** "Porta do cliente torrent" (`torrentClientPort`), default **`10800`**, validated to the `1–65535` range. Persists via `save_settings` into `AppSettings.torrent_client_port` (4.7.1) and is read by `proxy_torrent_api` at call time (5.5).
- The existing opt-in toggle for the WebUI status feature (disabled by default) and optional WebUI credential fields.

A short hint should note the port is the client's "listening port" (e.g. uTorrent/qBittorrent "Preferences > Listening ports") and that the default `10800` was chosen to avoid colliding with the app's own `8080` fallback (Section 0).

### 5.7 CSP changes summary

- `frame-src`: **no change** (we are *not* iframing torrent sites — see 5.6).
- `connect-src`: **no change** if the uTorrent proxy stays Rust-only (recommended). If a direct renderer connection is ever chosen, it must be gated behind the enabled flag and the exact user host.
- New capability file `torrent.json` (empty permissions) + `core:webview:allow-create-webview-window` and `opener:allow-open-url` (`magnet:*` only) on the main window.

---

## 6. Bundle & Executable Cleanup

### 6.1 Rust release profile (`src-tauri/Cargo.toml`) — currently absent

No `[profile.release]` exists today. Add:

```toml
# ILLUSTRATIVE — src-tauri/Cargo.toml
[profile.release]
opt-level = "s"      # optimize for size (media-center binary, not CPU-bound)
lto = true           # link-time optimization
codegen-units = 1    # better optimization at cost of compile time
panic = "abort"      # drop unwind tables — smaller binary
strip = true         # strip symbols
```

Verify against current Tauri guidance before locking `panic = "abort"` (some plugins assume unwinding). `strip`/`lto`/`opt-level="s"` are safe and standard.

### 6.2 Next.js standalone output (`next.config.mjs`)

It is **standalone**, not export — do not "fix" it to export; the server is required (Section 0). Minimal-output actions:
- Keep `serverExternalPackages` (already correct — prevents bundling `better-sqlite3`/Prisma/`@tauri-apps/api`).
- Audit `scripts/prepare-build.mjs` (already modified per git status) to ship **only** `server.js`, `.next/standalone`, the minimal `.next/static`, `prisma/`, and the bundled `node.exe` — nothing else into `resources/server`.
- Add `experimental.optimizePackageImports` for the heavy UI libs actually used (`lucide-react`, `radix-ui`, `framer-motion`, `swiper`) to tree-shake icon/ä component barrels. Verify the exact key name against the installed Next 16.1.4 before committing (context7 Next.js).
- Vidstack: import only the React entry + the specific layout used; avoid pulling the full default theme if a custom layout is built.

### 6.3 MSIX cleanup checklist

- `bundle.resources` currently `["resources/server"]` — confirm `prepare-build.mjs` leaves **no** `.db`, `.map`, `node_modules/.cache`, or dev-only files under `resources/server` (the `validate_server_bundle` in `server.rs` checks chunks exist but not that junk is absent — add an exclusion pass in `prepare-build.mjs`).
- **Version alignment:** bump all three in lockstep to `2.0.0` — `package.json`, `src-tauri/Cargo.toml`, `tauri.conf.json`. (Today all read 1.1.9 — aligned; keep it that way.) The `git-release-manager` skill should drive this bump.
- MSIX manifest version must match `tauri.conf.json.version` with the 4-part `x.y.z.0` form Windows requires.
- Confirm `.db` exclusion in `copy_dir_recursive` (already present, lines ~18–24) still holds for the new `meta`/dedup migration.

### 6.4 NSIS `.exe`

- `digestAlgorithm: "sha256"` ✓ present. `timestampUrl: http://timestamp.digicert.com` ✓ present.
- Review `installer-hooks.nsh` (modified per git status) for any leftover dev path or per-user vs per-machine assumptions; ensure it does not write into the install dir at runtime (MSIX/Defender concerns mirrored in `server.rs`).
- Updater artifacts: `createUpdaterArtifacts: false` today — must be **true** (or `"v1Compatible"`) for the updater endpoint in `tauri.conf.json` to have signed artifacts to point at on the 2.0 release. Flag for `git-release-manager`.

---

## 7. Technology Stack

| Layer | Technology | Version (verified) | Verif. Date | Justification |
|---|---|---|---|---|
| Player | `@vidstack/react` + `vidstack` | 0.6.15 | 2026-06-06 (npm + context7 `/vidstack/player`) | Audio tracks, text tracks, speed, resume, accessible; zero native deps (AppImage-safe). ADR-01. |
| Player state | `zustand` | verify latest before install (context7) | — | Selective subscriptions for high-freq `time-update`. ADR. |
| Torrent webview | Tauri v2 `WebviewWindow` | tauri 2.x (in tree) | 2026-06-06 (context7 `/tauri-apps/tauri-docs`) | `core:webview:allow-create-webview-window` for isolated pane. ADR-03. |
| Magnet handoff | `tauri-plugin-opener` | 2.x (in tree) + `@tauri-apps/plugin-shell` 2.3.5 if needed | 2026-06-06 (npm) | OS handoff; `opener:allow-open-url` magnet allowlist. ADR-05. |
| Torrent API proxy | `reqwest` (already a dep) + cookie jar | 0.11 (in tree) | — | Credentials stay in Rust. ADR-05. |
| Persistence | Prisma 7 + `better-sqlite3` (existing) | 7.4.0 / 12.6.2 | from `package.json` | No change; add 2 columns + 1 dedup migration. |

> Versions for `zustand` and the precise Next 16.1.4 `optimizePackageImports` key MUST be re-verified via context7 immediately before install per project rule. context7 was **available** this session.

---

## 8. Directory Structure (delta from current)

```
src/
  components/features/player/      # NEW — Section 4.3
    PlayerChoiceModal.tsx          # NEW — "ask on play" modal (4.7, OQ-1)
  components/features/autoscan/
    AutoscanNotification.tsx       # NEW — non-blocking startup-autoscan banner (4.8)
  hooks/useStartupAutoscan.ts      # NEW — startup autoscan lifecycle hook (4.8.3)
  components/features/torrent/
    TorrentLauncherButton.tsx      # NEW — opens the sandboxed child window
    TorrentStatusStrip.tsx         # NEW — polls utorrent_list when enabled
  stores/playerStore.ts            # NEW — Zustand slice
  services/playerService.ts        # NEW — stream/subtitle/progress I/O
  services/databaseService.ts      # KEEP — becomes the ONLY watch API
  services/watchHistoryService.ts  # DELETE — legacy, buggy (BUG-2 source)
  app/api/stream/route.ts          # NEW — range-capable file streaming
  app/api/subtitle/route.ts        # NEW — srt→vtt on the fly
  app/api/db-meta/route.ts         # NEW — { generation, watchCount } for BUG-1
  app/api/watch-history/route.ts   # MODIFY — idempotent upsert; positionSeconds
src-tauri/
  src/commands/player.rs           # NEW — resolve_media_path, list_sidecar_subtitles
  src/commands/torrent.rs          # NEW — intercept_torrent_link, utorrent_*
  src/commands/mod.rs              # MODIFY — register new modules
  src/lib.rs                       # MODIFY — invoke_handler + torrent window setup
  capabilities/default.json        # MODIFY — webview-create + magnet opener
  capabilities/torrent.json        # NEW — empty-permission sandbox
  src/models/settings.rs           # MODIFY — preferred_player ("ASK"), torrent_client_port (10800)  [OQ-1/OQ-2]
src/services/tauri.ts              # MODIFY — settings TS mirror: preferredPlayer, torrentClientPort
src/app/(app)/settings/page.tsx    # MODIFY — "Biblioteca" section toggle: autoScanOnStartup (4.8.5)
src/app/layout.tsx (or client shell) # MODIFY — mount AutoscanHost (useStartupAutoscan + AutoscanNotification) below Splash (4.8.6)
prisma/
  schema.prisma                    # MODIFY — positionSeconds, durationSeconds, meta  (NOT preferredPlayer/torrentClientPort — those live in AppSettings, not Prisma)
  migrations/20260606_*/           # NEW — dedup + cleanup + new columns
```

---

## 9. Applied Design Patterns

- **Single Source of Truth** — one watch-history module (`databaseService`); delete the duplicate. (RNF-05)
- **Adapter / Bridge** — `playerService` adapts Vidstack web events to the persistence API; Rust commands adapt OS/filesystem to the renderer.
- **Strategy (graceful degradation)** — unsupported codec → fall back to external-player handoff.
- **Idempotent Upsert** — watch writes keyed by `(mediaId, episodeId)` so restore/retries cannot duplicate. (BUG-1/BUG-2)
- **Generation marker / optimistic identity** — `db_generation` distinguishes "DB wiped" from "DB slow". (BUG-1)
- **Sandbox / least privilege** — torrent webview with empty capabilities; allowlisted hosts; magnet-only opener. (RNF-04)

---

## 10. Cross-Cutting Concerns

- **AuthZ / trust boundary** — main window = privileged (IPC); torrent webview = unprivileged (render-only). Filesystem path resolution is the trust gate for streaming (traversal guard).
- **Logging** — reuse `@/lib/logger`; server logs already go to `%TEMP%/critix-server.log` (`server.rs`). Add player progress-write failures and torrent-proxy errors at `warn`.
- **Error handling** — player codec failure → user-facing "open in external player?"; torrent proxy unreachable → silent disable of the status strip (best-effort, RF-12).
- **Configuration** — torrent feature is **opt-in**, stored in existing settings (`commands/settings.rs` + app data). Defaults: disabled, no torrent host.
- **Observability** — none beyond logs; single-user app (YAGNI on metrics).

---

## 11. Scalability and Performance

- **Watch reads:** add `@@index([mediaId])` (exists) — series detail filters in memory after one indexed fetch; fine to ~5k episodes (RNF-02).
- **Progress writes:** throttled (10 s / pause / close / ended), never per `time-update` tick — avoids hammering SQLite during playback.
- **Streaming:** HTTP range requests (206) so the webview only pulls the needed byte ranges; no full-file load into memory.
- **Complexity budget:** no new long-running Rust HTTP server, no torrent engine, no native player. Every avoided component is a deliberate YAGNI decision for a single-user offline app.

---

## 12. Security (Lawliet Agent review REQUIRED before shipping 5.x)

Flag the following for **Lawliet Agent**:
- **Torrent webview isolation** — verify the empty-capability webview truly cannot reach IPC; verify navigation allowlist cannot be bypassed (redirects, `window.open`, nested frames).
- **Magnet opener allowlist** — confirm `opener:allow-open-url` is constrained to `magnet:*` and cannot be coerced into opening `file:`/`http(s)` arbitrary URLs.
- **`/api/stream` & `/api/subtitle` path-traversal** — confirm the resolved path is provably under a known `Folder.path`; reject `..`, symlinks, UNC paths.
- **uTorrent proxy credentials** — confirm WebUI user/pass never reach the renderer or logs; confirm the proxy only talks to the user-configured host.
- **CSP** — confirm no `frame-src`/`connect-src` widening leaks the privileged origin to untrusted content.

---

## 13. Dependencies and External Services

- **TMDB** — unchanged (metadata only).
- **Torrent client (OS default / uTorrent WebUI)** — external, optional, user-configured. Failure mode: handoff silently no-ops if no client registered; status strip disables if API unreachable.
- **Node sidecar** — existing critical dependency; `server.rs` health-check + crash detection already handle its lifecycle. New routes ride on it.

---

## 14. Implementation Plan (for Neo Agent)

> Ordered; later phases depend on earlier. Each phase is independently shippable behind the previous.

**Phase 0 — Version bump & guardrails** (no feature risk)
- Bump `package.json`, `Cargo.toml`, `tauri.conf.json` to `2.0.0` (use `git-release-manager`).
- Add `[profile.release]` to `Cargo.toml` (6.1).
- DoD: all three builds (MSIX/NSIS/AppImage) green at 2.0.0.

**Phase 0.5 — Startup Autoscan** (depends: none — composes existing 1.x infra; lower risk than player/torrent, ships before them)
- Create `src/hooks/useStartupAutoscan.ts` (4.8.3): run-once guard, read `auto_scan_on_startup` via `get_settings`, load existing library via `databaseService.getMovies()`/`getSeries()` (NOT `mediaContext`), scan each `foldersContext.folders` with `scanAndMatchFolder`, aggregate, classify (`found-items`/`no-items`/`offline-warning` via `apiConnectivityContext.isOnline`), expose `confirm()`/`dismiss()`. `confirm()` persists with `saveMovies`/`saveSeries` (union with existing) + refreshes library.
- Create `src/components/features/autoscan/AutoscanNotification.tsx` (4.8.4): non-blocking banner/bottom-sheet, preview (max 5 + overflow), Adicionar/Ignorar/Ver tudo, offline-warning state.
- Mount `AutoscanHost` once below the Splash gate in the layout client shell (4.8.6).
- Add the "Verificar novas mídias ao iniciar" toggle to `settings/page.tsx` under a "Biblioteca" section (4.8.5) — writes existing `autoScanOnStartup` via `save_settings`. **No Rust change.**
- DoD: CA-24…CA-30 pass.

**Phase 1 — BUG-2 consolidation** (depends: none)
- Add `positionSeconds`, `durationSeconds` to `WatchHistory`; add `meta` table; create dedup+cleanup migration (3.2).
- Make `/api/watch-history` POST an idempotent upsert by `(mediaId, episodeId)`.
- Delete `watchHistoryService.ts`; repoint `MovieDetails.tsx` to `databaseService`.
- DoD: CA-04…CA-07 pass.

**Phase 2 — BUG-1 persistence** (depends: Phase 1 — needs the meta table & upsert)
- Add `GET /api/db-meta`; replace shadow-restore heuristic with `db_generation` logic (3.1); make shadow delete-aware on all paths.
- DoD: CA-01…CA-03 pass.

**Phase 3 — Streaming server routes** (depends: none; can parallel 1–2)
- `GET /api/stream` (range/206), `GET /api/subtitle` (srt→vtt), path-traversal guard.
- Rust `resolve_media_path`, `list_sidecar_subtitles` (4.4).
- DoD: a local file streams + seeks in a browser tab against `127.0.0.1:1422`.

**Phase 4 — Embedded player + player preference** (depends: Phase 3 for streams, Phase 1–2 for progress)
- Install `@vidstack/react@0.6.15` + `zustand` (verify); build `player/` components + `playerStore` + `playerService` (4.3–4.6).
- Wire audio/subtitle/speed/resume/auto-advance to verified Vidstack APIs.
- **Player Preference System (4.7, resolves OQ-1):** add `preferred_player: String` (default `"ASK"`) to the Rust `AppSettings` struct (`src-tauri/src/models/settings.rs`) and its TS mirror in `src/services/tauri.ts`; **no Prisma change** — settings are not in Prisma. Build `<PlayerChoiceModal>` (4.7.2), the play-time decision flow (4.7.3), warn-and-fallback on `<video>` `error` (ADR-01), and the Settings radio control (4.7.4).
- DoD: CA-08…CA-13 **and CA-20…CA-22** pass.

**Phase 5 — Torrent integration** (depends: Phase 0; independent of player) — **Lawliet review gate**
- `capabilities/torrent.json` (empty); main-window webview-create + `magnet:*` opener (5.2).
- `torrent.rs`: navigation allowlist, `intercept_torrent_link`, optional `proxy_torrent_api` proxy.
- **Torrent port setting (5.5/5.6, resolves OQ-2):** add `torrent_client_port: u16` (default `10800`) to the Rust `AppSettings` struct + TS mirror; `proxy_torrent_api` reads it at call time; add the numeric Settings input. **No Prisma change.**
- `TorrentLauncherButton`, `TorrentStatusStrip`, child window (5.6).
- DoD: CA-14…CA-18 **and CA-23** pass **and** Lawliet sign-off.

**Phase 6 — Bundle audit & release**
- `prepare-build.mjs` exclusion pass; `optimizePackageImports`; `createUpdaterArtifacts: true`; MSIX manifest version; signed updater artifacts (6.2–6.4).
- DoD: clean MSIX, signed NSIS, working AppImage, updater `latest.json` valid.

---

## 15. Acceptance Criteria (for Agent Smith)

- **CA-01** — After an MSIX update that recreates `critix.db`, watched state is restored from shadow exactly once and matches pre-update state.
- **CA-02** — On a normal restart with a populated DB, **no** shadow restore runs (assert log absence + no duplicate rows).
- **CA-03** — Two consecutive restarts never increase `WatchHistory` row count for unchanged data (idempotency).
- **CA-04** — Marking S1E1 watched leaves S1E2 and S2E1 unwatched.
- **CA-05** — Marking an entire season watched, then adding S+1, lets the user unmark any prior season independently.
- **CA-06** — No row with `mediaType='SERIES' AND episodeId IS NULL AND completed=1` exists after migration.
- **CA-07** — `isSeasonWatched` returns true only when every episode row for that season is `completed`.
- **CA-08** — A local `.mp4`/`.mkv` plays in the embedded player and seeks correctly (range requests served).
- **CA-09** — When a file has 2 audio tracks, both appear and switching changes the audio.
- **CA-10** — A sidecar `movie.srt` next to the video is offered and renders as captions.
- **CA-11** — Playback speed can be set to 0.5/1/1.5/2× and takes effect.
- **CA-12** — Reopening a partially watched episode resumes within 1 s of the saved `positionSeconds`.
- **CA-13** — On `ended`, the next episode in the season auto-advances after the countdown.
- **CA-14** — Opening the torrent pane navigates only to allowlisted hosts; a non-allowlisted host is blocked.
- **CA-15** — The torrent webview cannot invoke any app IPC command (attempted invoke is denied).
- **CA-16** — Clicking a magnet link hands off to the OS torrent client; a non-magnet scheme is rejected.
- **CA-17** — With the uTorrent proxy disabled (default), no connection to any torrent API is attempted.
- **CA-18** — With it enabled and configured, the status strip lists active torrents; credentials never appear in renderer or logs.
- **CA-19** — MSIX/NSIS/AppImage all build at 2.0.0; `resources/server` contains no `.db`/`.map`/cache files.
- **CA-20** *(OQ-1)* — With `preferredPlayer = "ASK"` (default), clicking Play shows `<PlayerChoiceModal>`; choosing without checking "remember" does not persist a preference (next Play asks again).
- **CA-21** *(OQ-1)* — Checking "remember" and choosing INTERNAL/EXTERNAL persists `preferred_player` in `AppSettings`; subsequent Play skips the modal; the Settings radio reflects and can change the value.
- **CA-22** *(OQ-1)* — Selecting INTERNAL on an unsupported MKV triggers the `<video>` `error` path: the internal player closes, the external handoff opens, and the toast "MKV não suportado internamente — abrindo no player padrão" is shown.
- **CA-23** *(OQ-2)* — `torrentClientPort` defaults to `10800`, is editable in Settings (validated 1–65535), and `proxy_torrent_api` connects to `127.0.0.1:<configured port>` (changing the setting changes the target without a restart); no value is hardcoded to 8080.
- **CA-24** *(Autoscan)* — With `auto_scan_on_startup = false` (default), startup runs **no** scan and shows **no** notification (assert `scanAndMatchFolder` is not called).
- **CA-25** *(Autoscan)* — With it enabled and a monitored folder containing a media file **not** in the DB, startup shows the `<AutoscanNotification>` banner reporting the correct count, with a preview of up to 5 items and a "+N mais" overflow when more.
- **CA-26** *(Autoscan)* — With it enabled and **no** new media on disk (everything already catalogued), startup shows **no** banner (`status = "no-items"`), silently.
- **CA-27** *(Autoscan)* — Clicking **Adicionar** persists the new media (via `saveMovies`/`saveSeries`, union with existing) and the library view reflects the additions without an app restart; clicking **Ignorar** persists nothing.
- **CA-28** *(Autoscan)* — The scan runs **at most once per app lifecycle**: navigating between pages, switching folders, or re-rendering does not trigger a second scan (assert the guard prevents a second `scanAndMatchFolder` pass).
- **CA-29** *(Autoscan)* — While the scan runs, the UI is **not blocked** (no full-screen modal, no `window.confirm`); the user can interact with the app.
- **CA-30** *(Autoscan)* — When `apiConnectivityContext.isOnline === false` and new files are found on disk, the notification shows the offline warning ("…a conexão com a API está indisponível para identificá-los. Tente mais tarde.") and **no** unidentified media is persisted (no `saveMovies`/`saveSeries` call).

---

## 16. Out of Scope
- Bundling a torrent engine (libtorrent) or parsing `.torrent` files in-app.
- A native (libmpv) player. **Deferred to 2.1 (see below).**
- DRM / adaptive streaming (DASH/HLS) — local files only.
- Multi-user, cloud sync, or remote streaming.
- Replacing the Next.js standalone server with a Rust HTTP server.
- Making the torrent host allowlist user-editable at runtime.

### 16.1 Deferred to 2.1 — Native MKV via libmpv (YAGNI for 2.0)

OQ-1 confirmed MKV is the dominant format and WebView2 cannot decode the MKV container, so 2.0 relies on the best-effort HTML5 player + warn-and-fallback (ADR-01). Full native MKV decoding is a **deliberate deferral**, not an oversight:

- **Approach (when built):** ship a small **libmpv** sidecar binary, spawned via **`tauri-plugin-shell`**, rendered in/over the webview; the existing `playerStore`/`playerService` and `WatchHistory` progress contracts (4.5/4.6) would back it unchanged.
- **Why deferred:** a native player binary is a large per-platform dependency that risks the Linux AppImage build (RNF-06) and expands surface area for a single-user catalog. The warn-and-fallback path already gives users working playback (external app) for MKV today. Building libmpv now would violate YAGNI.
- **Do NOT design or implement libmpv in 2.0.** This bullet is the pointer for a future Blueprint.

## 17. Risks and Open Questions
- **R1 (codec ceiling) — RESOLVED (OQ-1).** WebView2 does not decode the MKV container, and MKV is the user's dominant format. Resolution: internal player is best-effort HTML5 with **warn-and-fallback** to the external player on `<video>` error; a per-user **`preferredPlayer`** (Ask/Internal/External) governs the choice (4.7); full MKV via libmpv deferred to 2.1 (16.1). User accepted this trade-off.
- **R2 (port 8080 collision) — RESOLVED (OQ-2).** The user's torrent listening port is **10800**, which avoids the app's `8080` fallback. Resolution: `torrentClientPort` is **user-configurable in Settings**, default `10800`, read by `proxy_torrent_api` at call time (5.5/5.6). Torrent API stays opt-in, default-off.
- **R3 (`panic = "abort"`)** — verify no in-tree plugin requires unwinding before locking it.
- **R4 (legacy callers)** — confirm no component other than `MovieDetails.tsx` imports `watchHistoryService` before deletion (grep showed only that file; re-verify at implementation time).
- **R5 (createUpdaterArtifacts)** — currently `false`; the live updater endpoint needs signed artifacts. Confirm release flow with `git-release-manager`.
- **OQ1 (path resolution location)** — Should media path resolution live in Rust or in the Next API route? Both acceptable; pick one to own the traversal guard. *(This is a separate, still-open implementation detail — distinct from the resolved OQ-1 player question above.)*

---

## Handoff
- Generated artifact:  /mnt/e/WorkSpace/PESONAL_PROJECTS/CRITIX/critix_vault_desktop/docs/tech/BLUEPRINT_2.0.md
- Status:              Approved (OQ-1, OQ-2 resolved) — ready for Neo Agent
- Next agent:          Neo Agent (implementation)
- Required action:     Implement the plan in Section 14, phase by phase. Startup Autoscan (Section 4.8) lands in Phase 0.5 (lower risk, ships before player/torrent). OQ-1 (player preference, 4.7) lands in Phase 4; OQ-2 (torrent port, 5.5/5.6) lands in Phase 5.
- Notes:               Section 5 (Torrent) MUST pass Lawliet Agent review (Section 12) before shipping. Re-verify `zustand` and the Next 16.1.4 `optimizePackageImports` key via context7 immediately before install.
                       IMPORTANT reality check (do not regress): `preferredPlayer` and `torrentClientPort` live in the Rust `AppSettings` struct (`src-tauri/src/models/settings.rs`) + its TS mirror in `src/services/tauri.ts`, persisted via the existing `save_settings`/`get_settings` Tauri commands — they are NOT Prisma fields and need NO new Next API route. The brief's Prisma-field / `PUT /api/settings/player-preference` proposal is superseded by 4.7.1.
                       The brief's "static export" and "Axum/Warp server.rs" framings were corrected against the real code (Section 0).
                       Startup Autoscan reality check (do not regress, Section 4.8.1): the diff inputs (existingMovies/existingSeries) come from databaseService.getMovies()/getSeries(), NOT from mediaContext — mediaContext holds only the currently-selected item, it has no library arrays. Reuse the exact scan+persist pattern already in src/hooks/useActions.ts. No new Rust commands, no new libraries, no new API routes for this feature.
```