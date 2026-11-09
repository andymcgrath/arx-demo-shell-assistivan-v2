import { describe, it, expect } from "vitest";
import { createActor, SimulatedClock } from "xstate";
import type { MachineContext } from "@/engine/types";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COA_APA_SPECIALTY } from "@/workflows/coassist/scenarios";
import { coassistMachine } from "@/workflows/coassist";
import { routeFor } from "@/engine/workflow/screens";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { STAGE_BUILDERS } from "@/portals/crm/stages/builders";
import { PA_FORM_SKIP_MS } from "@/workflows/shared/apa";

/**
 * CoAssist APA with an assigned specialty pharmacy: the Mirum demo "ABV with APA, specialty pharmacy ships".
 * The pharmacy benefit covers it (`pharmacy_transfer`), the prescriber completes the PA form, the pharmacy accepts the Rx
 * on its white-label intake screen, the case goes to the client's CRM, and the pharmacy ships. The last card is tracking,
 * so the end state is the Rx delivered.
 */

function start(choices: Record<string, string> = { bi: "pharmacy_transfer", pa: "approved" }) {
  const clock = new SimulatedClock();
  const actor = createActor(coassistMachine, { input: { flowType: "CoA_APA_Specialty", choices }, clock } as any);
  actor.start();
  const data = () => (actor.getSnapshot().context as MachineContext).workflowData;
  const accepts = (e: { type: string; [k: string]: unknown }) => actor.getSnapshot().can(e as any);
  const send = (...events: { type: string; [k: string]: unknown }[]) => events.forEach((e) => actor.send(e as any));
  const route = () => routeFor(COASSIST_SCREENS, data());
  return { actor, clock, data, accepts, send, route };
}

const ENROLL = [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];
const FORM = [{ type: "OPEN_PA_FORM_LINK" }, { type: "VERIFY_PRESCRIBER", npi: "1234567890", pin: "4321" }, { type: "SUBMIT_PA_FORM" }];
const PA_TEXT = [{ type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }];

describe("the Mirum demo: ABV with APA, specialty pharmacy ships", () => {
  it("has a valid recipe, and its pinned BI exit assigns a pharmacy", () => {
    const forks = forksForScenario(COASSIST_FORKS, "CoA_APA_Specialty");
    expect(recipeProblems(COA_APA_SPECIALTY.recipe!, forks)).toEqual([]);
    expect(COA_APA_SPECIALTY.recipe!.choices).toEqual({ bi: "pharmacy_transfer", pa: "approved" });
  });

  it("reaches delivered, with the form, the intake, and the CRM handoff in order", () => {
    const t = start();
    t.send(...ENROLL, { type: "COMPLETE_BI" });
    expect(t.data()).toMatchObject({ paRequired: true, pharmacyAssigned: true, paFormStatus: "sent", paStatus: "none" });
    t.send(...FORM);
    expect(t.data().paStatus).toBe("submitted");
    t.send({ type: "APPROVE_PA" }, ...PA_TEXT);
    expect(t.data()).toMatchObject({ paStatus: "approved", paApprovedOtpVerified: true, selectedPharmacy: COA_APA_SPECIALTY.content.transferPharmacy });
    expect(t.route()).toBe("/pharmacy-transfer");
    t.send({ type: "ACCEPT_PHARMACY_INTAKE" });
    // Accepting the intake fires the handoff on its own (system).
    expect(t.data()).toMatchObject({ pharmacyIntakeStatus: "accepted", crmHandoffStatus: "sent" });
    t.send({ type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" });
    expect(t.route()).toBe("/order-shipped");
    t.send({ type: "DELIVER_RX" });
    expect(t.data().pharmacyStatus).toBe("delivered");
    expect(t.route()).toBe("/medication-delivered");
  });

  it("the CRM shows the handoff stage only once the case was sent", () => {
    const t = start();
    t.send(...ENROLL, { type: "COMPLETE_BI" }, ...FORM, { type: "APPROVE_PA" }, ...PA_TEXT);
    const build = STAGE_BUILDERS["HO-14290"].standard;
    expect(build(t.data()).isNotStarted).toBe(true);
    t.send({ type: "ACCEPT_PHARMACY_INTAKE" });
    expect(build(t.data())).toMatchObject({ statusLabel: "Sent", isComplete: true });
  });

  it("keeps each step behind the one before it (preconditions)", () => {
    const t = start();
    t.send(...ENROLL, { type: "COMPLETE_BI" });
    // Before the PA result is verified, the pharmacy cannot accept, the CRM gets nothing, and nothing fills.
    for (const type of ["ACCEPT_PHARMACY_INTAKE", "HAND_OFF_TO_CRM", "FILL_RX"]) expect(t.accepts({ type }), type).toBe(false);
    t.send(...FORM, { type: "APPROVE_PA" }, ...PA_TEXT);
    // The intake is open, but the handoff and fulfillment wait for it.
    expect(t.accepts({ type: "HAND_OFF_TO_CRM" })).toBe(false);
    expect(t.accepts({ type: "FILL_RX" })).toBe(false);
    expect(t.accepts({ type: "ACCEPT_PHARMACY_INTAKE" })).toBe(true);
    t.send({ type: "ACCEPT_PHARMACY_INTAKE" });
    expect(t.accepts({ type: "ACCEPT_PHARMACY_INTAKE" })).toBe(false);
    expect(t.accepts({ type: "HAND_OFF_TO_CRM" })).toBe(false); // already sent
    expect(t.accepts({ type: "FILL_RX" })).toBe(true);
  });

  it("decides the PA when the agent opens the PA stage, not on its own after the form", () => {
    const t = start();
    t.send(...ENROLL, { type: "COMPLETE_BI" }, ...FORM);
    t.clock.increment(PA_FORM_SKIP_MS * 10);
    expect(t.data().paStatus).toBe("submitted");
    t.send({ type: "VIEW_STAGE", stage: "PA" });
    t.clock.increment(5000);
    expect(t.data().paStatus).toBe("approved");
  });
});
