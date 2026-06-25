# Test Report-001 — Critix Vault Desktop: 502 first-scan / audio-language mismatch / DB ABI crash on backup restore

## Metadata
- Project:           Critix Vault Desktop
- Date:              2026-06-22
- QA:                Agent Smith
- Base Blueprint:    N/A (defect-driven audit — no Blueprint supplied; tested against reproduction steps + observed behavior)
- Mode:              Initial Audit
- Iteration:         1st

## 1. Test Scope
In scope — root-cause analysis of three reported defects:
1. 502 Bad Gateway on first folder scan (external API proxy).
2. Audio-language selection plays wrong track; "Trocar idioma" button never appears.
3. Database fails entirely after attempting backup restore (NODE_MODULE_VERSION ABI mismatch).

Code paths examined:
- `src/app/api/external/[...path]/route.ts`
- `src/components/features/player/VideoSurface.tsx`
- `src/app/api/probe/route.ts`
- `src/app/api/hls/start/route.ts`
- `src/lib/prisma.ts`
- `src/app/api/settings/backup/route.ts`
- `src/services/folderScanService.ts`
- `src-tauri/tauri.conf.json`, `package.json`, `.github/workflows/ci.yml`, `scripts/prepare-build.mjs`

Out of scope — runtime reproduction inside the packaged Tauri binary (no installer available in this environment); Rust-side command layer; FFmpeg binary behavior. There is no automated test suite in this repo (`npx tsc --noEmit` is the only check), so all findings are static-trace based, classified Confirmed only where the mechanism is unambiguous in source.

## 2. Test Strategy
Static dynamic-tracing audit. For each defect I reconstructed the full causal chain from the reported symptom back to the originating line, cross-checking state transitions, async ordering, and build-pipeline data flow. No code was written or modified — specification only. Test pyramid recommendation favors unit/integration coverage at the API-route and state-machine level, where these defects live.

## 3. Execution Results
- Build:             Not executed (packaged Tauri build unavailable in this environment; defects are deterministic and source-traceable).
- Test suite:        N/A — no automated test suite exists in the repository.
- Linter:            Not run this pass.
- Current coverage:  0% automated. The three defective subsystems (external proxy, player transcode state machine, DB init singleton) have no tests.

## 4. Defects Found

### DEF-001 — External API proxy returns 502 on cold start; first folder scan fails
- Severity:      High
- Status:        Confirmed
- Component:     `src/app/api/external/[...path]/route.ts:73` (5s timeout) + cold-start race; secondary `src/services/folderScanService.ts:174-199` (DB-cache skip on rescan)
- Violated acceptance criterion: N/A (no Blueprint) — violates implicit contract "first scan must match media when online".
- Description:
  The proxy aborts every external request after a hard 5-second deadline (`AbortSignal.timeout(5_000)`). On first launch the timeout coincides with three cold-start costs that do not exist on rescan:
  (a) TLS/DNS cold connection to `api-critix.wallacedev.com.br` (no warm keep-alive socket yet);
  (b) the Next.js sidecar is still "warming up the database (instrumentation)" per the log — the event loop is contended by `initializeDatabase()` running migrations synchronously via `better-sqlite3`, starving the proxy's fetch;
  (c) the very first `/status` probe in the log times out (`TimeoutError: The operation was aborted due to timeout`), which means even the lightest call exceeded 5s under cold load.
  On rescan it "works" not because the network got faster but because `folderScanService.scanAndMatchFolder()` filters out files already persisted in SQLite (lines 160-199: `newMediaFiles` becomes empty → early return at line 182 with zero external calls). The external API is simply never hit on rescan. The 502 is therefore latent, not fixed — any genuinely new media on a warm app could still trip it.
- Steps to reproduce:
  1. Cold-launch the packaged app.
  2. Add a folder with media not yet in the DB.
  3. Observe 502 EXTERNAL_API_ERROR on `/media/v1/search/title` calls while the DB warms up.
  4. Rescan the same folder → succeeds (external API skipped because data is cached).
- Expected:      First scan completes matches when the device is online; transient cold-start/network slowness is tolerated via retry/backoff, not surfaced as a hard 502.
- Observed:      First scan 502s; success on rescan is an artifact of cache-skip, masking the defect.
- Suggested correction area:
  - Raise the timeout for cold start and/or make it configurable (e.g. 15s) in `route.ts:73`; 5s is too aggressive for a first TLS handshake under event-loop contention.
  - Add bounded retry with exponential backoff (e.g. 2-3 attempts) on `TimeoutError`/network errors in `forward()` before returning 502.
  - Gate folder-scan external calls behind a server-readiness check (await `/api/health` warm before firing search calls) so scans don't race DB warm-up. Consider deferring `initializeDatabase()` heavy work off the request path or yielding the event loop.
  - Distinguish 502 (upstream returned error) from 504 (our timeout) — currently a client-side abort is mislabeled 502.

### DEF-002 — Audio language: wrong track plays and "Trocar idioma" button never appears
- Severity:      High
- Status:        Confirmed
- Component:     `src/components/features/player/VideoSurface.tsx` — multiple: lines 233-236 (`needsTranscode` early-return), 313-318 + 325 (raw stream during `transcoding`), 452 (`hasMultipleAudioRef` gated behind `status === "ready"`); root gate `src/app/api/probe/route.ts:124-127` (`needsTranscode` based on first audio stream only).
- Violated acceptance criterion: N/A — violates implicit contract "user-selected audio language is the one that plays; user can switch language during playback".
- Description: This is two coupled defects sharing one root cause.

  (1) Wrong language plays. The state machine mounts the player on the RAW stream during `status: "transcoding"` (`playerReady = !isProbing && !isSelectingAudio` is true while transcoding — line 325; `playerSrc` returns `buildStreamUrl(item.filePath)` for any non-`ready` status — lines 313-318). The raw MKV is served with ALL its audio tracks, and Vidstack/WebView2 picks the container's DEFAULT audio track, which is commonly `eng` — NOT the `por` the user selected. The user's selection (`selectedAudioIndex`) only affects the FFmpeg transcode output, which doesn't load until `status: "ready"` 30-60s later. For the entire transcoding window the user hears the wrong language and reasonably concludes selection was ignored. If the user closes the player before transcode finishes, they never hear the selected track at all.

  (2) Button never appears — and worse, transcode may be skipped entirely. The "Trocar idioma" button is rendered only when `transcode.status === "ready"` (line 445/452). `status: "ready"` is reached ONLY through the `needsTranscode === true` path (lines 258-280). But `needsTranscode` is computed from the FIRST audio stream's codec only (`probe/route.ts:124-127`). Real-world multi-language MKVs frequently order tracks as `[0]=eng AAC, [1]=por AC3`. Because stream 0 (AAC) is supported, `needsTranscode` is `false` → the init() function early-returns at line 233-236 with `status: "idle"`, the audio-select modal is never shown, no transcode runs, and the player plays the raw file with its default (eng) track. `hasMultipleAudioRef` is set (line 231) but the button is gated on `status === "ready"` which is never reached, so the user has NO way to switch to `por`. The reported "modal appeared, I chose por, eng played, button missing" matches the inverse ordering `[0]=por-supported / [1]=eng` OR a transcode that was abandoned — in both cases the symptom is that the selection never reaches `ready`.

- Steps to reproduce:
  - Variant A (wrong track during transcode): Open MKV whose first audio is AC3/DTS (unsupported) with por+eng tracks; select por; observe eng plays for the 30-60s transcode window before the correct track loads.
  - Variant B (button missing / transcode skipped): Open MKV whose first audio stream is a SUPPORTED codec (e.g. AAC eng) but also has a por track. `needsTranscode=false` → no modal, no transcode, raw eng plays, "Trocar idioma" absent because `status` never reaches `ready`.
- Expected:
  - The selected audio language is what plays; if the raw stream is shown during transcode, its default audio must not contradict the user's choice (mute raw audio during transcode, or do not mount raw audio at all).
  - "Trocar idioma" is available whenever the file has >1 audio track, regardless of transcode status.
  - `needsTranscode` accounts for ALL audio streams (a file is transcodable if ANY playable target requires it), not just stream 0.
- Observed:      Default container track (often eng) plays despite `por` selection; switch button gated behind `ready` and frequently never shown.
- Suggested correction area:
  - Show the audio-select modal whenever there are multiple audio streams, even if `needsTranscode` is false — so the user can force a re-mux to their language. Decouple "user wants a specific track" from "codec is unsupported".
  - In `probe/route.ts`, compute `needsTranscode` per selected stream, or return per-stream `needsTranscode` flags so the client can decide after selection. Move the transcode decision to AFTER audio selection, not before.
  - Gate the "Trocar idioma" button on `hasMultipleAudioRef.current && (status === "ready" || status === "idle")` so it is reachable on non-transcoded multi-track files too — or render it whenever the player is mounted and multiple tracks exist.
  - During `status: "transcoding"`, either suppress raw-stream audio (mute) so the user isn't fed the wrong language, or surface a clear "preparing your language" state rather than autoplaying default audio.

### DEF-003 — Database fails entirely after backup restore: better-sqlite3 ABI mismatch + poisoned init singleton
- Severity:      Critical
- Status:        Confirmed
- Component:     Build pipeline `scripts/prepare-build.mjs:563` (copies dev-compiled `better-sqlite3.node` verbatim) + `package.json:14` / `.github/workflows/ci.yml:28-30` (no rebuild against Tauri Node ABI); amplified by `src/lib/prisma.ts:161-216` (init singleton + `prismaInstance` left non-null after partial failure).
- Violated acceptance criterion: N/A — violates hard contract "the database must load and persist data".
- Description: Two distinct defects; the first is the trigger, the second turns a recoverable error into a total, persistent failure.

  (1) Root cause — ABI mismatch at build time. `better_sqlite3.node` was compiled against `NODE_MODULE_VERSION 147` (Node 24.x) but the Tauri-bundled sidecar runs `NODE_MODULE_VERSION 137` (Node 22.x). The native addon is never rebuilt for the runtime ABI: `prepare-build.mjs` (line 563, `cpSafe(STANDALONE, SERVER_DEST, ...)`) copies the Next.js standalone bundle — including whatever `.node` the developer's local `bun install` compiled — straight into `resources/server`. Nothing in `build:app` (`prisma generate && tauri build`), in `prepare-build.mjs`, or in CI runs `npm rebuild better-sqlite3` / `npm rebuild --runtime=node --target=<tauri-node-version>`. CI even pins `node-version: 20` (ci.yml:30) while the dev machine here used Node 24 and the Tauri runtime is Node 22 — three different Node majors in play, none reconciled. So the shipped `.node` matches the build machine, not the runtime. The error only surfaces when a code path that actually instantiates `better-sqlite3` runs (migration init / `prisma.folder.count()`); the backup-restore route is simply the first heavy DB path many users hit.

  (2) Amplifier — poisoned singleton makes it permanent. In `getPrismaClient()` (prisma.ts:170-216) the init IIFE assigns `prismaInstance = new PrismaClient(...)` at line 197 BEFORE `initializeDatabase()` (203) and `validateSchemaReady()` (205) run. When `better-sqlite3` throws inside `initializeDatabase()` it is swallowed by the try/catch at lines 147-149 (logs, returns), so init does NOT reject there — but then `validateSchemaReady` (`await db.folder.count()`, line 153) throws the same ABI error, rejecting the promise. The `finally` at line 213-215 nulls `initializationPromise` (good for retry) BUT `prismaInstance` was already set to a non-null, broken client at line 197 and is never reset to null. On the next call, line 162 `if (prismaInstance && dbPath) return prismaInstance;` returns the BROKEN client immediately, skipping init entirely. Every subsequent DB call fails forever until the process restarts. This is why "the entire database fails to load" after the restore attempt — the error is sticky by construction. Note the restore route also wraps everything in `db.$transaction` (backup/route.ts:290), so a mid-restore native crash can additionally leave an open/aborted transaction.

- Steps to reproduce:
  1. Build via `bun run build:app` on a machine whose local Node ABI differs from the Tauri-bundled Node (here: dev Node 24, runtime Node 22).
  2. Launch the packaged app; trigger any DB-instantiating path (backup restore).
  3. Observe `NODE_MODULE_VERSION 147 ... requires 137` error; `prisma.folder.count()` / `findMany()` invalid; import fails.
  4. All subsequent DB operations fail for the remainder of the process lifetime.
- Expected:      The bundled `better-sqlite3.node` matches the Tauri runtime ABI; DB loads. A transient init failure must not permanently poison the client — a retry must be able to re-initialize.
- Observed:      ABI mismatch crashes DB init; broken singleton cached → permanent total DB failure.
- Suggested correction area:
  - PRIMARY (build): pin and reconcile Node versions. Determine the exact Node version Tauri bundles for the sidecar and rebuild `better-sqlite3` against it before copying into `resources/server` — e.g. `npm rebuild better-sqlite3 --build-from-source` (or `prebuild-install`/`node-gyp` targeting that ABI) as an explicit step in `prepare-build.mjs` after the copy, or use `@electron/rebuild`-style targeting. Set CI `node-version` to match the runtime, and pin the dev environment via `.nvmrc`/`engines`. Add a build-time assertion that the copied `.node`'s `NODE_MODULE_VERSION` equals the runtime's.
  - SECONDARY (resilience, prisma.ts): do NOT assign `prismaInstance` until init fully succeeds — move `prismaInstance = client` to after `validateSchemaReady`, or in the `catch`/`finally` set `prismaInstance = null` on failure so a retry actually re-inits instead of returning a broken client. Wrap the IIFE in try/catch that resets both `prismaInstance` and `initializationPromise` on rejection.
  - Add a startup self-test that surfaces ABI mismatches with an actionable message rather than a generic 500.

## 5. Coverage Analysis
No automated coverage exists. Gaps that directly enable these defects:
- External proxy: no tests for timeout behavior, retry, or cold-start; no separation of 504 vs 502.
- Player transcode state machine: no tests for the `needsTranscode`-on-first-stream-only logic, the raw-stream-during-transcoding audio behavior, or button visibility across all five states.
- Probe route: no tests for multi-audio-stream files with mixed codecs.
- prisma.ts init singleton: no tests for init-failure recovery / poisoned-instance behavior.
- Build pipeline: no validation that the bundled native addon matches the runtime ABI.

## 6. Test Case Specification (for Neo to implement)

### TC-001 — Proxy surfaces timeout as 504 with retry, not immediate 502
- Type:          Integration
- Priority:      High
- Preconditions: Mock upstream that delays > timeout on first call, responds fast on retry.
- Steps:         Call `/api/external/media/v1/search/title?query=x` against the slow mock.
- Expected result: Proxy retries (configurable N times w/ backoff) before failing; a pure client-side timeout returns 504, an upstream 5xx returns 502; success on retry returns 200.
- Covered acceptance criterion: DEF-001.

### TC-002 — First scan does not fire external calls before server is warm
- Type:          Integration
- Priority:      High
- Preconditions: Fresh DB, online.
- Steps:         Trigger a folder scan immediately at cold start.
- Expected result: Scan awaits `/api/health` readiness; external search calls succeed (no 502) for new media.
- Covered acceptance criterion: DEF-001.

### TC-003 — needsTranscode considers all audio streams, decided after selection
- Type:          Unit
- Priority:      High
- Preconditions: ffprobe JSON fixture: `[0]=aac(eng), [1]=ac3(por)`.
- Steps:         Run probe transform; then select stream 1.
- Expected result: Multi-track files trigger the audio-select modal regardless of stream-0 codec; transcode runs for the SELECTED stream when that stream's codec is unsupported.
- Covered acceptance criterion: DEF-002.

### TC-004 — Selected audio language is what the user hears
- Type:          Integration (player harness)
- Priority:      High
- Preconditions: MKV fixture with eng+por audio; user selects por.
- Steps:         Drive VideoSurface through selecting-audio → transcoding → ready.
- Expected result: During transcoding the raw stream's contradicting audio is muted/suppressed; on `ready` the por track plays. The user never hears eng after selecting por.
- Covered acceptance criterion: DEF-002.

### TC-005 — "Trocar idioma" reachable for any multi-track file
- Type:          Unit (component render)
- Priority:      Medium
- Preconditions: `hasMultipleAudioRef=true`.
- Steps:         Render VideoSurface in `idle`, `transcoding`, and `ready` states.
- Expected result: Switch-language button is present whenever multiple audio tracks exist and the player is mounted — not only in `ready`.
- Covered acceptance criterion: DEF-002.

### TC-006 — Prisma init failure does not poison the singleton
- Type:          Unit
- Priority:      Critical
- Preconditions: Mock `better-sqlite3` / `validateSchemaReady` to throw on first call, succeed on second.
- Steps:         Call `getPrismaClient()` twice.
- Expected result: First call rejects; second call re-runs full init and returns a working client. `prismaInstance` is never left as a non-null broken client.
- Covered acceptance criterion: DEF-003.

### TC-007 — Build asserts native addon ABI matches runtime
- Type:          Integration (build script)
- Priority:      Critical
- Preconditions: `resources/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node` present.
- Steps:         Run the prepare-build ABI assertion against the Tauri-bundled Node version.
- Expected result: Build fails loudly if `NODE_MODULE_VERSION` of the bundled `.node` != runtime ABI; passes when rebuilt for the correct target.
- Covered acceptance criterion: DEF-003.

## 7. Resilience and Reliability
- DEF-001: Single hard timeout with no retry and no readiness gate = brittle under the exact conditions of first launch. Graceful degradation absent.
- DEF-002: State machine optimizes for "show video fast" at the cost of feeding the user the wrong audio; the failure is silent (no error, wrong content). The `needsTranscode`-on-stream-0 shortcut is a correctness hole, not a perf win.
- DEF-003: The most severe reliability flaw — a recoverable native-load error is converted into a permanent, process-wide DB outage by the eager `prismaInstance` assignment. Even after the underlying ABI is fixed, the poisoned-singleton pattern remains a latent reliability bug for ANY init failure (locked DB file, corrupt schema, disk full). Must be fixed independently of the ABI issue.

## 8. Non-Functional Checks
- Security: `resolveAndGuardPath` is used on stream/probe/hls paths (good, path-traversal guarded). The external proxy enforces an allowlist (`/status`, `/media/`) — acceptable. No new security regressions identified in these diffs; recommend Lawliet Agent for a dedicated pass on the backup-restore deserialization path (it ingests arbitrary JSON into upserts).
- Performance: DEF-001's 5s timeout and synchronous migration init on the request path are the relevant hotspots.
- Accessibility: not assessed this pass.

## 9. Verdict
- Status:       REJECTED — requires correction
- Blockers:     DEF-003 (Critical), DEF-001 (High), DEF-002 (High). All three block approval.
- Summary:      Three confirmed, fully-traced defects. DEF-003 is the most dangerous: an unreconciled Node ABI in the build pipeline crashes the DB, and a poisoned init singleton makes the failure permanent — these are two separate fixes. DEF-002 is a correctness hole where the wrong audio language plays and the recovery button is unreachable, rooted in deciding `needsTranscode` from stream 0 only and mounting the raw stream's audio during transcode. DEF-001 is a brittle cold-start timeout whose apparent "fix on rescan" is an illusion caused by SQLite cache-skip. None of these subsystems have automated tests.

## 10. Action Items (for Neo Agent)
1. [Critical] DEF-003 build: rebuild `better-sqlite3` against the Tauri-bundled Node ABI in `prepare-build.mjs`; reconcile dev/CI/runtime Node versions; add ABI assertion.
2. [Critical] DEF-003 resilience: fix `prisma.ts` so a failed init never caches a broken `prismaInstance` (defer assignment until after `validateSchemaReady`, reset to null on failure).
3. [High] DEF-002: decide `needsTranscode` per-selected-stream / across all streams; show audio modal for any multi-track file; suppress raw-stream audio during transcoding; make "Trocar idioma" reachable outside `ready`.
4. [High] DEF-001: raise/retry the proxy timeout (504 vs 502), gate scan external calls behind server readiness, offload heavy DB init off the request path.
5. Implement TC-001 through TC-007.
6. Re-invoke Agent Smith in Validation Mode after fixes.

## Handoff
- Generated artifact:  docs/test-reports/Test-Report-001.md
- Mode:                Initial Audit
- Verdict:             REJECTED
- Open defects:        1 Critical (DEF-003), 2 High (DEF-001, DEF-002)
- Next agent:          Neo Agent
- Required action:     Invoke Neo Agent to fix DEF-001, DEF-002, DEF-003 and implement TC-001..TC-007.
                       After that, re-invoke Agent Smith in Validation Mode.
