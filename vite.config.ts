import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Branding admin API — previously lived here as a dev-only Vite plugin
 * (brandAdminPlugin), since there was no app server in this repo for the
 * /admin screen's Save button to talk to. That's been replaced by real
 * Netlify Functions in netlify/functions/ backed by Netlify Blobs, which
 * work identically under `netlify dev` (local, sandboxed store) and once
 * deployed (the site's real store) — see netlify.toml for the /api/*
 * routing and netlify/functions/_lib/brandStore.ts for the storage layer.
 *
 * Local branding work now needs `pnpm run dev:netlify` instead of
 * `pnpm run dev` — Functions and Blobs only exist inside Netlify's dev
 * proxy, not in bare Vite.
 */

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The one alias. Portal code imports "@/portals/<name>/..." and the UI kit lives at "@/ui/...".
      "@": path.resolve(__dirname, "./client"),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
});
