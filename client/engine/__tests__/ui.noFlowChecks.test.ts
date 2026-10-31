import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALL_SCENARIOS } from "@/workflows/scenarios";

/**
 * Guard for CLAUDE.md rule 7: no `flowType ===` and no flow id literal in UI code. UI code reads
 * `scenarioFacts(flowType)` (client/workflows/scenarioFacts.ts) instead.
 *
 * It scans the real files under client/portals and client/shell (not tests, not comment-only lines) for:
 * - a comparison of a `flowType` or `flow_type` name with `===` or `!==`, and
 * - a quoted flow id of any registered scenario.
 *
 * A line that has to stay goes in ALLOWED, with the reason. An entry matches by file and by text in the line, not by
 * line number. An entry that matches no line fails the test, so the list only shrinks.
 *
 * Not covered: client/engine/WorkflowEngine.ts (see "Follow-ups" in docs/plans/PLAN_RULE7_CLEANUP.md).
 * Unquoted object keys (FLOW_START_PORTAL in shell/DemoShell.tsx) are lookups, not branches, and are not matched.
 */

const ROOT = path.resolve(__dirname, "../../..");
const SCANNED = ["client/portals", "client/shell"];

interface Allowed {
  file: string;
  /** Text the offending line contains. */
  text: string;
  reason: string;
}

const CRM = "client/portals/crm/pages/Index.tsx";
const CLIENT = "client/portals/client/pages/Index.tsx";
const CRM_DEBT = "Known debt. The CRM page still holds its own flags. Step 56 in docs/plans/PLAN_RULE7_CLEANUP.md swaps them for scenarioFacts.";
const CLIENT_DEBT = "Known debt. The Client portal copies the CRM page. Step 57 in docs/plans/PLAN_RULE7_CLEANUP.md decides whether to share it.";

const ALLOWED: Allowed[] = [
  { file: CRM, text: 'currentFlowType === "CoA_DTP" || currentFlowType === "CoA_Copay" || currentFlowType === "CoA_Coverage"', reason: CRM_DEBT },
  { file: CRM, text: 'workflowData.flowType !== "CoA_DTP" && workflowData.flowType !== "CoA_Copay" && workflowData.flowType !== "CoA_Coverage"', reason: CRM_DEBT },
  { file: CRM, text: 'const isFaxFlow = flowType === "Fax_QS_PA_Approved"', reason: CRM_DEBT },
  { file: CRM, text: 'const isPapFlow = flowType === "Fax_PAP_Audit"', reason: CRM_DEBT },
  { file: CRM, text: 'const isIAssistPapFlow = flowType === "iAssist_PAP"', reason: CRM_DEBT },
  { file: CRM, text: 'const isCoaFlow = flowType === "CoA_DTP"', reason: CRM_DEBT },
  { file: CRM, text: 'const isCoverageFlow = flowType === "CoA_Coverage"', reason: CRM_DEBT },
  { file: CRM, text: 'const isCopayRetailFlow = flowType === "CoA_Copay"', reason: CRM_DEBT },
  { file: CRM, text: "if (flowType !== 'iAssist_PAP') return;", reason: CRM_DEBT },
  {
    file: CRM,
    text: "ALL_SCENARIOS.find((s) => s.flowType === flowType)",
    reason: "A scenario lookup by id, not a branch on a flow. Step 56 swaps it for scenarioFor(flowType).",
  },
  { file: CLIENT, text: 'if (currentFlowType === "CoA_DTP" || currentFlowType === "CoA_Copay") {', reason: CLIENT_DEBT },
  { file: CLIENT, text: 'workflowData.flowType !== "CoA_DTP" && workflowData.flowType !== "CoA_Copay"', reason: CLIENT_DEBT },
  { file: CLIENT, text: 'const isFaxFlow = flowType === "Fax_QS_PA_Approved"', reason: CLIENT_DEBT },
  { file: CLIENT, text: 'const isPapFlow = flowType === "Fax_PAP_Audit"', reason: CLIENT_DEBT },
  { file: CLIENT, text: 'const isIAssistPapFlow = flowType === "iAssist_PAP"', reason: CLIENT_DEBT },
  { file: CLIENT, text: 'const isCoaFlow = flowType === "CoA_DTP"', reason: CLIENT_DEBT },
  { file: CLIENT, text: 'const isCopayRetailFlow = flowType === "CoA_Copay"', reason: CLIENT_DEBT },
  { file: CLIENT, text: "flowType === 'iAssist_PAP' ? 'DENY_PA' : 'APPROVE_PA'", reason: CLIENT_DEBT },
  { file: CLIENT, text: "if (flowType !== 'iAssist_PAP') return;", reason: CLIENT_DEBT },
  {
    file: "client/shell/BrandLabDemos.tsx",
    text: '{ id: "',
    reason: "The Brand Lab's list of flows to preview. It is data for a picker (id and label), not a branch on the flow.",
  },
  {
    file: "client/shell/coassistLadders.ts",
    text: "export type CoassistLadderFlow =",
    reason: "A type naming the flows that have a stage ladder. It does not branch.",
  },
  {
    file: "client/shell/iassistLadders.ts",
    text: "export type IassistLadderFlow =",
    reason: "A type naming the flows that have a stage ladder. It does not branch.",
  },
];

const FLOW_COMPARE = /\b\w*(?:[fF]lowType|flow_type)\s*[!=]==/;
const FLOW_IDS = ALL_SCENARIOS.map((s) => s.flowType);
const quoted = (id: string) => new RegExp(`["'\`]${id}["'\`]`);
const FLOW_ID_PATTERNS = FLOW_IDS.map(quoted);

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
        if (isCommentOnly(text)) return;
        if (FLOW_COMPARE.test(text) || FLOW_ID_PATTERNS.some((re) => re.test(text))) hits.push({ file, line: i + 1, text });
      });
  }
  return hits;
}

const covers = (a: Allowed, h: Hit) => a.file === h.file && h.text.includes(a.text);

describe("rule 7 guard: no flow id checks in UI code", () => {
  const hits = findHits();

  it("scans real files", () => {
    const files = SCANNED.flatMap(sourceFiles);
    expect(files).toContain("client/shell/DemoShell.tsx");
    expect(files).toContain("client/portals/crm/pages/Index.tsx");
    expect(files.length).toBeGreaterThan(20);
    expect(FLOW_IDS.length).toBeGreaterThan(0);
  });

  it("the patterns catch what they are meant to", () => {
    expect(FLOW_COMPARE.test('const x = flowType === "a";')).toBe(true);
    expect(FLOW_COMPARE.test("if (workflowData.flowType !== y) return;")).toBe(true);
    expect(FLOW_COMPARE.test("if (flow_type === y) return;")).toBe(true);
    expect(FLOW_COMPARE.test("const flowType = scenario.flowType;")).toBe(false);
    expect(FLOW_ID_PATTERNS.some((re) => re.test(`x === "${FLOW_IDS[0]}"`))).toBe(true);
    expect(FLOW_ID_PATTERNS.some((re) => re.test(`const ${FLOW_IDS[0]} = 1;`))).toBe(false);
  });

  it("every flow id check is on the allowlist", () => {
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
