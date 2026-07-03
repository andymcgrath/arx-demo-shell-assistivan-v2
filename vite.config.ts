import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

/**
 * portalAliasPlugin
 *
 * Each portal was originally a standalone Vite app where `@/` pointed to its
 * own `client/` directory.  In the shell `@/` points to the shell's `client/`.
 *
 * Strategy: rewrite `@/` import strings directly in the source code before
 * vite:import-analysis ever sees them.  A `resolveId` hook is too late —
 * vite:import-analysis calls an internal resolver that doesn't re-run user
 * plugin hooks.  The `transform` hook (enforce:"pre") fires first, so we
 * swap portal-local imports to absolute paths in-place.
 *
 * Rule:
 *   • File is inside  client/portals/<name>/
 *   • Import starts with  @/
 *   • client/portals/<name>/<rest-of-path>  exists on disk  → rewrite to that
 *   • Otherwise leave the import alone  → falls through to the shell @/ alias
 *     (client/<rest-of-path>), which is where shared bridges live.
 */
function portalAliasPlugin(rootDir: string): Plugin {
  const portals = ["crm", "patient", "analytics", "field", "provider"];
  const extensions = [".ts", ".tsx", "/index.ts", "/index.tsx"];

  // Matches:  from "@/foo"  |  from '@/foo'
  const importRe = /from\s+(['"])@\/([^'"]+)\1/g;

  return {
    name: "portal-alias",
    enforce: "pre",
    transform(code, id) {
      for (const portal of portals) {
        const portalRoot = path.resolve(rootDir, `client/portals/${portal}`);
        if (!id.startsWith(portalRoot)) continue;

        // This file is inside a portal — rewrite its @/ imports where possible
        let changed = false;
        const result = code.replace(importRe, (match, quote, relPath) => {
          const localBase = path.resolve(portalRoot, relPath);

          // Check bare path first (directory index), then with extensions
          for (const ext of ["", ...extensions]) {
            const candidate = localBase + ext;
            // Skip if the candidate is the file itself — bridge hooks do
            // `export * from '@/hooks/useEnrollPatient'` and the portal-local
            // path resolves back to the same file, causing a circular import.
            if (candidate === id) continue;
            if (fs.existsSync(candidate)) {
              changed = true;
              return `from ${quote}${candidate}${quote}`;
            }
          }
          // Not found in portal (or only found self) → keep original
          return match;
        });

        return changed ? { code: result, map: null } : null;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [portalAliasPlugin(path.resolve(__dirname, ".")), react()],
  resolve: {
    alias: {
      // Shell-level alias — shared hooks, store, shell components
      "@": path.resolve(__dirname, "./client"),
      // Per-portal aliases (used when portal files explicitly import @crm/…)
      "@crm": path.resolve(__dirname, "./client/portals/crm"),
      "@patient": path.resolve(__dirname, "./client/portals/patient"),
      "@analytics": path.resolve(__dirname, "./client/portals/analytics"),
      "@field": path.resolve(__dirname, "./client/portals/field"),
      "@provider": path.resolve(__dirname, "./client/portals/provider"),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
});
