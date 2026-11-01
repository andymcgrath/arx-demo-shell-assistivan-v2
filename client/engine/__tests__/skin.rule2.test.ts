import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Rule 2 of the patient view plan (docs/plans/arx-demo-patient-refactor-plan.md): one resolver, `client/shell/skin.ts`,
 * returns the component for each slot from the current view. Pages render a slot and never check the view.
 *
 * It scans the real files under client (not tests, not comment-only lines) for a read of the store's `view`:
 * `s.view`, `getState().view`, a destructured `view` from the store, or a comparison against `view`. Only the files
 * in HOME may read it. A page that needs a view-dependent component gets a slot in skin.ts instead.
 */

const ROOT = path.resolve(__dirname, "../../..");

/** The files that own the view, with the reason. */
const HOME = [
  { file: "client/shell/skin.ts", reason: "the resolver" },
  { file: "client/shell/view.ts", reason: "the pure view rules" },
  { file: "client/store/demoStore.ts", reason: "holds the view" },
];

const PATTERN = /\b(?:s|state)\.view\b|getState\(\)\.view\b|\bview\s*[!=]==|\{[^}]*\bview\b[^}]*\}\s*=\s*useDemoStore/;
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

describe("rule 2: only the resolver reads the view", () => {
  const home = new Set(HOME.map((h) => h.file));

  it("finds no view read outside the files that own it", () => {
    const hits: string[] = [];
    for (const file of sourceFiles("client")) {
      if (home.has(file)) continue;
      fs.readFileSync(path.join(ROOT, file), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (!isCommentOnly(line) && PATTERN.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("the pattern catches the reads it is meant to catch", () => {
    for (const line of [
      'const view = useDemoStore((s) => s.view);',
      "if (useDemoStore.getState().view === 'patient') {}",
      "const { view } = useDemoStore();",
      'return view === "patient" ? <A /> : <B />;',
    ]) {
      expect(PATTERN.test(line), line).toBe(true);
    }
  });

  it("every home file exists and reads or sets the view", () => {
    for (const { file } of HOME) expect(fs.existsSync(path.join(ROOT, file)), file).toBe(true);
  });
});
