import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SCENARIOS } from "@/engine/__tests__/scenarios";
import { brandChain, listBrandSlugs, resolveBrand } from "@/brand/resolve";
import { AA_CONTRAST, buildTheme, contrastRatio, normalizeHex } from "@/brand/theme";
import { choiceProblems } from "@/engine/workflow/forks";
import { ALL_FORKS } from "@/workflows/forks";

/**
 * Every folder under brands/ must resolve to a complete, self-consistent brand
 * (CLAUDE.md: brand is committed JSON, selected by BRAND at build time).
 */
const ROOT = process.cwd(); // vitest runs from the repo root
const BRANDS_DIR = path.join(ROOT, "brands");
const FLOW_IDS = SCENARIOS.map((s) => s.flowType as string);

// Images a brand points at that are not committed yet. Add the file, then delete the entry.
// Do not add new entries. Folders that start with "_" (such as brands/_export) are not brands.
const KNOWN_MISSING_ASSETS = new Set<string>([
]);

// Brands whose manufacturer logo still needs the CSS recolor filter (no transparent asset yet).
// Add the real asset, drop `requiresFilter`, then delete the entry. Do not add new entries.
const LEGACY_FILTER_BRANDS = new Set<string>(["assistivan"]);

// Brands whose action color fails WCAG AA with every text color. Fix the color, then delete the entry.
// Do not add new entries.
const KNOWN_LOW_CONTRAST = new Set<string>([]);

function localAssets(value: unknown): string[] {
  if (typeof value === "string") return value.startsWith("/brands/") ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(localAssets);
  if (value && typeof value === "object") return Object.values(value).flatMap(localAssets);
  return [];
}

const slugs = listBrandSlugs(BRANDS_DIR);

it("there is at least one brand", () => {
  expect(slugs.length > 0).toBe(true);
});

for (const slug of slugs) {
  describe(`brand ${slug}`, () => {
    const brand = resolveBrand(BRANDS_DIR, slug) as any; // follows "extends"

    it("has the slug of its folder and the required fields", () => {
      expect(brand.slug).toBe(slug);
      for (const field of ["name", "title", "demos", "manufacturer", "program", "chatbotIcon"]) {
        expect(field in brand).toBe(true);
      }
      expect(typeof brand.program.drugDisplayName).toBe("string");
      expect(typeof brand.manufacturer.legal.privacyUrl).toBe("string");
    });

    it("sets showClientTab only as a boolean", () => {
      expect(brand.showClientTab === undefined || typeof brand.showClientTab === "boolean").toBe(true);
    });

    it("has valid color tokens", () => {
      const { colors } = brand.program;
      expect(typeof colors.brand).toBe("string");
      for (const key of ["brand", "accent", "action"]) {
        if (colors[key] !== undefined) expect(() => normalizeHex(colors[key])).not.toThrow();
      }
      for (const key of Object.keys(colors)) {
        expect(["brand", "accent", "action", "source"].includes(key)).toBe(true);
      }
    });

    it("has readable button text (WCAG AA)", () => {
      if (KNOWN_LOW_CONTRAST.has(slug)) return;
      const theme = buildTheme(brand.program.colors);
      expect(contrastRatio(theme.onAction, theme.action)).toBeGreaterThanOrEqual(AA_CONTRAST);
    });

    it("has transparent-asset logos with no CSS filter", () => {
      // Each variant is a file path or empty. An empty one shows the program name as text.
      const { logoColor, logoWhite } = brand.program.assets;
      for (const logo of [logoColor, logoWhite]) {
        expect(logo === undefined || logo === null || typeof logo === "string").toBe(true);
      }
      expect("logo" in brand.program).toBe(false);
      expect("requiresFilter" in brand.program.assets).toBe(false);
      // A brand that extends a legacy brand inherits its filter until it sets its own logo.
      const inheritsLegacy = brandChain(BRANDS_DIR, slug).some((s) => LEGACY_FILTER_BRANDS.has(s));
      if (!inheritsLegacy) {
        expect(brand.manufacturer.logo.requiresFilter ?? false).toBe(false);
      }
    });

    it("lists at least one demo, and every demo runs on a real flow", () => {
      expect("enabledFlows" in brand).toBe(false); // replaced by `demos`
      expect(brand.demos.length > 0).toBe(true);
      for (const demo of brand.demos) {
        expect(FLOW_IDS.includes(demo.flow)).toBe(true);
        expect(typeof demo.label === "string" && demo.label.trim().length > 0).toBe(true);
      }
    });

    it("gives every demo a unique id", () => {
      const ids = brand.demos.map((d: { id: string }) => d.id);
      for (const id of ids) expect(typeof id === "string" && id.length > 0).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("lets a demo choose only branches that exist", () => {
      for (const demo of brand.demos) {
        expect(choiceProblems(ALL_FORKS, demo.flow, demo.choices)).toEqual([]);
      }
    });

    it("does not repeat the same flow and choices under two demos", () => {
      const keys = brand.demos.map((d: any) => JSON.stringify([d.flow, Object.entries(d.choices ?? {}).sort()]));
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("only uses images from its own folder or a parent's, so isolation keeps them", () => {
      const allowed = brandChain(BRANDS_DIR, slug);
      for (const url of localAssets(brand)) {
        expect(allowed.includes(url.split("/")[2])).toBe(true);
      }
    });

    it("points every local image at a committed file", () => {
      for (const url of localAssets(brand)) {
        if (KNOWN_MISSING_ASSETS.has(url)) continue;
        expect(fs.existsSync(path.join(ROOT, "public", url))).toBe(true);
      }
    });
  });
}
