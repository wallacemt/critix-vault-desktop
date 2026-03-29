# Technical Overview

## Purpose

This document centralizes technical details that were intentionally removed from the main README.

## Current Architecture

- Desktop shell: Tauri v2
- Frontend app: Next.js (App Router) + React + TypeScript
- Local database: Prisma + SQLite
- Native layer: Rust commands for dialogs, file scanning and OS integration
- External metadata providers: Critix API and TMDB

## Main Areas

- Frontend routes and UI: src/app and src/components
- Application hooks and orchestration: src/hooks
- Service layer: src/services
- Shared helpers and utilities: src/lib
- Database schema and migrations: prisma
- Desktop/native commands: src-tauri/src/commands

## Key Features (Technical View)

- Folder selection with native dialog (Tauri plugin + Rust commands)
- Recursive local media scanning (native command)
- Movie and series matching with external metadata APIs
- Series detail enrichment with seasons/episodes hydration
- Advanced series episode path editing (single and bulk selection)
- Watch history and watched state persistence
- Local backup and restore endpoints
- Runtime desktop server bootstrap for packaged builds

## Environment Variables

Core variables used by the app and build pipeline:

- NEXT_PUBLIC_CRITIX_API_URL
- CRITIX_EXTERNAL_API_URL

Notes:

- Build scripts also read .env, .env.local and .env.production when preparing desktop artifacts.
- CSP is adjusted during build based on configured API origins.

## Local Development

From project root:

```bash
bun install
bun run dev
```

Desktop dev mode:

```bash
bun run tauri:dev
```

## Production Build

Web build:

```bash
bun run build
```

Desktop bundle:

```bash
bun run build:app
```

## Related Technical Docs

- docs/tech/SETUP.md
- docs/tech/BUILD_GUIDE.md
- docs/tech/COMMANDS.md
- docs/tech/API_INTEGRATION_GUIDE.md
- docs/tech/IMPLEMENTATION_SUMMARY.md
- docs/tech/FILE_INDEX.md

## Troubleshooting Notes

- If external links do not open in packaged desktop builds, ensure opener plugin usage in the frontend flow and capability includes opener permissions.
- If API calls fail in packaged mode, verify runtime config generation and CSP origin injection in build scripts.
- If desktop build fails with Cargo edition mismatch, update Rust toolchain or align Cargo.toml edition to supported values.
