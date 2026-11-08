import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { draftFromScenario, addGhost, moveCard, removeCard, setPick } from "@/workflows/catalog/editor";
import { validateDemoRequest, type DemoRequest } from "@/workflows/catalog/request";
import { mergeDemos, planApply } from "@/workflows/catalog/apply";
import { findRequest, runApply, type ApplyDeps } from "../../../scripts/demoApply";

/** `pnpm demo:apply` turns a request with no ghost cards into demos in the client's brand file. No model. */

const filled = (d: DemoRequest): DemoRequest => ({
  ...d,
  client: "acme",
  slug: "acme-demo",
  brand: { name: "Acme", drug: "Acmedrug", indication: "Condition", documents: [] },
  winTheme: "One handoff",
  demoDate: "2026-12-01",
  demos: d.demos.map((x, i) => ({ ...x, id: `demo-${i + 1}`, label: x.label || `Demo ${i + 1}` })),
});

const PARENT = "parent-brand";
const recipeFlows = ALL_SCENARIOS.filter((s) => s.recipe).map((s) => s.flowType);
const request = (flow = "iAssist_Buy_And_Bill" as (typeof recipeFlows)[number]) => filled(draftFromScenario(flow, { title: "Acme" })!);

describe("planApply", () => {
  for (const flow of recipeFlows) {
    it(`matches a request built from ${flow} back to ${flow}`, () => {
      const plan = planApply(request(flow), undefined, PARENT);
      expect(plan.ok, plan.ok ? "" : plan.problems.join()).toBe(true);
      if (plan.ok) {
        expect(plan.flow).toBe(flow);
        expect(plan.demos[0]).toMatchObject({ flow, id: "demo-1" });
      }
    });
  }

  it("writes the picks as demo choices, and drops empty choices", () => {
    const plan = planApply(setPick(request(), 0, "bi", "medical_buy_and_bill"), undefined, PARENT);
    expect(plan.ok && plan.demos[0].choices).toMatchObject({ bi: "medical_buy_and_bill", pa: "approved" });
  });

  it("rejects a request with a ghost card, and points at the prompt", () => {
    const d = addGhost(request());
    const ghost = { ...d, cards: d.cards.map((c) => (c.kind === "ghost" ? { ...c, name: "Intake", sees: "A form", app: "provider" as const, lane: "hcp" as const } : c)) };
    const plan = planApply(ghost, undefined, PARENT);
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.problems.join()).toContain("1 ghost card (Intake)");
  });

  it("rejects a request that is not export-ready", () => {
    const plan = planApply({ ...request(), winTheme: "" }, undefined, PARENT);
    expect(!plan.ok && plan.problems.join()).toContain("win theme is required");
  });

  it("rejects blocks no recipe has, and says how far off the closest recipe is", () => {
    const d = request("iAssist_PA_Approved");
    const plan = planApply(removeCard(d, d.cards.findIndex((c) => c.kind === "block" && c.moduleId === "tracking")), undefined, PARENT);
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.problems.join()).toMatch(/Closest is iAssist_PA_Approved, which also has tracking:default/);
    expect(!plan.ok && plan.problems.join()).toContain("Use the generated prompt");
  });

  it("rejects a request whose intake differs from the recipe's", () => {
    const plan = planApply({ ...request(), intake: "fax" }, undefined, PARENT);
    expect(!plan.ok && plan.problems.join()).toContain("its intake is erx");
  });

  it("notes a different block order, since the machine follows the recipe's order", () => {
    const d = request("iAssist_PA_Approved");
    // Payment and pharmacy selection need nothing from each other, so swapping them stays legal.
    const swapped = moveCard(d, 2, 1);
    const plan = planApply(swapped, undefined, PARENT);
    expect(plan.ok, plan.ok ? "" : plan.problems.join()).toBe(true);
    expect(plan.ok && plan.notes.join()).toContain("different order");
  });

  it("builds a minimal brand file that extends its parent when there is none", () => {
    const plan = planApply(request(), undefined, PARENT);
    expect(plan.ok && plan.created).toBe(true);
    expect(plan.ok && plan.brand).toMatchObject({ extends: PARENT, slug: "acme", name: "Acme", title: "Acme Demo", manufacturer: { name: "Acme" }, program: { drugDisplayName: "Acmedrug" } });
  });

  it("merges into an existing brand file: same id replaced, new id appended, others kept", () => {
    const existing = { slug: "acme", name: "Acme", demos: [{ id: "keep", flow: "CoA_DTP", label: "Keep" }, { id: "demo-1", flow: "CoA_DTP", label: "Old" }], other: 1 };
    const plan = planApply(request(), existing, PARENT);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.created).toBe(false);
      expect(plan.brand.other).toBe(1);
      expect((plan.brand.demos as { id: string; label: string }[]).map((d) => `${d.id}:${d.label}`)).toEqual(["keep:Keep", "demo-1:Acme"]);
    }
  });

  it("mergeDemos keeps order and never repeats an id", () => {
    const a = { id: "a", flow: "CoA_DTP", label: "A" } as const;
    const b = { id: "b", flow: "CoA_DTP", label: "B" } as const;
    expect(mergeDemos([a, b], [{ ...a, label: "A2" }, { id: "c", flow: "CoA_DTP", label: "C" }]).map((d) => `${d.id}:${d.label}`)).toEqual(["a:A2", "b:B", "c:C"]);
  });
});

describe("runApply", () => {
  let root: string;
  const passing: ApplyDeps["runBrandTest"] = () => ({ ok: true, output: "" });
  const deps = (over: Partial<ApplyDeps> = {}): ApplyDeps => ({ planApply: (r, e) => planApply(r, e, PARENT), validate: validateDemoRequest, runBrandTest: passing, ...over });
  const put = (client: string, slug: string, req: unknown) => {
    fs.mkdirSync(path.join(root, "docs", "demos", client), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "demos", client, `${slug}.request.json`), JSON.stringify(req));
  };
  const brandFile = (client = "acme") => path.join(root, "brands", client, "brand.json");

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-apply-"));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("writes the brand file and runs the brand test", () => {
    put("acme", "acme-demo", request());
    let ran = 0;
    const out = runApply(root, "acme/acme-demo", deps({ runBrandTest: () => (ran++, { ok: true, output: "" }) }));
    expect(out.ok, out.lines.join("\n")).toBe(true);
    expect(ran).toBe(1);
    expect(JSON.parse(fs.readFileSync(brandFile(), "utf8")).demos[0].flow).toBe("iAssist_Buy_And_Bill");
  });

  it("finds a request by its bare name when one client has it, and refuses when two do", () => {
    put("acme", "acme-demo", request());
    expect("file" in findRequest(root, "acme-demo")).toBe(true);
    put("other", "acme-demo", request());
    expect("error" in findRequest(root, "acme-demo")).toBe(true);
  });

  it("restores an existing brand file when the brand test fails", () => {
    put("acme", "acme-demo", request());
    fs.mkdirSync(path.dirname(brandFile()), { recursive: true });
    const original = `${JSON.stringify({ slug: "acme", demos: [{ id: "keep", flow: "CoA_DTP", label: "Keep" }] }, null, 2)}\n`;
    fs.writeFileSync(brandFile(), original);
    const out = runApply(root, "acme/acme-demo", deps({ runBrandTest: () => ({ ok: false, output: "boom" }) }));
    expect(out.ok).toBe(false);
    expect(out.lines.join("\n")).toContain("put back as it was");
    expect(fs.readFileSync(brandFile(), "utf8")).toBe(original);
  });

  it("removes a brand file it created when the brand test fails", () => {
    put("acme", "acme-demo", request());
    runApply(root, "acme/acme-demo", deps({ runBrandTest: () => ({ ok: false, output: "boom" }) }));
    expect(fs.existsSync(path.join(root, "brands", "acme"))).toBe(false);
  });

  it("writes nothing on a dry run", () => {
    put("acme", "acme-demo", request());
    const out = runApply(root, "acme/acme-demo", deps(), { dry: true });
    expect(out.ok).toBe(true);
    expect(fs.existsSync(path.join(root, "brands"))).toBe(false);
  });

  it("rejects a name that is a path, a missing request, and a request filed under another client", () => {
    expect(runApply(root, "../../etc/passwd", deps()).ok).toBe(false);
    expect(runApply(root, "acme/none", deps()).ok).toBe(false);
    put("other", "acme-demo", request());
    const out = runApply(root, "other/acme-demo", deps());
    expect(out.lines.join()).toContain('says client "acme" but sits in docs/demos/other/');
    expect(fs.existsSync(path.join(root, "brands"))).toBe(false);
  });

  it("writes nothing for a request with a ghost card", () => {
    const d = addGhost(request());
    put("acme", "acme-demo", { ...d, cards: d.cards.map((c) => (c.kind === "ghost" ? { ...c, name: "x", sees: "y", app: "crm", lane: "agent" } : c)) });
    const out = runApply(root, "acme/acme-demo", deps());
    expect(out.ok).toBe(false);
    expect(fs.existsSync(path.join(root, "brands"))).toBe(false);
  });
});
