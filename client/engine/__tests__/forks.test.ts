import { describe, it, expect } from "vitest";
import { SimulatedClock, ctx, startFlow } from "./harness";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { ALL_FORKS } from "@/workflows/forks";
import { choiceProblems, exitFor, forksForScenario, pickedExit } from "@/engine/workflow/forks";
import { biForkFor } from "@/workflows/coassist/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";

/**
 * Forks: a point where a scenario has a default branch and named alternatives.
 * The pick lives in workflowData.choices. See REFACTOR_AUDIT.md, "Journeys, forks, and demos".
 */
const IDENTITY = ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"];

const data = (actor: ReturnType<typeof startFlow>) => ctx(actor).workflowData as any;
const enrollThroughBiRunning = (actor: ReturnType<typeof startFlow>) => {
  for (const type of IDENTITY) actor.send({ type } as any);
};

describe("DME pharmacy transfer branch", () => {
  const start = () => {
    const actor = startFlow("CoA_DME", { choices: { bi: "pharmacy_transfer" } });
    enrollThroughBiRunning(actor);
    return actor;
  };

  it("submits the PA on its own and assigns the pharmacy after the approval OTP", () => {
    const actor = start();
    actor.send({ type: "COMPLETE_BI" } as any);
    expect(data(actor)).toMatchObject({ pharmacyBenefitStatus: "covered", pharmacyAssigned: true, paStatus: "submitted" });
    actor.send({ type: "APPROVE_PA" } as any);
    actor.send({ type: "VERIFY_PA_APPROVED_SMS" } as any);
    expect(data(actor).selectedPharmacy).toBeNull();
    actor.send({ type: "VERIFY_PA_APPROVED_OTP" } as any);
    expect(data(actor).selectedPharmacy?.name).toBeTruthy();
    expect(derivePatientRoute(ctx(actor) as any)).toBe("/pharmacy-transfer");
  });

  it("ignores a patient pharmacy pick once one is assigned", () => {
    const actor = start();
    for (const type of ["COMPLETE_BI", "APPROVE_PA", "VERIFY_PA_APPROVED_SMS", "VERIFY_PA_APPROVED_OTP"]) {
      actor.send({ type } as any);
    }
    const assigned = data(actor).selectedPharmacy;
    actor.send({ type: "SELECT_PHARMACY", pharmacy: { name: "Other Pharmacy" } } as any);
    expect(data(actor).selectedPharmacy).toEqual(assigned);
  });

  it("leaves the default branch with a patient choice", () => {
    const actor = startFlow("CoA_DME");
    enrollThroughBiRunning(actor);
    actor.send({ type: "COMPLETE_BI" } as any);
    expect(data(actor).pharmacyAssigned).toBe(false);
  });
});

describe("DME benefits investigation fork", () => {
  it("starts on the story's default branch", () => {
    const actor = startFlow("CoA_DME");
    expect(data(actor).choices).toEqual({ bi: "pharmacy_covered", pa: "approved" });
    enrollThroughBiRunning(actor);
    expect(data(actor).biStatus).toBe("running");
    actor.send({ type: "COMPLETE_BI" } as any);
    expect(data(actor)).toMatchObject({
      pharmacyBenefitStatus: "covered",
      medicalBenefitStatus: "not_covered",
      paStatus: "submitted",
    });
  });

  it("takes the branch a demo starts with", () => {
    const actor = startFlow("CoA_DME", { choices: { bi: "no_coverage" } });
    enrollThroughBiRunning(actor);
    actor.send({ type: "COMPLETE_BI" } as any);
    expect(data(actor)).toMatchObject({
      pharmacyBenefitStatus: "not_covered",
      medicalBenefitStatus: "not_covered",
      cashOfferSmsSent: true,
      paStatus: "none",
    });
  });

  it("lets CHOOSE pick until the fork resolves, then ignores CHOOSE", () => {
    const actor = startFlow("CoA_DME");
    enrollThroughBiRunning(actor);
    actor.send({ type: "CHOOSE", fork: "bi", exit: "medical_covered" } as any);
    expect(data(actor).choices.bi).toBe("medical_covered");
    actor.send({ type: "COMPLETE_BI" } as any);
    expect(data(actor)).toMatchObject({ medicalBenefitStatus: "covered", paStatus: "none" });

    actor.send({ type: "CHOOSE", fork: "bi", exit: "no_coverage" } as any);
    expect(data(actor).choices.bi).toBe("medical_covered");
  });

  it("ignores a choice that names no real fork or exit", () => {
    const actor = startFlow("CoA_DME");
    actor.send({ type: "CHOOSE", fork: "bi", exit: "nonsense" } as any);
    actor.send({ type: "CHOOSE", fork: "nope", exit: "pharmacy_covered" } as any);
    expect(data(actor).choices).toEqual({ bi: "pharmacy_covered", pa: "approved" });
  });

  it("keeps the choice through RESET, and RESET can change it", () => {
    const actor = startFlow("CoA_DME", { choices: { bi: "medical_covered" } });
    enrollThroughBiRunning(actor);
    actor.send({ type: "RESET" } as any);
    expect(data(actor).choices.bi).toBe("medical_covered");
    expect(data(actor).biStatus).toBe("none");

    actor.send({ type: "RESET", choices: { bi: "no_coverage", bogus: "x" } } as any);
    expect(data(actor).choices).toEqual({ bi: "no_coverage", pa: "approved" });
  });

  it("lets an event that carries the statuses force an outcome (ladders and golden paths)", () => {
    const actor = startFlow("CoA_DME", { choices: { bi: "no_coverage" } });
    enrollThroughBiRunning(actor);
    actor.send({ type: "COMPLETE_BI", pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" } as any);
    expect(data(actor)).toMatchObject({ pharmacyBenefitStatus: "covered", paStatus: "submitted" });
  });
});

describe("forks on other flows", () => {
  it("leaves flows without forks alone", () => {
    const actor = startFlow("Fax_QS_PA_Approved");
    expect(data(actor).choices).toEqual({});
    actor.send({ type: "CHOOSE", fork: "bi", exit: "no_coverage" } as any);
    expect(data(actor).choices).toEqual({});
  });
});

describe("BI and PA forks on DTP and Copay", () => {
  const PA_FLOWS = ["CoA_DTP", "CoA_Copay"] as const;
  const REVEAL_MS = 3000;

  for (const flow of PA_FLOWS) {
    it(`${flow}: starts on coverage found and an approved PA`, () => {
      expect(data(startFlow(flow)).choices).toEqual({ bi: "pharmacy_covered", pa: "approved" });
    });

    it(`${flow}: a BI with no result takes the exit the fork picked`, () => {
      const covered = startFlow(flow);
      enrollThroughBiRunning(covered);
      covered.send({ type: "COMPLETE_BI" } as any);
      expect(data(covered)).toMatchObject({ biResult: "coverage_found", paStatus: "submitted" });

      const none = startFlow(flow, { choices: { bi: "no_coverage" } });
      enrollThroughBiRunning(none);
      none.send({ type: "COMPLETE_BI" } as any);
      expect(data(none)).toMatchObject({ biResult: "no_coverage", paStatus: "none" });
    });

    it(`${flow}: an event that carries the statuses still wins over the fork`, () => {
      const actor = startFlow(flow);
      enrollThroughBiRunning(actor);
      actor.send({ type: "COMPLETE_BI", pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" } as any);
      expect(data(actor)).toMatchObject({ biResult: "no_coverage", paStatus: "none" });
    });

    it(`${flow}: the pa fork decides what opening the PA stage does`, () => {
      for (const [exit, status] of [["approved", "approved"], ["denied", "denied"]] as const) {
        const clock = new SimulatedClock();
        const actor = startFlow(flow, { clock, choices: { pa: exit } });
        enrollThroughBiRunning(actor);
        actor.send({ type: "COMPLETE_BI" } as any);
        actor.send({ type: "VIEW_STAGE", stage: "PA" } as any);
        clock.increment(REVEAL_MS);
        expect(data(actor).paStatus).toBe(status);
      }
    });
  }

  it("CoA_DME: the pa fork is declared and pinned to approved", () => {
    const clock = new SimulatedClock();
    const actor = startFlow("CoA_DME", { clock });
    expect(data(actor).choices.pa).toBe("approved");
    enrollThroughBiRunning(actor);
    actor.send({ type: "COMPLETE_BI" } as any);
    actor.send({ type: "VIEW_STAGE", stage: "PA" } as any);
    clock.increment(REVEAL_MS);
    expect(data(actor).paStatus).toBe("approved");
  });
});

describe("patient-chosen pricing forks on DTP and Copay", () => {
  const forkOf = (flow: "CoA_DTP" | "CoA_Copay", id: string) => forksForScenario(ALL_FORKS, flow).find((f) => f.id === id)!;
  const reachPricing = (actor: ReturnType<typeof startFlow>) => {
    enrollThroughBiRunning(actor);
    for (const type of ["COMPLETE_BI", "APPROVE_PA", "VERIFY_PA_APPROVED_SMS", "VERIFY_PA_APPROVED_OTP"]) actor.send({ type } as any);
  };
  const pick = (flow: "CoA_DTP" | "CoA_Copay", id: string, actor: ReturnType<typeof startFlow>) => pickedExit(forkOf(flow, id), data(actor))?.id;

  it("DTP: reads the patient's pick from the data, and not before they pick", () => {
    const actor = startFlow("CoA_DTP");
    reachPricing(actor);
    expect(pick("CoA_DTP", "pricing", actor)).toBeUndefined();

    actor.send({ type: "SELECT_PRICING_OPTION", option: "mail_order" } as any);
    expect(pick("CoA_DTP", "pricing", actor)).toBe("mail_order");
    expect(data(actor)).toMatchObject({ pricingOption: "mail_order", selectedPharmacy: { name: "FutureScripts Home Delivery" } });
  });

  it("DTP: self-pay is the self_pay exit and names CoAssist's own pharmacy", () => {
    const actor = startFlow("CoA_DTP");
    reachPricing(actor);
    actor.send({ type: "SELECT_SELF_PAY" } as any);
    expect(pick("CoA_DTP", "pricing", actor)).toBe("self_pay");
    expect(data(actor).selectedPharmacy.name).toBe("CoAssist Pharmacy");
  });

  it("Copay: enrolling and picking are two forks", () => {
    const actor = startFlow("CoA_Copay");
    reachPricing(actor);
    expect(pick("CoA_Copay", "copay", actor)).toBeUndefined();

    actor.send({ type: "SELECT_SELF_PAY" } as any);
    expect(pick("CoA_Copay", "copay", actor)).toBe("enroll");
    expect(pick("CoA_Copay", "pricing", actor)).toBeUndefined();
    expect(data(actor).pricingOption).toBeNull();

    actor.send({ type: "SELECT_PRICING_OPTION", option: "mail_order" } as any);
    expect(pick("CoA_Copay", "pricing", actor)).toBe("mail_order");
    expect(pick("CoA_Copay", "copay", actor)).toBe("enroll");
  });

  it("Copay: picking Retail without enrolling is the decline exit", () => {
    const actor = startFlow("CoA_Copay");
    reachPricing(actor);
    actor.send({ type: "SELECT_PRICING_OPTION", option: "retail" } as any);
    expect(pick("CoA_Copay", "copay", actor)).toBe("decline");
    expect(pick("CoA_Copay", "pricing", actor)).toBe("retail");
  });

  it("ignores an option that is not an exit of the scenario's pricing fork", () => {
    for (const [flow, option] of [["CoA_DTP", "nonsense"], ["CoA_Copay", "self_pay"], ["CoA_Copay", "nonsense"]] as const) {
      const actor = startFlow(flow);
      reachPricing(actor);
      expect(actor.getSnapshot().can({ type: "SELECT_PRICING_OPTION", option } as any), `${flow} ${option}`).toBe(false);
    }
  });

  it("does not write a patient's pick to choices, so a reset cannot carry it into the next run", () => {
    const actor = startFlow("CoA_DTP");
    reachPricing(actor);
    actor.send({ type: "SELECT_PRICING_OPTION", option: "retail" } as any);
    expect(data(actor).choices).toEqual({ bi: "pharmacy_covered", pa: "approved" });

    actor.send({ type: "RESET" } as any);
    expect(data(actor).choices).toEqual({ bi: "pharmacy_covered", pa: "approved" });
    expect(data(actor).pricingOption).toBeNull();
  });

  it("gives DME no pricing fork", () => {
    expect(forksForScenario(ALL_FORKS, "CoA_DME").some((f) => f.id === "pricing")).toBe(false);
  });
});

/**
 * Pinned patient picks. A recipe or a demo puts `copay` or `pricing` in `choices`. The pick applies when the
 * PA approval is verified, so the patient skips the menu. With no pin, the menu shows as before.
 */
describe("pinned patient picks", () => {
  const route = (actor: ReturnType<typeof startFlow>) => derivePatientRoute(ctx(actor) as any);
  const startPinned = (flow: "CoA_DTP" | "CoA_Copay", choices?: Record<string, string>) => {
    const actor = startFlow(flow, choices ? { choices } : {});
    enrollThroughBiRunning(actor);
    for (const type of ["COMPLETE_BI", "APPROVE_PA", "VERIFY_PA_APPROVED_SMS", "VERIFY_PA_APPROVED_OTP"]) actor.send({ type } as any);
    return actor;
  };

  it("shows the menu when nothing is pinned", () => {
    for (const flow of ["CoA_DTP", "CoA_Copay"] as const) {
      const actor = startPinned(flow);
      expect(data(actor).pricingOption).toBeNull();
      expect(route(actor)).toBe("/benefit-pricing");
    }
  });

  it("DTP: a pinned mail order skips the menu and names the mail-order pharmacy", () => {
    const actor = startPinned("CoA_DTP", { pricing: "mail_order" });
    expect(data(actor)).toMatchObject({ pricingOption: "mail_order", selectedPharmacy: { name: "FutureScripts Home Delivery" } });
    expect(route(actor)).toBe("/delivery-address");
    expect(actor.getSnapshot().can({ type: "SELECT_PRICING_OPTION", option: "retail" } as any)).toBe(false);
  });

  it("DTP: a pinned self-pay lands on the offer, and accepting it picks self-pay", () => {
    const actor = startPinned("CoA_DTP", { pricing: "self_pay" });
    // The pin pre-selects the exit. The patient still accepts the offer, so nothing is applied yet.
    expect(data(actor).pricingOption).toBeNull();
    expect(route(actor)).toBe("/copay-enroll");

    actor.send({ type: "SELECT_SELF_PAY" } as any);
    expect(data(actor)).toMatchObject({ pricingOption: "self_pay", selectedPharmacy: { name: "CoAssist Pharmacy" } });
    expect(route(actor)).toBe("/delivery-address");
  });

  it("DTP: a pinned self-pay lands on the offer when the PA was approved before the patient consented", () => {
    const actor = startFlow("CoA_DTP", { choices: { pricing: "self_pay" } });
    for (const type of ["REFERRAL_RECEIVED", "COMPLETE_BI", "APPROVE_PA", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"]) {
      actor.send({ type } as any);
    }
    expect(data(actor).pricingOption).toBeNull();
    expect(route(actor)).toBe("/copay-enroll");
  });

  it("DTP: applies when the PA was approved before the patient consented", () => {
    const actor = startFlow("CoA_DTP", { choices: { pricing: "retail" } });
    for (const type of ["REFERRAL_RECEIVED", "COMPLETE_BI", "APPROVE_PA", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"]) {
      actor.send({ type } as any);
    }
    expect(data(actor).pricingOption).toBe("retail");
    expect(route(actor)).toBe("/delivery-address");
  });

  it("Copay: pinning enroll alone enrolls the patient and leaves the Retail or Mail Order pick", () => {
    const actor = startPinned("CoA_Copay", { copay: "enroll" });
    expect(data(actor)).toMatchObject({ copayEnrolled: true, pricingOption: null });
    expect(route(actor)).toBe("/benefit-pricing");
  });

  it("Copay: enroll plus mail order goes straight to the delivery address", () => {
    const actor = startPinned("CoA_Copay", { copay: "enroll", pricing: "mail_order" });
    expect(data(actor)).toMatchObject({ copayEnrolled: true, pricingOption: "mail_order" });
    expect(route(actor)).toBe("/delivery-address");
    expect(pickedExit(forksForScenario(ALL_FORKS, "CoA_Copay").find((f) => f.id === "copay")!, data(actor))?.id).toBe("enroll");
  });

  it("Copay: a pinned Retail uses the default retail pharmacy and ends at the tracker", () => {
    const actor = startPinned("CoA_Copay", { pricing: "retail" });
    expect(data(actor)).toMatchObject({ pricingOption: "retail", selectedPharmacy: { name: "CVS Pharmacy #3795" } });
    expect(route(actor)).toBe("/order-tracker");
  });

  it("keeps the pin through RESET, and applies it again on the replay", () => {
    const actor = startPinned("CoA_DTP", { pricing: "mail_order" });
    actor.send({ type: "RESET" } as any);
    expect(data(actor).choices.pricing).toBe("mail_order");
    expect(data(actor).pricingOption).toBeNull();

    enrollThroughBiRunning(actor);
    for (const type of ["COMPLETE_BI", "APPROVE_PA", "VERIFY_PA_APPROVED_SMS", "VERIFY_PA_APPROVED_OTP"]) actor.send({ type } as any);
    expect(data(actor).pricingOption).toBe("mail_order");
  });

  it("drops a pin that names no exit of the scenario's fork", () => {
    expect(data(startFlow("CoA_Copay", { choices: { pricing: "self_pay" } })).choices.pricing).toBeUndefined();
    expect(data(startFlow("CoA_DME", { choices: { pricing: "retail", copay: "enroll" } })).choices).toEqual({ bi: "pharmacy_covered", pa: "approved" });
  });

  it("lets a brand demo pin the picks through its choices", () => {
    expect(choiceProblems(ALL_FORKS, "CoA_DTP", { pricing: "retail" })).toEqual([]);
    expect(choiceProblems(ALL_FORKS, "CoA_Copay", { copay: "enroll", pricing: "mail_order" })).toEqual([]);
    expect(choiceProblems(ALL_FORKS, "CoA_Copay", { pricing: "self_pay" })).toHaveLength(1);
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { pricing: "retail" })).toHaveLength(1);
  });
});

describe("fork declarations", () => {
  it("say how to read the pick for every patient-chosen fork", () => {
    for (const fork of ALL_FORKS.filter((f) => f.chooser === "patient")) {
      expect(typeof fork.picked, fork.id).toBe("function");
    }
  });

  it("resolve a choice to an exit, and fall back to the first exit", () => {
    expect(exitFor(biForkFor("CoA_DME"), { choices: { bi: "no_coverage" } }).id).toBe("no_coverage");
    expect(exitFor(biForkFor("CoA_DME"), { choices: {} }).id).toBe("pharmacy_covered");
    expect(exitFor(biForkFor("CoA_DME"), {} as any).id).toBe("pharmacy_covered");
  });

  it("report choices that name no real fork or exit", () => {
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { bi: "no_coverage" })).toEqual([]);
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { bi: "nonsense" })).toHaveLength(1);
    // Every CoAssist scenario shares one BI fork. The old exit ids are gone.
    expect(choiceProblems(ALL_FORKS, "CoA_DTP", { bi: "no_coverage" })).toEqual([]);
    expect(choiceProblems(ALL_FORKS, "CoA_DTP", { bi: "pharmacy_covered" })).toEqual([]);
    expect(choiceProblems(ALL_FORKS, "CoA_DTP", { bi: "coverage_found" })).toHaveLength(1);
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { bi: "coverage_found" })).toHaveLength(1);
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { bi: "covered_by_both" })).toHaveLength(1);
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { pa: "denied" })).toEqual([]);
    expect(choiceProblems(ALL_FORKS, "Fax_QS_PA_Approved", { bi: "no_coverage" })).toHaveLength(1);
  });

  it("have a default that names a real exit, for every scenario", () => {
    for (const scenario of ALL_SCENARIOS) {
      expect(choiceProblems(ALL_FORKS, scenario.flowType, scenario.choices)).toEqual([]);
    }
  });
});
