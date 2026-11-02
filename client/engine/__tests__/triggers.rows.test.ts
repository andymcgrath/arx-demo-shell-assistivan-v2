import { describe, expect, it } from "vitest";
import type { FlowType } from "@/engine/types";
import { createInitialWorkflowData } from "@/engine/workflow/baseData";
import { rulesFor, triggerRows } from "@/engine/workflow/triggers";
import { WORKFLOW_DEFINITIONS, definitionFor } from "@/workflows/definitions";
import { defaultPayload } from "@/shell/triggerPayloads";
import { stageMapFor } from "@/workflows/stageMaps";
import { SCENARIOS } from "./scenarios";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * What the Trigger panel offers, per rule (docs/plans/arx-demo-patient-refactor-plan.md, step 4). The panel is read from
 * the workflow definition, so these tests pin the readings: who fires a step is the scenario's, a result an agent step
 * reveals is never a button, and the labels the presenter sees follow the rules.
 */

const rowsAt = (flow: FlowType, steps: Parameters<typeof runSteps>[1], choices?: Record<string, string>) => {
  const actor = startFlow(flow, choices ? { choices } : {});
  runSteps(actor, steps);
  const rows = triggerRows(definitionFor(flow)!, ctx(actor).workflowData, stageMapFor(flow), defaultPayload);
  actor.stop();
  return rows;
};

describe("who fires a step is the scenario's", () => {
  it("SUBMIT_PA runs on its own for an eRx scenario and waits for the provider on a fax scenario", () => {
    withFrozenClock(() => {
      const verify = [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];
      const erx = rowsAt("CoA_DTP", [...verify, { type: "COMPLETE_BI", result: "coverage_found" }]);
      expect(erx.find((r) => r.event === "SUBMIT_PA")?.kind ?? "gone").not.toBe("manual");
      const fax = rowsAt("Fax_QS_PA_Approved", [{ type: "REFERRAL_RECEIVED" }, { type: "INVITE" }, ...verify.slice(1), { type: "COMPLETE_BI", result: "coverage_found" }]);
      expect(fax.find((r) => r.event === "SUBMIT_PA")?.kind).toBe("manual");
    });
  });

  it("opening the BI stage is an agent step that reveals the BI result after the machine's delay", () => {
    withFrozenClock(() => {
      const rows = rowsAt("CoA_DTP", [{ type: "REFERRAL_RECEIVED" }]);
      const bi = rows.find((r) => r.kind === "agent");
      expect(bi).toMatchObject({ event: "VIEW_STAGE", payload: { stage: "BI" }, reveals: { event: "COMPLETE_BI", afterMs: 3000 } });
    });
  });

  it("offers nothing the patient does on their own screens", () => {
    withFrozenClock(() => {
      const rows = rowsAt("CoA_DTP", [{ type: "REFERRAL_RECEIVED" }]);
      for (const patient of ["VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "PATIENT_SETS_ADDRESS"]) {
        expect(rows.map((r) => r.event)).not.toContain(patient);
      }
    });
  });
});

describe("results are never buttons", () => {
  /** Every event an agent automation can send, over each scenario's default branches and every fork exit. */
  function agentSent(def: (typeof WORKFLOW_DEFINITIONS)[number]): Set<string> {
    const sent = new Set<string>();
    for (const scenario of Object.values(def.scenarios)) {
      if (!scenario) continue;
      const forks = (def.forks ?? []).filter((f) => !f.scenarios || f.scenarios.includes(scenario.flowType));
      const picks: Record<string, string>[] = [{}, ...forks.flatMap((f) => f.exits.map((e) => ({ [f.id]: e.id })))];
      for (const choices of picks) {
        const data = createInitialWorkflowData(scenario.flowType, { ...scenario.initialData, choices: { ...scenario.choices, ...choices } });
        for (const rule of rulesFor(def, scenario)) {
          for (const a of [rule.then ?? []].flat()) {
            if (a.trigger !== "agent") continue;
            try {
              sent.add(a.send(data, { type: rule.on, stage: "x" }, scenario).type);
            } catch {
              // needs fields the probe lacks
            }
          }
        }
      }
    }
    return sent;
  }

  it("marks every event an agent step can reveal as autoOnly", () => {
    for (const def of WORKFLOW_DEFINITIONS) {
      const sent = agentSent(def);
      expect(sent.size, `${def.id} has no agent step`).toBeGreaterThan(0);
      for (const type of sent) {
        const unmarked = def.rules.filter((r) => r.on === type && !r.autoOnly).map((r) => r.id ?? r.on);
        expect({ workflow: def.id, event: type, unmarked }).toEqual({ workflow: def.id, event: type, unmarked: [] });
      }
    }
  });

  it("never lists a result as a manual row, in any state a golden path passes through", () => {
    withFrozenClock(() => {
      const results = new Set(WORKFLOW_DEFINITIONS.flatMap((d) => [...agentSent(d)]));
      for (const scenario of SCENARIOS) {
        for (let k = -1; k < scenario.steps.length; k++) {
          const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
          runSteps(actor, scenario.steps.slice(0, k + 1));
          const rows = triggerRows(definitionFor(scenario.flowType)!, ctx(actor).workflowData, stageMapFor(scenario.flowType), defaultPayload);
          actor.stop();
          const offered = rows.filter((r) => r.kind === "manual" && results.has(r.event)).map((r) => r.event);
          expect({ scenario: scenario.name, after: k, offered }).toEqual({ scenario: scenario.name, after: k, offered: [] });
        }
      }
    });
  });
});

describe("rows read from the machine's own rules", () => {
  it("lists nothing for a scenario with no definition", () => {
    const def = definitionFor("CoA_DTP")!;
    const data = createInitialWorkflowData("CoA_DTP", {});
    expect(triggerRows(def, { ...data, flowType: "Nope" as any }, stageMapFor("CoA_DTP"))).toEqual([]);
  });

  it("every scenario has a definition, and every definition rule names a real scenario scope", () => {
    for (const scenario of SCENARIOS) expect(definitionFor(scenario.flowType), scenario.flowType).toBeTruthy();
  });
});
