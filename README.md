# OnTime

OnTime - a Tauri + React time tracking app with Supabase backend.
Demo here: https://ognylux.github.io/ontime/

## Requirements

- Node.js
- Rust [Download Rust](https://rust-lang.org/tools/install/)

### Windows
- Microsoft C++ Build Tools

### macOS
 - Xcode

More information on Tauri requirements: https://v2.tauri.app/start/prerequisites/

## Local development

1. Install dependencies

```bash
npm install
```

2. Run the frontend dev server

```bash
npm run dev
```

3. Run Tauri in dev (native window)

```bash
npm run tauri dev
```

## Build

- Build web assets (Vite)

```bash
npm run build
```

- Build Tauri bundles (desktop installers)

```bash
# run from repo root
npm run tauri build
```
