import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { listBrandSlugs, resolveBrand } from "@/brand/resolve";

/**
 * CLAUDE.md: brand and drug names never appear in source code. They come from
 * brands/<slug>/brand.json. Comments may name them. Code and strings may not.
 *
 * "CoAssist" is a workflow and platform name, not a brand, so it is allowed.
 */
const ROOT = process.cwd(); // vitest runs from the repo root
const CLIENT = path.join(ROOT, "client");
const BRANDS = path.join(ROOT, "brands");

const FIXED = ["Assistivan", "Jascayd", "Briumvi", "TG Therapeutics", "Dexcom", "Boehringer", "Wegovy"];
const fromBrands = listBrandSlugs(BRANDS).flatMap((slug) => {
  const b = resolveBrand(BRANDS, slug) as any;
  return [b.name, b.program.name, b.program.drugDisplayName] as string[];
});
const NAMES = [...new Set([...FIXED, ...fromBrands])].filter(Boolean);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

/** Code lines only: drops block comments, whole-line comments and trailing `// ...` comments. */
function codeLines(source: string): { n: number; text: string }[] {
  const out: { n: number; text: string }[] = [];
  let inBlock = false;
  source.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (inBlock) {
      if (t.includes("*/")) inBlock = false;
      return;
    }
    if (t.startsWith("/*")) {
      if (!t.includes("*/")) inBlock = true;
      return;
    }
    if (t.startsWith("//") || t.startsWith("*")) return;
    out.push({ n: i + 1, text: line.replace(/\s\/\/\s.*$/, "") });
  });
  return out;
}

describe("brand and drug names stay out of source", () => {
  it("has names to look for", () => {
    expect(NAMES.length > 5).toBe(true);
  });

  it("finds none in code or strings", () => {
    const hits: string[] = [];
    for (const file of walk(CLIENT)) {
      for (const { n, text } of codeLines(fs.readFileSync(file, "utf8"))) {
        for (const name of NAMES) {
          if (text.toLowerCase().includes(name.toLowerCase())) hits.push(`${path.relative(ROOT, file)}:${n} ${name}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
