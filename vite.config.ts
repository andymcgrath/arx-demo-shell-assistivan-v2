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

/**
 * brandAdminPlugin
 *
 * Dev-only backend for the Patient Portal's /admin branding screen. There is
 * no app server in this repo, so the admin screen's Save button needs
 * somewhere to persist to — this rides along inside Vite's own dev server
 * rather than standing up a separate process.
 *
 * Storage:
 *   client/portals/patient/config/active-brand.json  — the live brand.
 *     branding.ts imports this directly, so writing here is what actually
 *     rebrands the running app (Vite reloads the page automatically).
 *   client/portals/patient/config/brands/<slug>.json — saved presets
 *     (e.g. Assistivan, Boehringer) that the admin screen's "Load brand"
 *     dropdown can pull back in.
 *   public/uploads/                                  — logo/favicon uploads.
 *
 * Endpoints: GET/POST /api/admin/branding, GET /api/admin/brands,
 * GET/DELETE /api/admin/brands/:slug, GET /api/admin/assets,
 * POST /api/admin/upload.
 */
function brandAdminPlugin(rootDir: string): Plugin {
  const configDir = path.resolve(rootDir, "client/portals/patient/config");
  const activeBrandPath = path.join(configDir, "active-brand.json");
  const brandsDir = path.join(configDir, "brands");
  const uploadsDir = path.resolve(rootDir, "public/uploads");

  function slugify(name: string): string {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return slug || "brand";
  }

  function readJsonBody(req: import("http").IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", chunk => (raw += chunk));
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on("error", reject);
    });
  }

  function send(res: import("http").ServerResponse, status: number, body: unknown) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }

  return {
    name: "brand-admin-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/admin/")) return next();

        try {
          const url = new URL(req.url, "http://localhost");
          const pathname = url.pathname;

          if (pathname === "/api/admin/branding" && req.method === "GET") {
            const data = JSON.parse(fs.readFileSync(activeBrandPath, "utf-8"));
            return send(res, 200, data);
          }

          if (pathname === "/api/admin/branding" && req.method === "POST") {
            const body = await readJsonBody(req);
            const existing = JSON.parse(fs.readFileSync(activeBrandPath, "utf-8"));

            const merged = {
              manufacturer: { ...existing.manufacturer, ...body.manufacturer },
              program: {
                ...existing.program,
                ...body.program,
                colors: { ...existing.program.colors, ...(body.program?.colors ?? {}) },
              },
              chatbotIcon: body.chatbotIcon ?? existing.chatbotIcon,
            };

            fs.writeFileSync(activeBrandPath, JSON.stringify(merged, null, 2));

            if (typeof body.presetName === "string" && body.presetName.trim()) {
              if (!fs.existsSync(brandsDir)) fs.mkdirSync(brandsDir, { recursive: true });
              const slug = slugify(body.presetName);
              fs.writeFileSync(
                path.join(brandsDir, `${slug}.json`),
                JSON.stringify({ presetName: body.presetName.trim(), data: merged }, null, 2),
              );
            }

            return send(res, 200, { success: true });
          }

          if (pathname === "/api/admin/brands" && req.method === "GET") {
            if (!fs.existsSync(brandsDir)) return send(res, 200, []);
            const list = fs
              .readdirSync(brandsDir)
              .filter(f => f.endsWith(".json"))
              .map(f => {
                const json = JSON.parse(fs.readFileSync(path.join(brandsDir, f), "utf-8"));
                return { slug: f.replace(/\.json$/, ""), presetName: json.presetName };
              });
            return send(res, 200, list);
          }

          const brandMatch = pathname.match(/^\/api\/admin\/brands\/([^/]+)$/);
          if (brandMatch && req.method === "GET") {
            const file = path.join(brandsDir, `${brandMatch[1]}.json`);
            if (!fs.existsSync(file)) return send(res, 404, { error: "Brand not found" });
            return send(res, 200, JSON.parse(fs.readFileSync(file, "utf-8")));
          }

          // Deletes only the saved preset file — active-brand.json (the live
          // brand) is a separate copy, so this never affects what's currently
          // rendered, even if you delete the preset it originally came from.
          if (brandMatch && req.method === "DELETE") {
            const file = path.join(brandsDir, `${brandMatch[1]}.json`);
            if (!fs.existsSync(file)) return send(res, 404, { error: "Brand not found" });
            fs.unlinkSync(file);
            return send(res, 200, { success: true });
          }

          if (pathname === "/api/admin/assets" && req.method === "GET") {
            if (!fs.existsSync(uploadsDir)) return send(res, 200, []);
            const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith("."));
            return send(res, 200, files.map(f => ({ url: `/uploads/${f}`, filename: f })));
          }

          if (pathname === "/api/admin/upload" && req.method === "POST") {
            const body = await readJsonBody(req);
            if (!body.dataUrl || !body.filename) {
              return send(res, 400, { error: "Missing filename or dataUrl" });
            }
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const base64 = String(body.dataUrl).split(",")[1] ?? String(body.dataUrl);
            const safeName = `${Date.now()}-${String(body.filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            fs.writeFileSync(path.join(uploadsDir, safeName), Buffer.from(base64, "base64"));
            return send(res, 200, { url: `/uploads/${safeName}`, filename: safeName });
          }

          return send(res, 404, { error: "Not found" });
        } catch (err) {
          console.error("[brand-admin-api]", err);
          return send(res, 500, { error: "Server error" });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [portalAliasPlugin(path.resolve(__dirname, ".")), brandAdminPlugin(path.resolve(__dirname, ".")), react()],
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
