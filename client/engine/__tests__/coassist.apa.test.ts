import { describe, it, expect } from "vitest";
import { createActor, SimulatedClock } from "xstate";
import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import type { MachineContext } from "@/engine/types";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
import { COA_COPAY, COA_COVERAGE, COA_DTP, COA_MEDICAL_TRANSFER, COA_PAP, COA_WEB_COPAY, COA_APA_SPECIALTY } from "@/workflows/coassist/scenarios";
import { getGeneratedEmails } from "@/engine/WorkflowEngine";
import { STAGE_BUILDERS } from "@/portals/crm/stages/builders";
import { PA_FORM_SKIP_MS, providerFormStep, type PaVariant } from "@/workflows/shared/apa";

/**
 * The `prior_authorization` block in CoAssist. `auto` is the PA that submits on its own (the demo today). `apa` emails
 * the prescriber a form: they open the link, verify by NPI, and submit, which starts the PA. `apa_skip` sends the email
 * and then submits for the prescriber. The PA precondition is the same for all three, and the `pa` fork still decides.
 */
const withVariant = (variant: PaVariant) => ({
  ...COA_DTP,
  recipe: { ...COA_DTP.recipe!, modules: COA_DTP.recipe!.modules.map((m) => (m.id === "prior_authorization" ? { ...m, props: { variant } } : m)) },
});

const machineFor = (variant: PaVariant) =>
  createWorkflowMachine({
    id: `coassist-pa-${variant}`,
    defaultFlowType: "CoA_DTP",
    rules: COASSIST_RULES,
    forks: COASSIST_FORKS,
    scenarios: { CoA_DTP: withVariant(variant), CoA_Copay: COA_COPAY, CoA_Coverage: COA_COVERAGE, CoA_PAP: COA_PAP, CoA_Web_Copay: COA_WEB_COPAY, CoA_Medical_Transfer: COA_MEDICAL_TRANSFER, CoA_APA_Specialty: COA_APA_SPECIALTY },
  });

function start(variant: PaVariant) {
  const clock = new SimulatedClock();
  const actor = createActor(machineFor(variant), { input: { flowType: "CoA_DTP" }, clock } as any);
  actor.start();
  const data = () => (actor.getSnapshot().context as MachineContext).workflowData;
  const accepts = (e: { type: string; [k: string]: unknown }) => actor.getSnapshot().can(e as any);
  const send = (...events: { type: string; [k: string]: unknown }[]) => events.forEach((e) => actor.send(e as any));
  /** The patient enrolls and BI returns. */
  const throughBi = () => send({ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" });
  return { actor, clock, data, accepts, send, throughBi };
}

const GOOD = { type: "VERIFY_PRESCRIBER", npi: "1234567890", pin: "4321" };
const FORM_EVENTS = ["SEND_PA_FORM", "OPEN_PA_FORM_LINK", "VERIFY_PRESCRIBER", "SUBMIT_PA_FORM"];

describe("the prior_authorization recipes are valid", () => {
  for (const variant of ["auto", "apa", "apa_skip"] as const) {
    it(`${variant}`, () => {
      expect(recipeProblems(withVariant(variant).recipe, forksForScenario(COASSIST_FORKS, "CoA_DTP"))).toEqual([]);
    });
  }
});

describe("auto (AutoPA)", () => {
  it("submits the PA the moment BI says one is required, and sends no form", () => {
    const t = start("auto");
    t.throughBi();
    expect(t.data()).toMatchObject({ biStatus: "complete", paRequired: true, paStatus: "submitted", paFormStatus: "none" });
    expect(providerFormStep(t.data())).toBeUndefined();
  });

  it("rejects every form event", () => {
    const t = start("auto");
    t.throughBi();
    expect(FORM_EVENTS.filter((type) => t.accepts({ type, npi: "1234567890", pin: "1" }))).toEqual([]);
  });
});

describe("apa (the prescriber completes the form)", () => {
  it("sends the form, not the PA, when BI says a PA is required", () => {
    const t = start("apa");
    t.throughBi();
    expect(t.data()).toMatchObject({ paStatus: "none", paFormStatus: "sent" });
    expect(t.data().paFormSentAt).not.toBeNull();
    expect(providerFormStep(t.data())).toBe("email");
    t.clock.increment(PA_FORM_SKIP_MS * 10);
    expect(t.data().paStatus).toBe("none"); // nothing submits on its own
  });

  it("walks the prescriber through the link, the NPI check, and the form, then starts the PA", () => {
    const t = start("apa");
    t.throughBi();
    t.send({ type: "OPEN_PA_FORM_LINK" });
    expect(providerFormStep(t.data())).toBe("login");
    t.send(GOOD);
    expect(t.data()).toMatchObject({ prescriberVerified: true, prescriberNpi: "1234567890", paFormStatus: "verified" });
    expect(providerFormStep(t.data())).toBe("form");
    t.send({ type: "SUBMIT_PA_FORM" });
    expect(t.data()).toMatchObject({ paFormStatus: "submitted", paStatus: "submitted" });
    expect(providerFormStep(t.data())).toBeUndefined();
  });

  it("keeps each step behind the one before it", () => {
    const t = start("apa");
    expect(FORM_EVENTS.filter((type) => t.accepts({ type, npi: "1234567890", pin: "1" }))).toEqual([]); // nothing before BI
    t.throughBi();
    expect(t.accepts({ type: "VERIFY_PRESCRIBER", npi: "1234567890", pin: "1" })).toBe(false); // link not opened
    expect(t.accepts({ type: "SUBMIT_PA_FORM" })).toBe(false);
    expect(t.accepts({ type: "SUBMIT_PA" })).toBe(true); // the PA precondition itself is unchanged
    t.send({ type: "OPEN_PA_FORM_LINK" });
    expect(t.accepts({ type: "SUBMIT_PA_FORM" })).toBe(false); // not verified
    expect(t.accepts({ type: "OPEN_PA_FORM_LINK" })).toBe(false); // once
  });

  it("rejects a bad NPI or an empty PIN, so the gate stays closed", () => {
    const t = start("apa");
    t.throughBi();
    t.send({ type: "OPEN_PA_FORM_LINK" });
    for (const bad of [{ npi: "123" }, { npi: "12345678ab" }, { npi: undefined }, { pin: "" }, { pin: "  " }]) {
      expect(t.accepts({ ...GOOD, ...bad })).toBe(false);
    }
    t.send({ ...GOOD, npi: "0000000000" }); // a ten-digit NPI is accepted when the case holds none
    expect(t.data().prescriberVerified).toBe(true);
  });

  it("then decides the PA the way auto does: the agent opens the PA stage", () => {
    const t = start("apa");
    t.throughBi();
    t.send({ type: "OPEN_PA_FORM_LINK" }, GOOD, { type: "SUBMIT_PA_FORM" }, { type: "VIEW_STAGE", stage: "PA" });
    t.clock.increment(3000);
    expect(t.data().paStatus).toBe("approved");
  });
});

describe("apa_skip (the demo override)", () => {
  it("sends the form, then submits for the prescriber after a delay, with no Provider app visit", () => {
    const t = start("apa_skip");
    t.throughBi();
    expect(t.data()).toMatchObject({ paStatus: "none", paFormStatus: "sent" });
    t.clock.increment(PA_FORM_SKIP_MS - 1);
    expect(t.data().paStatus).toBe("none");
    t.clock.increment(1);
    expect(t.data().paStatus).toBe("submitted");
    expect(t.data().prescriberVerified).toBe(false);
  });

  it("does not let the prescriber steps run", () => {
    const t = start("apa_skip");
    t.throughBi();
    expect(["OPEN_PA_FORM_LINK", "VERIFY_PRESCRIBER", "SUBMIT_PA_FORM"].filter((type) => t.accepts({ type, npi: "1234567890", pin: "1" }))).toEqual([]);
  });
});

describe("BI that needs no PA", () => {
  it("sends no form, whatever the variant", () => {
    for (const variant of ["apa", "apa_skip"] as const) {
      const t = start(variant);
      t.send({ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI", pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" });
      expect(t.data()).toMatchObject({ paRequired: false, paFormStatus: "none", paStatus: "none" });
    }
  });
});

describe("what the CRM and Field show", () => {
  it("draws the PA stage from the form status until the PA is submitted", () => {
    const t = start("apa");
    const stage = () => STAGE_BUILDERS["PA-14274"].coa(t.data());
    expect(stage().statusLabel).toBe("Stage not started");
    t.throughBi();
    expect(stage()).toMatchObject({ statusLabel: "Form sent", isComplete: false, isNotStarted: false });
    t.send({ type: "OPEN_PA_FORM_LINK" });
    expect(stage().statusLabel).toBe("Form opened");
    t.send(GOOD);
    expect(stage().statusLabel).toBe("Prescriber verified");
    t.send({ type: "SUBMIT_PA_FORM" });
    expect(stage().statusLabel).toBe("Submitted");
  });

  it("emails the FRM when the form goes out and when the prescriber submits it, and not for the prescriber's own steps", () => {
    const t = start("apa");
    t.throughBi();
    t.send({ type: "OPEN_PA_FORM_LINK" }, GOOD, { type: "SUBMIT_PA_FORM" });
    const log = (t.actor.getSnapshot().context as MachineContext).events;
    const emails = getGeneratedEmails({
      events: log.map((e) => ({ id: e.id, event_type: e.eventType, created_at: new Date().toISOString() })) as any,
      patientName: "Test Patient", prescriberName: "Dr. Test", frmName: "Test FRM", biResult: "coverage_found", infusionDate: null, flowType: "CoA_DTP",
    } as any);
    const subjects = emails.map((e) => e.subject);
    expect(subjects).toContain("PA Form Sent to Prescriber - Test Patient");
    expect(subjects).toContain("PA Form Completed by Prescriber - Test Patient");
    expect(emails.map((e) => e.eventType)).not.toEqual(expect.arrayContaining(["OPEN_PA_FORM_LINK"]));
    expect(emails.map((e) => e.eventType)).not.toContain("VERIFY_PRESCRIBER");
  });
});
