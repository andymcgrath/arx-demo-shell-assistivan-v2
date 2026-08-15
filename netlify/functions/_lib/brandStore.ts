/**
 * Shared brand-storage helpers for the Branding admin feature.
 *
 * Storage: Netlify Blobs, store name "brands". Two kinds of entries live
 * there:
 *   "active-brand"      — the brand currently rendered by the live app.
 *                          Read with strong consistency so a Save/Promote
 *                          is visible immediately, not after the ~60s
 *                          eventual-consistency window.
 *   "brand:<slug>"       — saved presets (the admin screen's "Load brand"
 *                          dropdown), one full { presetName, data } object
 *                          each.
 *
 * Netlify Blobs is automatically scoped per environment: `netlify dev`
 * gets a sandboxed local store, the deployed site gets its own — so dev
 * and prod never share data unless something explicitly copies between
 * them (see admin-promote / admin-promote-receive).
 *
 * Bundled defaults: three brands ship as committed JSON (the same files
 * the old file-based system used) so the dropdown — and the live site
 * itself — is never empty, even on a brand-new store. These are imported
 * directly (not read via fs) so Netlify's function bundler inlines them
 * at build time; a runtime fs.readFileSync from a deployed function can't
 * reliably reach files outside the function's own bundle.
 */
import { getStore } from "@netlify/blobs";
import assistivanPreset from "../../../client/portals/patient/config/brands/assistivan.json";
import boehringerPreset from "../../../client/portals/patient/config/brands/boehringer-ingelheim.json";
import tgPreset from "../../../client/portals/patient/config/brands/tg-therapuetics.json";

export interface BrandPreset {
  presetName: string;
  data: Record<string, unknown>;
}

export const DEFAULT_SLUG = "assistivan";

const BUNDLED_PRESETS: Record<string, BrandPreset> = {
  assistivan: assistivanPreset as BrandPreset,
  "boehringer-ingelheim": boehringerPreset as BrandPreset,
  "tg-therapuetics": tgPreset as BrandPreset,
};

const STORE_NAME = "brands";
const ACTIVE_KEY = "active-brand";
const PRESET_PREFIX = "brand:";

export function brandsStore() {
  return getStore(STORE_NAME);
}

/** The brand the live app should render right now, in this environment. */
export async function getActiveBrand(): Promise<Record<string, unknown>> {
  const active = await brandsStore().get(ACTIVE_KEY, {
    type: "json",
    consistency: "strong",
  });
  if (active) return active as Record<string, unknown>;
  // Nothing saved in this environment yet (fresh site, cleared store) —
  // fall back to the bundled default rather than rendering blank.
  return BUNDLED_PRESETS[DEFAULT_SLUG].data;
}

export async function setActiveBrand(data: Record<string, unknown>): Promise<void> {
  await brandsStore().setJSON(ACTIVE_KEY, data);
}

export async function listPresets(): Promise<{ slug: string; presetName: string }[]> {
  const store = brandsStore();
  const { blobs } = await store.list({ prefix: PRESET_PREFIX });

  const stored = await Promise.all(
    blobs.map(async b => {
      const slug = b.key.slice(PRESET_PREFIX.length);
      const preset = await store.get(b.key, { type: "json" });
      return { slug, presetName: (preset as BrandPreset | null)?.presetName ?? slug };
    }),
  );

  // Merge in bundled defaults this environment's store hasn't overwritten,
  // so the dropdown always has at least the three shipped brands.
  const seen = new Set(stored.map(s => s.slug));
  const bundled = Object.entries(BUNDLED_PRESETS)
    .filter(([slug]) => !seen.has(slug))
    .map(([slug, preset]) => ({ slug, presetName: preset.presetName }));

  return [...bundled, ...stored];
}

export async function getPreset(slug: string): Promise<BrandPreset | null> {
  const stored = await brandsStore().get(PRESET_PREFIX + slug, { type: "json" });
  if (stored) return stored as BrandPreset;
  return BUNDLED_PRESETS[slug] ?? null;
}

export async function savePreset(slug: string, preset: BrandPreset): Promise<void> {
  await brandsStore().setJSON(PRESET_PREFIX + slug, preset);
}

/** Idempotent — deleting a slug that only exists as a bundled default (or
 * doesn't exist at all) just means this environment's store never had an
 * override for it; either way there's nothing to remove. */
export async function deletePreset(slug: string): Promise<void> {
  await brandsStore().delete(PRESET_PREFIX + slug);
}

export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "brand";
}

/** Surfaces the real error message in the response body. This is an
 * internal admin tool behind /api/admin/* and a read-only brand endpoint,
 * not public account data, so the tradeoff favors being able to see what
 * actually broke (in the Network tab, no server-log access needed) over
 * hiding stack details. */
export function errorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Returns a real Web API Response, not a v1-style { statusCode, body }
 * object — all functions here use the v2 (default export) handler format.
 * v1's classic `handler` export runs through a Lambda-emulation shim
 * locally, which was the actual cause of the MissingBlobsEnvironmentError
 * seen in local dev even on a correctly-linked site: Blobs' automatic
 * environment injection isn't reliably applied to that shim, only to v2
 * functions and real deployed Lambdas. */
export function json(statusCode: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
