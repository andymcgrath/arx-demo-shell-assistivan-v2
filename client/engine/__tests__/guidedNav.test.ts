import { describe, expect, it } from "vitest";
import { eventFor, triggerRows } from "@/engine/workflow/triggers";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { nextStep } from "@/shell/guidedNav";
import { isFinished, stageAt } from "@/shell/stageAt";
import { stageList } from "@/shell/stageJump";
import { defaultPayload } from "@/shell/triggerPayloads";
import { definitionFor } from "@/workflows/definitions";
import { stageMapFor } from "@/workflows/stageMaps";
import { END_STATES, SCENARIOS, type Scenario } from "./scenarios";
import { SimulatedClock, ctx, startFlow, withFrozenClock } from "./harness";

/**
 * Guided Next (shell/guidedNav.ts). The patient view is handed to a client who drives it alone, so Next must always do
 * something useful: send the back-office step that moves the case on, or say what to do on the phone. This plays every
 * golden path with only Next and the patient's own phone steps, in the order the story gives them, and fails with where
 * Next left the client stuck. Same shape as the Trigger panel test, with Next doing the choosing.
 */

/** Demo fork picks for the golden paths that send their outcome directly (as in the Trigger panel test). */
const DEMO_CHOICES: Record<string, Record<string, string>> = {
  "coa-dtp-pa-denied-cash-offer": { pa: "denied" },
  "coa-coverage-2-medical-covered-provider-transfer": { bi: "medical_covered" },
  "coa-coverage-3-no-coverage-cash-pay": { bi: "no_coverage" },
};

/** Golden paths Next cannot finish, with the reason. An entry that now passes fails the test, so the list only shrinks. */
const CANNOT_FINISH: Record<string, string> = {
  "fax-standard-pa-denied": "the Standard scenario has no denied branch, so no step leads to a denied PA",
};

function playWithNext(scenario: Scenario) {
  const clock = new SimulatedClock();
  const choices = { ...scenario.choices, ...DEMO_CHOICES[scenario.name] };
  const actor = startFlow(scenario.flowType, { clock, ...(Object.keys(choices).length ? { choices } : {}) });
  const def = definitionFor(scenario.flowType)!;
  const stages = stageMapFor(scenario.flowType);
  const phoneSteps = [...scenario.steps];
  const log: string[] = [];
  const data = () => ctx(actor).workflowData;
  const finish = (stuck?: string) => {
    const d = data();
    actor.stop();
    return { stuck, d, log };
  };

  for (let guard = 0; guard < 120; guard++) {
    if (END_STATES[scenario.endsAt](data())) return finish();
    const rows = triggerRows(def, data(), stages, defaultPayload);
    const next = nextStep(scenario.flowType, data(), rows);
    if (next.kind === "fire") {
      log.push(`Next: ${next.row.event}`);
      actor.send(eventFor({ ...next.row, payload: { ...next.row.payload, ...defaultPayload(next.row.event, data()) } }) as any);
      if (next.row.kind === "agent") {
        clock.increment((next.row.reveals?.afterMs ?? 0) + 1);
        actor.send({ type: "LEAVE_STAGE", portal: "crm", stage: next.row.stage } as any);
      }
      continue;
    }
    if (next.kind === "wait") {
      log.push(`wait: ${next.row.event}`);
      const before = JSON.stringify(data());
      clock.increment((next.row.reveals?.afterMs ?? 0) + 1);
      if (JSON.stringify(data()) === before) return finish(`Next waits for ${next.row.event} and it never ran. ${log.join(", ")}`);
      continue;
    }
    if (next.kind === "done") return finish(`Next says done, the end state is not reached. ${log.join(", ")}`);
    // The patient's turn: the first phone step of the story that the machine takes now. A step it is not ready for stays in the list.
    const before = JSON.stringify(data());
    let moved = false;
    for (let i = 0; i < phoneSteps.length && !moved; i++) {
      const { type, ...payload } = phoneSteps[i];
      actor.send({ type, ...payload } as any);
      moved = JSON.stringify(data()) !== before;
      if (moved) {
        phoneSteps.splice(i, 1);
        log.push(`phone: ${type}`);
      }
    }
    if (!moved) {
      // Time passing is the client waiting a few seconds: a delayed step may be about to light Next up.
      const quiet = JSON.stringify(data());
      clock.increment(30_000);
      if (JSON.stringify(data()) === quiet) return finish(`Next says "${next.hint}" and the story has no phone step left. left: [${phoneSteps.map((p) => p.type).join(", ")}] sms=${data().paApprovedSmsVerified} otp=${data().paApprovedOtpVerified} ${log.join(", ")}`);
      log.push("time passed");
    }
  }
  return finish(`did not finish. ${log.join(", ")}`);
}

describe("guided Next finishes every scenario", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: Next and the patient's phone reach ${scenario.endsAt}`, () => {
      withFrozenClock(() => {
        const run = playWithNext(scenario);
        const reached = !run.stuck && END_STATES[scenario.endsAt](run.d);
        if (CANNOT_FINISH[scenario.name]) {
          expect({ name: scenario.name, reached }, `${scenario.name} now finishes. Delete it from CANNOT_FINISH.`).toEqual({ name: scenario.name, reached: false });
          return;
        }
        expect({ stuck: run.stuck, reached }).toEqual({ stuck: undefined, reached: true });
      });
    });
  }
});

describe("what Next says", () => {
  it("fires the referral first, waits on the phone while the patient enrolls, then opens BI", () => {
    withFrozenClock(() => {
      const actor = startFlow("CoA_DTP");
      const def = definitionFor("CoA_DTP")!;
      const stages = stageMapFor("CoA_DTP");
      const step = () => nextStep("CoA_DTP", ctx(actor).workflowData, triggerRows(def, ctx(actor).workflowData, stages, defaultPayload));
      expect(step()).toMatchObject({ kind: "fire", row: { event: "REFERRAL_RECEIVED" } });
      actor.send({ type: "REFERRAL_RECEIVED", portal: "crm" } as any);
      // BI runs on its own at an eRx referral, but the client's next move is to enroll on the phone.
      expect(step().kind).toBe("patient");
      for (const type of ["VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"]) actor.send({ type, portal: "patient" } as any);
      expect(step()).toMatchObject({ kind: "fire", row: { event: "VIEW_STAGE", stage: "BI" } });
      actor.stop();
    });
  });

  it("names the screen the patient is on when it waits", () => {
    withFrozenClock(() => {
      const actor = startFlow("Fax_QS_PA_Approved");
      for (const type of ["REFERRAL_RECEIVED", "INVITE"]) actor.send({ type, portal: "crm" } as any);
      const data = ctx(actor).workflowData;
      const step = nextStep("Fax_QS_PA_Approved", data, triggerRows(definitionFor("Fax_QS_PA_Approved")!, data, stageMapFor("Fax_QS_PA_Approved"), defaultPayload));
      expect(step).toMatchObject({ kind: "patient" });
      expect((step as any).hint).toMatch(/^Continue on the phone/);
      expect(derivePatientRoute(ctx(actor))).toBeTruthy();
      actor.stop();
    });
  });

  it("says done on the last stage", () => {
    withFrozenClock(() => {
      const scenario = SCENARIOS.find((s) => s.name === "fax-standard-pa-approved")!;
      const actor = startFlow(scenario.flowType);
      for (const { type, ...payload } of scenario.steps) actor.send({ type, ...payload } as any);
      const data = ctx(actor).workflowData;
      expect(stageAt(scenario.flowType, data.choices, data)).toBe(stageList(scenario.flowType, data.choices).length);
      expect(isFinished(scenario.flowType, data.choices, data)).toBe(true);
      expect(nextStep(scenario.flowType, data, [])).toEqual({ kind: "done" });
      actor.stop();
    });
  });
});
