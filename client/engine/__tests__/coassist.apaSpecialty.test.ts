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
 * CoAssist APA with the pharmacy the prescriber picked on the eRx. The pharmacy benefit covers it (`pharmacy_covered`),
 * the prescriber completes the PA form, the patient schedules the delivery after the approval, and the agent dispatches
 * to the pharmacy from the eRx in the CRM. The last card is tracking, so the end state is the Rx delivered.
 */

const PHARMACY = { name: "Test Specialty Pharmacy", address: "1 Main St", city: "Orlando", state: "FL", zip: "32801", phone: "(800) 555-0100" };

function start(flowType = "CoA_APA_Specialty", choices: Record<string, string> = { bi: "pharmacy_covered", pa: "approved" }) {
  const clock = new SimulatedClock();
  const actor = createActor(coassistMachine, { input: { flowType, choices }, clock } as any);
  actor.start();
  const data = () => (actor.getSnapshot().context as MachineContext).workflowData;
  const accepts = (e: { type: string; [k: string]: unknown }) => actor.getSnapshot().can(e as any);
  const send = (...events: { type: string; [k: string]: unknown }[]) => events.forEach((e) => actor.send(e as any));
  const route = () => routeFor(COASSIST_SCREENS, data());
  return { actor, clock, data, accepts, send, route };
}

const ENROLL = [{ type: "REFERRAL_RECEIVED", pharmacy: PHARMACY }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];
const FORM = [{ type: "OPEN_PA_FORM_LINK" }, { type: "VERIFY_PRESCRIBER", npi: "1234567890", pin: "4321" }, { type: "SUBMIT_PA_FORM" }];
const PA_TEXT = [{ type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }];

describe("the APA demo with the prescriber's pharmacy", () => {
  it("has a valid recipe, and its pinned BI exit is pharmacy coverage", () => {
    const forks = forksForScenario(COASSIST_FORKS, "CoA_APA_Specialty");
    expect(recipeProblems(COA_APA_SPECIALTY.recipe!, forks)).toEqual([]);
    expect(COA_APA_SPECIALTY.recipe!.choices).toEqual({ bi: "pharmacy_covered", pa: "approved" });
  });

  it("keeps the pharmacy from the eRx, and reaches delivered with the form, the schedule, and the dispatch in order", () => {
    const t = start();
    t.send(...ENROLL);
    expect(t.data().selectedPharmacy).toEqual(PHARMACY);
    t.send({ type: "COMPLETE_BI" });
    expect(t.data()).toMatchObject({ paRequired: true, pharmacyAssigned: false, paFormStatus: "sent", paStatus: "none" });
    t.send(...FORM);
    expect(t.data().paStatus).toBe("submitted");
    t.send({ type: "APPROVE_PA" }, ...PA_TEXT);
    expect(t.data()).toMatchObject({ paStatus: "approved", paApprovedOtpVerified: true, dispatchStatus: "pending_selection", selectedPharmacy: PHARMACY });
    expect(t.route()).toBe("/pa-approved");
    t.send({ type: "PATIENT_SETS_ADDRESS" });
    expect(t.route()).toBe("/delivery-date");
    t.send({ type: "PATIENT_SELECTS_SHIP_DATE" });
    expect(t.route()).toBe("/enrollment-complete");
    t.send({ type: "FILL_RX" });
    expect(t.data()).toMatchObject({ pharmacyStatus: "processing", dispatchStatus: "dispatched", selectedPharmacy: PHARMACY });
    t.send({ type: "READY_RX" }, { type: "SHIP_RX" });
    expect(t.route()).toBe("/order-shipped");
    t.send({ type: "DELIVER_RX" });
    expect(t.data().pharmacyStatus).toBe("delivered");
    expect(t.route()).toBe("/medication-delivered");
  });

  it("falls back to the scenario's pharmacy when the eRx named none", () => {
    const t = start();
    t.send({ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }, ...FORM, { type: "APPROVE_PA" }, ...PA_TEXT);
    expect(t.data().selectedPharmacy).toEqual(COA_APA_SPECIALTY.content.transferPharmacy);
  });

  it("keeps each step behind the one before it (preconditions)", () => {
    const t = start();
    t.send(...ENROLL, { type: "COMPLETE_BI" }, ...FORM, { type: "APPROVE_PA" });
    // The patient has not verified the approval yet, so nothing schedules and nothing dispatches.
    for (const type of ["PATIENT_SETS_ADDRESS", "PATIENT_SELECTS_SHIP_DATE", "FILL_RX"]) expect(t.accepts({ type }), type).toBe(false);
    t.send(...PA_TEXT);
    expect(t.accepts({ type: "PATIENT_SELECTS_SHIP_DATE" })).toBe(false);
    expect(t.accepts({ type: "FILL_RX" })).toBe(false);
    t.send({ type: "PATIENT_SETS_ADDRESS" });
    // The agent waits for the date the patient picked.
    expect(t.accepts({ type: "FILL_RX" })).toBe(false);
    t.send({ type: "PATIENT_SELECTS_SHIP_DATE" });
    expect(t.accepts({ type: "FILL_RX" })).toBe(true);
  });

  it("the CRM triage stage opens with the eRx pharmacy filled in, and the agent dispatches it", () => {
    const t = start();
    const build = STAGE_BUILDERS["TP-14277"].prescriber;
    expect(build(t.data())).toMatchObject({ statusDetail: "Awaiting PA approval", isNotStarted: true });
    t.send(...ENROLL, { type: "COMPLETE_BI" }, ...FORM, { type: "APPROVE_PA" });
    // Approved, but the patient has not confirmed it yet.
    expect(build(t.data())).toMatchObject({ statusDetail: "PA approved — awaiting the patient's confirmation", isNotStarted: true });
    t.send(...PA_TEXT);
    expect(build(t.data())).toMatchObject({ isNotStarted: false, fields: [{ label: "Pharmacy", value: PHARMACY.name }, expect.anything()] });
    t.send({ type: "PATIENT_SETS_ADDRESS" });
    expect(build(t.data()).statusDetail).toMatch(/delivery date/);
    t.send({ type: "PATIENT_SELECTS_SHIP_DATE" });
    expect(build(t.data()).statusDetail).toMatch(/ready to dispatch/);
    t.send({ type: "FILL_RX" });
    expect(build(t.data())).toMatchObject({ statusDetail: "First dispense processing" });
  });

  it("is ignored by a recipe whose pharmacy does not come from the prescriber", () => {
    const t = start("CoA_DTP", { bi: "pharmacy_covered", pa: "approved" });
    t.send(...ENROLL);
    expect(t.data().selectedPharmacy).toBeNull();
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
