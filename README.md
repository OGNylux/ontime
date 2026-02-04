# OnTime

> OnTime — a Tauri + Vite React time tracking app with Supabase backend.

## Requirements

- Node.js (LTS)
- Rust (stable) for Tauri native builds
- npm, yarn or pnpm (examples below use `npm`)

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
