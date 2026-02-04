import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite'
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  // Base path for assets. When deploying to GitHub Pages project site
  // set PAGES_BASE=/your-repo-name/ in the build environment (CI).
  base: process.env.PAGES_BASE || '/',
  plugins: [react(), tailwindcss(),],

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
            ignored: ["**/src-tauri/**"],
    },
  },
}));
