/**
 * Reads brands/<slug>/brand.json and resolves `extends`.
 *
 * A brand may start from another one:
 *
 *   { "extends": "assistivan", "slug": "hikma", "name": "Hikma", "title": "Hikma Demo",
 *     "enabledFlows": ["Fax_QS_PA_Approved", "iAssist_PA_Approved"] }
 *
 * Objects merge field by field. Arrays and values replace the parent's. Build tooling only: this
 * file reads the disk, so app code never imports it (vite.config.ts and the brand tests do).
 */
import fs from "node:fs";
import path from "node:path";

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Deep merge. Child wins. Arrays and scalars replace. */
export function mergeBrand(parent: Json, child: Json): Json {
  const out: Json = { ...parent };
  for (const [key, value] of Object.entries(child)) {
    out[key] = isObject(value) && isObject(parent[key]) ? mergeBrand(parent[key] as Json, value) : value;
  }
  return out;
}

/** The slugs a brand is built from, own slug first and the root parent last. */
export function brandChain(brandsDir: string, slug: string): string[] {
  const chain: string[] = [];
  let current: string | undefined = slug;
  while (current) {
    if (chain.includes(current)) throw new Error(`brands/${slug}: "extends" loops (${[...chain, current].join(" -> ")})`);
    chain.push(current);
    const file = path.join(brandsDir, current, "brand.json");
    if (!fs.existsSync(file)) {
      throw new Error(`brands/${chain[chain.length - 2] ?? slug} extends "${current}", but brands/${current}/brand.json does not exist`);
    }
    current = JSON.parse(fs.readFileSync(file, "utf8")).extends as string | undefined;
  }
  return chain;
}

/** The full brand: the root parent first, each child merged over it. `extends` is dropped from the result. */
export function resolveBrand(brandsDir: string, slug: string): Json {
  const chain = brandChain(brandsDir, slug).reverse();
  let merged: Json = {};
  for (const s of chain) {
    merged = mergeBrand(merged, JSON.parse(fs.readFileSync(path.join(brandsDir, s, "brand.json"), "utf8")));
  }
  delete merged.extends;
  return merged;
}

/** Brand folders under `brands/`. Folders that start with "_" are not brands. */
export function listBrandSlugs(brandsDir: string): string[] {
  return fs
    .readdirSync(brandsDir)
    .filter((d) => !d.startsWith("_") && fs.statSync(path.join(brandsDir, d)).isDirectory());
}

/**
 * Deletes every brand image folder from a finished build except the ones in `keep`
 * (the active brand and its parents). Vite copies all of public/, so without this each
 * client's site would also serve every other client's images.
 * Returns the folders it removed.
 */
export function pruneBrandAssets(distDir: string, keep: string[]): string[] {
  const root = path.join(distDir, "brands");
  if (!fs.existsSync(root)) return [];
  const removed: string[] = [];
  for (const dir of fs.readdirSync(root)) {
    if (keep.includes(dir)) continue;
    fs.rmSync(path.join(root, dir), { recursive: true, force: true });
    removed.push(dir);
  }
  return removed;
}
