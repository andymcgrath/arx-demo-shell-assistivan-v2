/**
 * setup-portals.mjs
 *
 * Run once (or after pulling a portal repo update) to sync portal source files
 * into the demo shell.
 *
 * Usage:
 *   node scripts/setup-portals.mjs
 *
 * What it does for each portal:
 *   1. Copies all source files from the portal repo into client/portals/<name>/
 *   2. Replaces that portal's useDemoState.ts / usePatientCase.ts etc. with
 *      the shared bridge hooks in client/hooks/ (by removing the local copy so
 *      imports resolve up to @/hooks/ via Vite's alias).
 *   3. Patches any remaining local "@/" imports that should resolve to the portal
 *      sub-directory (e.g. @/components/ → @crm/components/).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROJECTS = path.resolve(ROOT, ".."); // ../Projects/

// ── Portal sync config ────────────────────────────────────────────────────────

const PORTALS = [
  {
    name: "crm",
    src: path.join(PROJECTS, "arx-prototype-crm", "client"),
    dest: path.join(ROOT, "client", "portals", "crm"),
    // These hook files are replaced by the shared bridges in @/hooks/
    removeHooks: ["hooks/useDemoState.ts", "hooks/usePatientCase.ts", "hooks/useEnrollPatient.ts", "hooks/useRunEBenefits.ts"],
    // Internal @/ imports in this portal now resolve to @crm/ (set in vite.config alias)
    // No patching needed — Vite resolves @/ to client/ which contains the shared hooks
  },
  {
    name: "patient",
    src: path.join(PROJECTS, "arx-prototype-bi-jascayd", "client"),
    dest: path.join(ROOT, "client", "portals", "patient"),
    removeHooks: ["hooks/useDemoState.ts"],
  },
  {
    name: "analytics",
    src: path.join(PROJECTS, "arx-connect-analytics", "client"),
    dest: path.join(ROOT, "client", "portals", "analytics"),
    removeHooks: ["hooks/useDemoState.ts"],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠ Source not found: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    // Skip node_modules, .git, dist, .builder
    if (["node_modules", ".git", "dist", ".builder", ".cache"].includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("🔧 arx-demo-shell — portal sync\n");

for (const portal of PORTALS) {
  console.log(`▶ Syncing ${portal.name} → client/portals/${portal.name}/`);

  if (!fs.existsSync(portal.src)) {
    console.log(`  ⚠ Repo not found at ${portal.src} — skipping\n`);
    continue;
  }

  // 1. Copy all source files
  copyDir(portal.src, portal.dest);
  console.log(`  ✓ Files copied`);

  // 2. Remove portal-local hooks that are replaced by shared bridges
  for (const hook of portal.removeHooks ?? []) {
    const hookPath = path.join(portal.dest, hook);
    if (removeIfExists(hookPath)) {
      console.log(`  ✓ Removed local hook: ${hook} (resolved to @/hooks/${path.basename(hook)} via Vite alias)`);
    }
  }

  // 3. Create an index.tsx re-export if the portal doesn't have one
  const indexPath = path.join(portal.dest, "index.tsx");
  if (!fs.existsSync(indexPath)) {
    // Try to find the main page file
    const candidates = ["pages/Index.tsx", "pages/index.tsx", "App.tsx"];
    for (const c of candidates) {
      if (fs.existsSync(path.join(portal.dest, c))) {
        const importPath = "./" + c.replace(/\.tsx$/, "");
        fs.writeFileSync(indexPath, `export { default } from "${importPath}";\n`);
        console.log(`  ✓ Created index.tsx → ${importPath}`);
        break;
      }
    }
  }

  console.log(`  ✓ ${portal.name} ready\n`);
}

console.log("✅ Done. Run: pnpm dev\n");
console.log("📝 Note: If any portal has import errors after sync, check that all");
console.log("   @/ imports in portal files resolve correctly via the shared hooks.");
console.log("   The Vite alias @/ → client/ ensures useDemoState, usePatientCase,");
console.log("   useEnrollPatient, and useRunEBenefits all resolve to the bridges.\n");
