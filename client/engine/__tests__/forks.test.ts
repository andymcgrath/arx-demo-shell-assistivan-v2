import { describe, it, expect } from "vitest";
import { ctx, startFlow } from "./harness";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { ALL_FORKS } from "@/workflows/forks";
import { choiceProblems, exitFor } from "@/engine/workflow/forks";
import { DME_BI_FORK } from "@/workflows/coassist/forks";
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
    expect(data(actor).choices).toEqual({ bi: "pharmacy_covered" });
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

  it("lets the presenter choose until the fork resolves, then ignores CHOOSE", () => {
    const actor = startFlow("CoA_DME");
    enrollThroughBiRunning(actor);
    actor.send({ type: "CHOOSE", fork: "bi", exit: "covered_by_both" } as any);
    expect(data(actor).choices.bi).toBe("covered_by_both");
    actor.send({ type: "COMPLETE_BI" } as any);
    expect(data(actor)).toMatchObject({ medicalBenefitStatus: "covered", paStatus: "none" });

    actor.send({ type: "CHOOSE", fork: "bi", exit: "no_coverage" } as any);
    expect(data(actor).choices.bi).toBe("covered_by_both");
  });

  it("ignores a choice that names no real fork or exit", () => {
    const actor = startFlow("CoA_DME");
    actor.send({ type: "CHOOSE", fork: "bi", exit: "nonsense" } as any);
    actor.send({ type: "CHOOSE", fork: "nope", exit: "pharmacy_covered" } as any);
    expect(data(actor).choices).toEqual({ bi: "pharmacy_covered" });
  });

  it("keeps the choice through RESET, and RESET can change it", () => {
    const actor = startFlow("CoA_DME", { choices: { bi: "covered_by_both" } });
    enrollThroughBiRunning(actor);
    actor.send({ type: "RESET" } as any);
    expect(data(actor).choices.bi).toBe("covered_by_both");
    expect(data(actor).biStatus).toBe("none");

    actor.send({ type: "RESET", choices: { bi: "no_coverage", bogus: "x" } } as any);
    expect(data(actor).choices).toEqual({ bi: "no_coverage" });
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
    const actor = startFlow("CoA_DTP");
    expect(data(actor).choices).toEqual({});
    actor.send({ type: "CHOOSE", fork: "bi", exit: "no_coverage" } as any);
    expect(data(actor).choices).toEqual({});
  });
});

describe("fork declarations", () => {
  it("resolve a choice to an exit, and fall back to the first exit", () => {
    expect(exitFor(DME_BI_FORK, { choices: { bi: "no_coverage" } }).id).toBe("no_coverage");
    expect(exitFor(DME_BI_FORK, { choices: {} }).id).toBe("pharmacy_covered");
    expect(exitFor(DME_BI_FORK, {} as any).id).toBe("pharmacy_covered");
  });

  it("report choices that name no real fork or exit", () => {
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { bi: "no_coverage" })).toEqual([]);
    expect(choiceProblems(ALL_FORKS, "CoA_DME", { bi: "nonsense" })).toHaveLength(1);
    expect(choiceProblems(ALL_FORKS, "CoA_DTP", { bi: "no_coverage" })).toHaveLength(1);
  });

  it("have a default that names a real exit, for every scenario", () => {
    for (const scenario of ALL_SCENARIOS) {
      expect(choiceProblems(ALL_FORKS, scenario.flowType, scenario.choices)).toEqual([]);
    }
  });
});
