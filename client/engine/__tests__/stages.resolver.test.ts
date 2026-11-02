import { describe, it, expect } from "vitest";
import { stageMapProblems, stageRulesFor, stageSignalFor, stageVariantsFor, stagesFor, type StageMap } from "@/engine/workflow/stages";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import type { FlowType } from "@/engine/types";
import { ctx, startFlow } from "./harness";

/**
 * The stage resolver (engine/workflow/stages.ts) on a small map, so a change to how rules are picked shows up here and
 * not only in a workflow's recorded stage list. The real workflow maps arrive in refactor step 5, phase 3.
 */
const data = (flowType: FlowType, patch: Record<string, unknown> = {}) => {
  const actor = startFlow(flowType);
  const workflowData = { ...ctx(actor).workflowData, ...patch } as any;
  actor.stop();
  return workflowData;
};

const MAP: StageMap = {
  flows: ["CoA_DTP", "CoA_Coverage"],
  scenarioDefs: ALL_SCENARIOS,
  catalog: [
    { id: "EA-1" },
    { id: "BI-1", signal: "BI", signalWhen: (d) => d.biStatus === "running" },
    { id: "PT-1" },
    { id: "CO-1" },
  ],
  rules: [
    { id: "ea", stage: "EA-1", variant: "default" },
    { id: "bi", stage: "BI-1", variant: "default" },
    { id: "pt", stage: "PT-1", variant: "default", scope: { module: "provider_transfer" } },
    { id: "co.paid", stage: "CO-1", variant: "paid", scope: { module: "provider_transfer" }, when: (d) => d.paymentVerified },
    { id: "co.dtp", stage: "CO-1", variant: "dtp", scenarios: ["CoA_DTP"] },
  ],
};

describe("stage resolver", () => {
  it("keeps catalog order and drops a stage with no matching rule", () => {
    expect(stagesFor(MAP, data("CoA_DTP")).map((p) => p.stage)).toEqual(["EA-1", "BI-1", "CO-1"]);
    expect(stagesFor(MAP, data("CoA_Coverage")).map((p) => p.stage)).toEqual(["EA-1", "BI-1", "PT-1"]);
  });

  it("reads a scenario list and a module scope the same way the screen map does", () => {
    expect(stageRulesFor(MAP, "CoA_DTP").map((r) => r.id)).toEqual(["ea", "bi", "co.dtp"]);
    expect(stageRulesFor(MAP, "CoA_Coverage").map((r) => r.id)).toEqual(["ea", "bi", "pt", "co.paid"]);
  });

  it("takes the first rule whose condition holds", () => {
    const paid = stagesFor(MAP, data("CoA_Coverage", { paymentVerified: true }));
    expect(paid.find((p) => p.stage === "CO-1")).toEqual({ stage: "CO-1", variant: "paid" });
    const unpaid = stagesFor(MAP, data("CoA_Coverage", { paymentVerified: false }));
    expect(unpaid.find((p) => p.stage === "CO-1")).toBeUndefined();
  });

  it("lists every variant a scenario can use", () => {
    expect(stageVariantsFor(MAP, "CoA_DTP")).toContainEqual({ stage: "CO-1", variant: "dtp" });
    expect(stageVariantsFor(MAP, "CoA_DTP")).not.toContainEqual({ stage: "CO-1", variant: "paid" });
  });

  it("sends a stage signal only while its condition holds", () => {
    expect(stageSignalFor(MAP, "BI-1", data("CoA_DTP", { biStatus: "running" }))).toBe("BI");
    expect(stageSignalFor(MAP, "BI-1", data("CoA_DTP", { biStatus: "complete" }))).toBeNull();
    expect(stageSignalFor(MAP, "EA-1", data("CoA_DTP"))).toBeNull();
    expect(stageSignalFor(MAP, "NOPE", data("CoA_DTP"))).toBeNull();
  });
});

describe("stage map problems", () => {
  it("accepts a sound map", () => {
    expect(stageMapProblems(MAP)).toEqual([]);
  });

  it("names each kind of mistake", () => {
    const bad: StageMap = {
      flows: ["CoA_DTP"],
      catalog: [{ id: "A" }, { id: "A" }, { id: "B", signalWhen: () => true }, { id: "C", signal: "X" }, { id: "D", signal: "X" }],
      rules: [
        { id: "r", stage: "A", variant: "v" },
        { id: "r", stage: "Z", variant: "v" },
        { stage: "A", variant: "w", scope: { module: "provider_transfer" } },
      ],
    };
    expect(stageMapProblems(bad)).toEqual([
      'stage "A" is in the catalog twice',
      'stage "B" has signalWhen but no signal',
      'signal "X" is used by two stages',
      'stage rule "r" names stage "Z", which the catalog does not list',
      'stage rule id "r" is used twice',
      'stage rule "A.w" has a scope but the map has no scenarioDefs',
    ]);
  });
});
