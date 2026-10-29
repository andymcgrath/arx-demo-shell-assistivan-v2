import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SCENARIOS } from "@/engine/__tests__/scenarios";
import { brandChain, listBrandSlugs, resolveBrand } from "@/brand/resolve";
import {
  AA_CONTRAST,
  buildTheme,
  contrastRatio,
  contrastReport,
  normalizeHex,
  resolveSurfaces,
  rowPasses,
} from "@/brand/theme";
import { choiceProblems } from "@/engine/workflow/forks";
import { forksForFlow } from "@/workflows/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { recipeProblems } from "@/engine/workflow/recipe";
import { forksForScenario } from "@/engine/workflow/forks";

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
        expect(["brand", "accent", "action", "surfaces", "source"].includes(key)).toBe(true);
      }
      // Throws on an unknown surface or option.
      expect(() => resolveSurfaces(colors.surfaces, !!colors.accent)).not.toThrow();
    });

    it("meets WCAG AA on the required color pairs", () => {
      // Required: button text (4.5) and the confirmation heading (3.0, large text).
      // The other pairs are warnings in the Brand Lab (/brand-lab). See contrastReport in client/brand/theme.ts.
      if (KNOWN_LOW_CONTRAST.has(slug)) return;
      const failing = contrastReport(buildTheme(brand.program.colors))
        .filter((r) => r.required && !rowPasses(r))
        .map((r) => `${r.label}: ${r.ratio.toFixed(2)}`);
      expect(failing).toEqual([]);
    });

    it("has readable button text (WCAG AA)", () => {
      if (KNOWN_LOW_CONTRAST.has(slug)) return;
      const theme = buildTheme(brand.program.colors);
      expect(contrastRatio(theme.onAction, theme.action)).toBeGreaterThanOrEqual(AA_CONTRAST);
    });

    it("has transparent-asset logos with no CSS filter", () => {
      // Each variant is a file path or empty. An empty one shows the program name as text.
      const assets = brand.program.assets ?? {};
      const { logoColor, logoWhite } = assets;
      for (const logo of [logoColor, logoWhite]) {
        expect(logo === undefined || logo === null || typeof logo === "string").toBe(true);
      }
      expect("logo" in brand.program).toBe(false);
      expect("requiresFilter" in assets).toBe(false);
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
        expect(choiceProblems(forksForFlow(demo.flow), demo.flow, demo.choices)).toEqual([]);
      }
    });

    it("lets a demo choose only branches its scenario's recipe can run", () => {
      for (const demo of brand.demos) {
        const recipe = ALL_SCENARIOS.find((s) => s.flowType === demo.flow)?.recipe;
        if (!recipe) continue;
        const forks = forksForScenario(forksForFlow(demo.flow), demo.flow);
        expect(recipeProblems({ ...recipe, choices: { ...recipe.choices, ...demo.choices } }, forks)).toEqual([]);
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

    it("lists documents as PDFs with a file and a display name", () => {
      const documents = brand.program.documents ?? {};
      for (const key of Object.keys(documents)) {
        expect(["enrollmentForm", "summaryOfBenefits", "paForm"].includes(key)).toBe(true);
        const doc = documents[key];
        expect(typeof doc.file === "string" && doc.file.startsWith("/brands/") && doc.file.endsWith(".pdf")).toBe(true);
        expect(typeof doc.fileName === "string" && doc.fileName.endsWith(".pdf")).toBe(true);
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
