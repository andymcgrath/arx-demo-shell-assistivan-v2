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
// Do not add new entries. Folders that start with "_" (such as brands/_export) are not brands.
const KNOWN_MISSING_ASSETS = new Set<string>([
  "/brands/pharmaessentia/1786817527600-imgi_64_260408-PEC-logo-V500-5.jpg",
  "/brands/pharmaessentia/1786817534526-imgi_6_logo-pharmaessentia-white.svg",
  "/brands/pharmaessentia/1786842602083-besremi-logo-transparent.png",
  "/brands/pharmaessentia/1786842607739-besremi-logo-white-outline.png",
  "/brands/pharmaessentia/1786842310571-video_hcp_thumbnail.png",
  "/brands/pharmaessentia/1786842235097-favicon-96x96.png",
]);

function localAssets(value: unknown): string[] {
  if (typeof value === "string") return value.startsWith("/brands/") ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(localAssets);
  if (value && typeof value === "object") return Object.values(value).flatMap(localAssets);
  return [];
}

const slugs = fs.readdirSync(BRANDS_DIR).filter((d) => !d.startsWith("_") && fs.statSync(path.join(BRANDS_DIR, d)).isDirectory());

it("there is at least one brand", () => {
  expect(slugs.length > 0).toBe(true);
});

for (const slug of slugs) {
  describe(`brand ${slug}`, () => {
    const brand = JSON.parse(fs.readFileSync(path.join(BRANDS_DIR, slug, "brand.json"), "utf8"));

    it("has the slug of its folder and the required fields", () => {
      expect(brand.slug).toBe(slug);
      for (const field of ["name", "title", "enabledFlows", "manufacturer", "program", "chatbotIcon"]) {
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
