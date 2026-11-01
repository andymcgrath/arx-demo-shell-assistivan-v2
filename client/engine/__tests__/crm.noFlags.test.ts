import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guard for the CRM refactor (docs/plans/PROMPT_CRM_REFACTOR.md, step 6): the CRM reads the scenario from the workflow
 * data and `scenarioFacts(flowType)` (client/workflows/scenarioFacts.ts), not from a bundle of page-level booleans.
 *
 * It scans the real files under client/portals/crm (not tests, not comment-only lines) for:
 * - `crmFlags` or an import from the deleted `stages/flags` module, and
 * - a page-level flag name of the old shape (`isCoaFlow`, `isPapFlow`, `isCoverageRetailFlow` and the like).
 *
 * A line that has to stay goes in ALLOWED, with the reason. An entry matches by file and by text in the line, not by
 * line number. An entry that matches no line fails the test, so the list only shrinks.
 */

const ROOT = path.resolve(__dirname, "../../..");
const SCANNED = ["client/portals/crm"];

interface Allowed {
  file: string;
  /** Text the offending line contains. */
  text: string;
  reason: string;
}

const ALLOWED: Allowed[] = [];

const PATTERN = /\bcrmFlags\b|stages\/flags\b|\bis[A-Z]\w*Flow\b/;
const isCommentOnly = (line: string) => /^\s*(\/\/|\/\*|\*)/.test(line);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...sourceFiles(rel));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

interface Hit {
  file: string;
  line: number;
  text: string;
}

function findHits(): Hit[] {
  const hits: Hit[] = [];
  for (const file of SCANNED.flatMap(sourceFiles)) {
    fs.readFileSync(path.join(ROOT, file), "utf8")
      .split("\n")
      .forEach((text, i) => {
        if (!isCommentOnly(text) && PATTERN.test(text)) hits.push({ file, line: i + 1, text });
      });
  }
  return hits;
}

const covers = (a: Allowed, h: Hit) => a.file === h.file && h.text.includes(a.text);

describe("CRM guard: no page-level scenario flags", () => {
  const hits = findHits();

  it("scans real files", () => {
    const files = SCANNED.flatMap(sourceFiles);
    expect(files).toContain("client/portals/crm/pages/Index.tsx");
    expect(files.length).toBeGreaterThan(10);
  });

  it("the pattern catches what it is meant to", () => {
    expect(PATTERN.test("const { a } = crmFlags(d);")).toBe(true);
    expect(PATTERN.test('import { crmFlags } from "../stages/flags";')).toBe(true);
    expect(PATTERN.test("{isCoaFlow && <X />}")).toBe(true);
    expect(PATTERN.test("{facts.hasPricingFork && <X />}")).toBe(false);
  });

  it("every flag use is on the allowlist", () => {
    const loose = hits.filter((h) => !ALLOWED.some((a) => covers(a, h)));
    expect(loose.map((h) => `${h.file}:${h.line}  ${h.text.trim()}`)).toEqual([]);
  });

  it("every allowlist entry still matches a line, so the list only shrinks", () => {
    const stale = ALLOWED.filter((a) => !hits.some((h) => covers(a, h)));
    expect(stale.map((a) => `${a.file}  ${a.text}`)).toEqual([]);
  });

  it("every allowlist entry gives a reason", () => {
    expect(ALLOWED.filter((a) => a.reason.trim().length < 20)).toEqual([]);
  });
});
