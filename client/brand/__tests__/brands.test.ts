import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SCENARIOS } from "@/engine/__tests__/scenarios";

/**
 * Every folder under brands/ must be a complete, self-consistent brand
 * (CLAUDE.md: brand is committed JSON, selected by BRAND at build time).
 */
const ROOT = process.cwd(); // vitest runs from the repo root
const BRANDS_DIR = path.join(ROOT, "brands");
const FLOW_IDS = SCENARIOS.map((s) => s.flowType as string);

// Images a brand points at that are not committed yet. Add the file, then delete the entry.
// Do not add new entries.
const KNOWN_MISSING_ASSETS = new Set<string>([]);

function localAssets(value: unknown): string[] {
  if (typeof value === "string") return value.startsWith("/brands/") ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(localAssets);
  if (value && typeof value === "object") return Object.values(value).flatMap(localAssets);
  return [];
}

const slugs = fs.readdirSync(BRANDS_DIR);

it("there is at least one brand", () => {
  expect(slugs.length > 0).toBe(true);
});

for (const slug of slugs) {
  describe(`brand ${slug}`, () => {
    const brand = JSON.parse(fs.readFileSync(path.join(BRANDS_DIR, slug, "brand.json"), "utf8"));

    it("has the slug of its folder and the required fields", () => {
      expect(brand.slug).toBe(slug);
      for (const field of ["name", "enabledFlows", "manufacturer", "program", "chatbotIcon"]) {
        expect(field in brand).toBe(true);
      }
      expect(typeof brand.program.drugDisplayName).toBe("string");
      expect(typeof brand.program.colors.primary).toBe("string");
      expect(typeof brand.manufacturer.legal.privacyUrl).toBe("string");
    });

    it("enables at least one flow, and only real flows", () => {
      expect(brand.enabledFlows.length > 0).toBe(true);
      for (const flow of brand.enabledFlows) expect(FLOW_IDS.includes(flow)).toBe(true);
      expect(new Set(brand.enabledFlows).size).toBe(brand.enabledFlows.length);
    });

    it("points every local image at a committed file", () => {
      for (const url of localAssets(brand)) {
        if (KNOWN_MISSING_ASSETS.has(url)) continue;
        expect(fs.existsSync(path.join(ROOT, "public", url))).toBe(true);
      }
    });
  });
}
