# 🔧 Setup & Installation Guide

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ (with npm or pnpm)
- **Rust** (latest stable)
- **Tauri CLI** installed globally

## Installation Steps

### 1. Install Node Dependencies

```bash
pnpm install
```

or with npm:

```bash
npm install
```

### 2. Install Tauri Dialog Plugin

The dialog plugin is required for folder selection:

```bash
cd src-tauri
cargo add tauri-plugin-dialog
cd ..
```

### 3. Update Tauri Configuration

Add the dialog plugin to `src-tauri/src/lib.rs`:

```rust
.plugin(tauri_plugin_dialog::init())
```

### 4. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Critix API URL:

```env
NEXT_PUBLIC_CRITIX_API_URL=http://localhost:8080/api
```

### 5. Build Dependencies

```bash
cd src-tauri
cargo build
cd ..
```

## Running the Application

### Development Mode

```bash
pnpm tauri dev
```

This will:

1. Start Next.js dev server
2. Open Tauri window
3. Enable hot reload

### Production Build

```bash
pnpm tauri build
```

Output will be in `src-tauri/target/release/bundle/`

## Troubleshooting

### Dialog Plugin Not Working

If folder selection doesn't work, ensure:

1. The plugin is added to Cargo.toml
2. The plugin is initialized in lib.rs
3. You're using the correct import in TypeScript:

```typescript
import { open } from "@tauri-apps/plugin-dialog";
```

### API Connection Issues

If the splash screen shows "API offline":

1. Check if Critix API is running
2. Verify the URL in `.env.local`
3. Check CORS settings on the API

### Build Errors

If you encounter build errors:

```bash
# Clean build
rm -rf node_modules
rm -rf src-tauri/target
pnpm install
cd src-tauri && cargo clean && cargo build
```

## Development Tips

### Hot Reload

Frontend changes will hot reload automatically. For Rust changes:

1. Save the Rust file
2. Tauri will rebuild automatically
3. App will restart

### Debugging

Open DevTools in Tauri:

- Windows/Linux: F12 or Ctrl+Shift+I
- macOS: Cmd+Option+I

### Logging

Rust logs appear in the terminal where you ran `pnpm tauri dev`.

## Project Structure Overview

```
critix_vault_desktop/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # UI components
│   ├── features/          # Feature modules
│   ├── hooks/            # Custom hooks
│   ├── services/         # API & Tauri services
│   └── types/            # TypeScript types
├── src-tauri/             # Tauri/Rust backend
│   ├── src/
│   │   ├── lib.rs        # Main commands
│   │   └── main.rs       # Entry point
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri config
├── .env.local            # Environment variables
└── package.json          # Node dependencies
```

## Next Steps After Setup

1. **Test the splash screen**: Ensure API check works
2. **Add a folder**: Test folder selection dialog
3. **Check library view**: Verify layout renders correctly
4. **Test media playback**: Try opening a media file

## Getting Help

If you encounter issues:

1. Check the console for errors
2. Review `IMPLEMENTATION.md` for architecture details
3. Verify all dependencies are installed
4. Ensure environment variables are set

---

**Happy coding! 🚀**
