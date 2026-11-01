import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guard for the CRM refactor (docs/plans/PROMPT_CRM_REFACTOR.md, item I): the CRM names no drug, payer, provider or
 * patient in its code. Copy reads the persona, the brand or one facts file. The facts files hold the demo's
 * representative data. They are the only places a name may sit, and each one is on ALLOWED with the reason.
 *
 * It scans the real files under client/portals/crm (not tests, not comment-only lines). An entry that matches no line
 * fails the test, so the list only shrinks.
 */

const ROOT = path.resolve(__dirname, "../../..");
const NAMES = /Ofev|Accredo|Advanced Diabetes|BlueCross|Keanu/i;

const ALLOWED: { file: string; reason: string }[] = [
  { file: "client/portals/crm/payerFacts.ts", reason: "The demo patient's payer. One source for the BIR layouts and the Summary of Benefits." },
  { file: "client/portals/crm/clinicalFacts.ts", reason: "The demo patient's clinical history, as the enrollment form shows it." },
  { file: "client/portals/crm/caseData.ts", reason: "The list of pharmacies the agent can pick, with the preferred one named once." },
];

const isCommentOnly = (line: string) => /^\s*(\/\/|\/\*|\*)/.test(line);

function files(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return e.name === "__tests__" ? [] : files(rel);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [rel] : [];
  });
}

const hits = files("client/portals/crm").flatMap((file) =>
  fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .split("\n")
    .map((text, i) => ({ file, line: i + 1, text }))
    .filter((h) => !isCommentOnly(h.text) && NAMES.test(h.text)),
);

describe("CRM guard: no drug, payer, provider or patient names in code", () => {
  it("every hit is in an allowed facts file", () => {
    const loose = hits.filter((h) => !ALLOWED.some((a) => a.file === h.file));
    expect(loose.map((h) => `${h.file}:${h.line}  ${h.text.trim()}`)).toEqual([]);
  });

  it("every allowed file still holds a name, so the list only shrinks", () => {
    expect(ALLOWED.filter((a) => !hits.some((h) => h.file === a.file)).map((a) => a.file)).toEqual([]);
  });

  it("every allowed file gives a reason", () => {
    expect(ALLOWED.filter((a) => a.reason.trim().length < 20)).toEqual([]);
  });
});
