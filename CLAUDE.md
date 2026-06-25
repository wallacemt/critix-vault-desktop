# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

**Critix Vault** is a desktop media library app that scans local folders for movies/series and presents them in a streaming-service-style UI. Built with **Tauri 2.x** (Rust shell) + **Next.js 16** (frontend + API server) + **SQLite via Prisma**.

## Commands

```bash
# Development
bun run dev              # Next.js dev server on localhost:3000 (frontend only)
bun run tauri:dev        # Full Tauri app in dev mode (spawns Next.js + Tauri window)

# Build
bun run build:app        # prisma generate + tauri build (production installer)
bun run build            # Next.js standalone build only

# Type-check (no separate test suite)
npx tsc --noEmit

# Lint
bun run lint

# Database migrations (development only — production runs them automatically at startup)
npx prisma migrate dev --name <migration_name>
```

**Runtime ports:** Next.js runs on `127.0.0.1:1422` in production (bundled inside Tauri), and `localhost:3000` in `bun run dev`. Client code uses `window.location.origin` so it works in both modes.

## Architecture

### Two-process model

In production Tauri starts a bundled Next.js server (port 1422) from `src-tauri/src/server.rs`, waits for `/api/health` to respond, then navigates the WebView2 window to `http://127.0.0.1:1422`. In dev, Next.js runs normally and Tauri opens `http://localhost:3000`.

**Rust (src-tauri/src/)** handles OS-level work only:
- `commands/` — Tauri `invoke` handlers: folder dialogs, file scan, open media, image cache, player path resolution, torrent proxy, data import/export
- `storage/` — on-disk cache (images), settings via serde/JSON
- `server.rs` — bundles and spawns the Next.js process in release builds

**Next.js (src/)** handles everything else:
- API routes (`src/app/api/`) — all data persistence, media streaming, audio probing, transcoding
- Pages (`src/app/(app)/`) — all UI routes
- Prisma client runs **server-side only** inside API routes

### Data flow

```
UI Component → Zustand store → service function → API route → Prisma → SQLite
                                               ↘ Tauri invoke → Rust command
```

- `src/services/` — client-side service layer (calls API routes or Tauri `invoke`)
- `src/stores/playerStore.ts` — Zustand store for player state (embedded + external)
- `src/context/` — React contexts for media data, folders, API connectivity, changelog
- `src/hooks/` — custom hooks that wrap services and contexts

### Database

Prisma + `better-sqlite3` adapter. DB path at runtime: `CRITIX_DATA_DIR/critix.db` (set by Tauri via env). Dev fallback: `prisma/critix.db`. Migrations in `prisma/migrations/` run automatically at startup via the custom `initializeDatabase()` in `src/lib/prisma.ts` — **never use `prisma migrate deploy`** in production builds.

### Media streaming

All streaming goes through Next.js API routes, not Tauri:
- `GET /api/stream?path=` — serves raw video file with `Accept-Ranges: bytes` (byte-range / seek support). Path is validated against the Folder table via `resolveAndGuardPath()` in `src/lib/streaming.ts` to prevent path traversal.
- `GET /api/subtitle?path=` — serves subtitle files
- `POST /api/hls/start?path=` — probes audio with FFprobe; if codec is AC3/DTS/EAC3, transcodes to MP4 with `ffmpeg -c:v copy -c:a aac -movflags +faststart`, waits for completion, returns `{ sessionId, hlsUrl }`. Sessions stored in-memory (`src/app/api/hls/sessions.ts`).
- `GET /api/hls/[sessionId]/video` — serves the transcoded MP4 with range request support

### Player

`src/app/(app)/player/page.tsx` — full-screen player page. `VideoSurface` is dynamically imported with `ssr: false`.

`src/components/features/player/VideoSurface.tsx` — core player component:
- Mounts Vidstack `MediaPlayer` with `DefaultVideoLayout`
- Initial `transcode` state is **always `"probing"`** (never `"idle"`) to prevent the player from mounting before the codec probe runs — changing this causes silent playback on AC3/DTS files
- Fast-path: `.mp4`/`.webm` skip the probe entirely; only `.mkv/.avi/.mov/.ts/.m2ts` are AT_RISK
- `PlayerLogic` (inner component) uses Vidstack media-state hooks — it must be inside `<MediaPlayer>` to access context

**Player types:**
1. **Embedded (Vidstack)** — `usePlayerStore().openMedia()` → navigates to `/player`
2. **External (system/VLC)** — `usePlayerStore().startExternal()` → navigates to `/watching`

### FFmpeg / FFprobe

`src/lib/find-binary.ts` — three-step lookup: shell PATH → PowerShell registry (Windows, bypasses inherited PATH) → hard-coded common install paths. Results are cached per-process. Required when Tauri is launched from WSL (inherits limited PATH).

**Codec probe flow in `VideoSurface`:**
1. `probeAudio(filePath)` → `GET /api/probe` → ffprobe JSON
2. If `needsTranscode: true`, show loading overlay, call `startHlsSession(filePath)` → `POST /api/hls/start`
3. FFmpeg runs (audio-only transcode is fast: ~30-60s for a 45-min episode)
4. On success, Vidstack loads the MP4 via `video/mp4` type with full seeking

### Key constraints

- `reactStrictMode: false` — Vidstack's `<MediaProvider>` inserts `<video>` into a shadow DOM imperatively; double-render breaks it (causes permanent black screen)
- `serverExternalPackages: ["better-sqlite3", "@prisma/client", ...]` — these must not be bundled by Turbopack
- `@tauri-apps/api` imports must be deferred (dynamic import on first use) — the module accesses `window.location` at init time, which crashes during SSR
- `import "server-only"` — required at the top of any module that uses Prisma or `fs` to prevent accidental client-side bundling

### External APIs

- **TMDB** — movie/series metadata and images. API key in `.env.local` as `NEXT_PUBLIC_TMDB_API_KEY` (not in this repo's example).
- **Critix API** — custom backend for additional metadata. Base URL: `NEXT_PUBLIC_CRITIX_API_URL`.
- Requests to external APIs go through `GET /api/external/[...path]` (proxy route) to avoid CORS in the WebView.
