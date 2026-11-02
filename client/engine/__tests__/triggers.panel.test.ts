import { describe, expect, it } from "vitest";
import type { FlowType, WorkflowData } from "@/engine/types";
import { eventFor, isFireable, rulesFor, sourcePortal, triggerRows, type TriggerRow } from "@/engine/workflow/triggers";
import { defaultPayload } from "@/shell/triggerPayloads";
import { definitionFor } from "@/workflows/definitions";
import { stageMapFor } from "@/workflows/stageMaps";
import { END_STATES, SCENARIOS, type Scenario } from "./scenarios";
import { SimulatedClock, ctx, startFlow, withFrozenClock } from "./harness";

/**
 * The Trigger panel can finish every scenario (docs/plans/arx-demo-patient-refactor-plan.md, step 4). The patient view has
 * no CRM, provider, or iAssist app, so the panel offers what those apps do, read from the workflow definition. This test
 * plays each golden path with only two hands: the patient's own events (the steps the patient's screens send) and the rows
 * the panel offers. An agent row is fired the way the CRM fires it: VIEW_STAGE, wait for the machine's delay, LEAVE_STAGE.
 * A scenario the panel cannot finish fails with where it got stuck.
 */

const defOf = (flow: FlowType) => definitionFor(flow)!;

/**
 * Golden paths the panel cannot finish, with the reason. An entry that now passes fails the test, so the list only shrinks.
 * fax-standard-pa-denied: the Standard scenario's PA outcome is "approved" and no app can deny it. The golden path sends
 * DENY_PA directly, so the denied branch exists only in tests.
 */
/**
 * The fork picks a demo makes. A golden path that denies the PA or lands on another coverage result sends that outcome
 * directly. In the app the outcome is the demo's branch, and the agent step only reveals it (CLAUDE.md rule 14).
 */
const DEMO_CHOICES: Record<string, Record<string, string>> = {
  "coa-dtp-pa-denied-cash-offer": { pa: "denied" },
  "coa-coverage-2-medical-covered-provider-transfer": { bi: "medical_covered" },
  "coa-coverage-3-no-coverage-cash-pay": { bi: "no_coverage" },
};

/**
 * Events the presenter fires from the panel that the golden path never sends, because it jumps over them.
 * iassist-pa-denied-appeal: the appeal starts when "Initiate appeal on PA denial" is switched on in the Rules portal.
 */
const ALSO_FIRE: Record<string, string[]> = {
  "iassist-pa-denied-appeal": ["SET_APPEAL_RULE"],
};

const CANNOT_FINISH: Record<string, string> = {
  "fax-standard-pa-denied": "the Standard scenario has no denied branch",
};

/** True when the patient sends this event in the scenario: the rules log it as the patient's. */
function isPatientEvent(flow: FlowType, type: string): boolean {
  const def = defOf(flow);
  const scenario = def.scenarios[flow]!;
  const portals = rulesFor(def, scenario).filter((r) => r.on === type).map(sourcePortal);
  return portals.find(Boolean) === "patient";
}

interface Run {
  fired: TriggerRow[];
  data: WorkflowData;
  /** Set when the panel could not carry the run: which step, and what it offered instead. */
  stuck?: string;
}

/**
 * Plays the golden path in order. A patient event is the patient's own. For any other event, the panel must offer it:
 * a manual row of that type, or an agent row that reveals it. When the panel offers neither, the event is either
 * something the machine already did (an automation ran it) or a gap: if the machine accepts it when sent directly, the
 * panel could not have produced it.
 */
function playWithPanel(scenario: Scenario): Run {
  const clock = new SimulatedClock();
  const choices = { ...scenario.choices, ...DEMO_CHOICES[scenario.name] };
  const actor = startFlow(scenario.flowType, { clock, ...(Object.keys(choices).length ? { choices } : {}) });
  const def = defOf(scenario.flowType);
  const stages = stageMapFor(scenario.flowType);
  const fired: TriggerRow[] = [];
  const snapshot = () => JSON.stringify(ctx(actor).workflowData);
  const finish = (stuck?: string): Run => {
    const data = ctx(actor).workflowData;
    actor.stop();
    return { fired, data, stuck };
  };

  const pending = new Set(ALSO_FIRE[scenario.name] ?? []);
  for (const step of scenario.steps) {
    for (const event of [...pending]) {
      const extra = triggerRows(def, ctx(actor).workflowData, stages, defaultPayload).find((r) => r.kind === "manual" && r.event === event);
      if (!extra) continue;
      pending.delete(event);
      fired.push(extra);
      actor.send(eventFor({ ...extra, payload: { ...extra.payload, ...defaultPayload(event, ctx(actor).workflowData) } }) as any);
    }
    const { type, ...payload } = step;
    if (isPatientEvent(scenario.flowType, type)) {
      actor.send({ type, ...payload } as any);
      continue;
    }
    const data = ctx(actor).workflowData;
    const all = triggerRows(def, data, stages, defaultPayload);
    const rows = all.filter(isFireable);
    const row = rows.find((r) => (r.kind === "manual" && r.event === type) || (r.kind === "agent" && r.reveals?.event === type));
    if (row) {
      fired.push(row);
      actor.send(eventFor({ ...row, payload: { ...row.payload, ...defaultPayload(row.event, data) } }) as any);
      if (row.kind === "agent") {
        clock.increment((row.reveals?.afterMs ?? 0) + 1);
        actor.send({ type: "LEAVE_STAGE", portal: "crm", stage: row.stage } as any);
      }
      continue;
    }
    // A system step runs on its own after its delay. Wait for it.
    const system = all.find((r) => r.kind === "system" && r.event === type);
    if (system) {
      clock.increment((system.reveals?.afterMs ?? 0) + 1);
      continue;
    }
    const before = snapshot();
    actor.send({ type, ...payload } as any);
    if (snapshot() !== before) {
      return finish(`no row offers ${type}, and the machine accepts it. fired: [${fired.map((r) => r.event).join(", ")}]. rows now: [${rows.map((r) => `${r.kind}:${r.event}`).join(", ")}]`);
    }
  }
  return finish();
}

describe("the panel finishes every scenario", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: reaches ${scenario.endsAt} with the patient and the panel`, () => {
      withFrozenClock(() => {
        const run = playWithPanel(scenario);
        const reached = !run.stuck && END_STATES[scenario.endsAt](run.data);
        if (process.env.DEBUG_PANEL && !reached) console.log("DEBUG", scenario.name, JSON.stringify({ stuck: run.stuck, fired: run.fired.map((r) => r.event), d: { pa: run.data.paStatus, bi: run.data.biStatus, appeal: run.data.appealStatus, pharm: run.data.pharmacyStatus, prov: run.data.providerTransferStatus, provSms: run.data.providerTransferSmsVerified, cash: run.data.cashOfferSmsSent, disp: run.data.dispatchStatus, sel: run.data.selectedPharmacy?.name, inf: (run.data as any).infusionDate, ps: (run.data as any).papStatus } }));
        if (CANNOT_FINISH[scenario.name]) {
          expect({ name: scenario.name, reached }, `${scenario.name} now finishes. Delete it from CANNOT_FINISH.`).toEqual({ name: scenario.name, reached: false });
          return;
        }
        expect({ stuck: run.stuck, reached }).toEqual({ stuck: undefined, reached: true });
      });
    });
  }
});
