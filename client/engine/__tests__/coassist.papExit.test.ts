import { describe, it, expect } from "vitest";
import type { FlowType } from "@/engine/types";
import { ctx, startFlow } from "./harness";
import { recipeProblems } from "@/engine/workflow/recipe";
import { forksForScenario } from "@/engine/workflow/forks";
import { BI_FORK, COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COA_COVERAGE_RECIPE, COA_DTP_RECIPE } from "@/workflows/coassist/recipes";
import { COA_DTP } from "@/workflows/coassist/scenarios";
import { assignsWithoutPa } from "@/workflows/shared/bi";

/**
 * The `no_coverage_pap` exit (docs/plans/PLAN_COA_PAP.md, step 2): neither benefit covers it, no PA, no cash offer, and
 * the Rx goes to an assigned pharmacy through the free drug program. Only `CoA_PAP` picks it. These tests pin the
 * catalog entry, the BI result, and the spine behavior it changes, on the other scenarios too.
 */
const IDENTITY = ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"];
const data = (actor: ReturnType<typeof startFlow>) => ctx(actor).workflowData as any;
const completeBi = (choices: Record<string, string>, flow: FlowType = "CoA_DTP") => {
  const actor = startFlow(flow, { choices });
  for (const type of IDENTITY) actor.send({ type } as any);
  actor.send({ type: "COMPLETE_BI" } as any);
  return actor;
};

describe("no_coverage_pap exit", () => {
  it("is declared on the CoAssist bi fork and names the modules its branch needs", () => {
    const exit = BI_FORK.exits.find((e) => e.id === "no_coverage_pap");
    expect(exit?.requires).toEqual(["pap_transfer", "income_qualification", "pharmacy_selection:assigned"]);
    expect(exit?.data).toMatchObject({ pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered", paRequired: false, pharmacyAssigned: true });
  });

  it("cannot be picked by a recipe that lacks its modules", () => {
    for (const [flow, recipe] of [["CoA_DTP", COA_DTP_RECIPE], ["CoA_Coverage", COA_COVERAGE_RECIPE]] as const) {
      const forks = forksForScenario(COASSIST_FORKS, flow);
      const problems = recipeProblems({ ...recipe, choices: { ...recipe.choices, bi: "no_coverage_pap" } }, forks);
      for (const m of ["pap_transfer", "income_qualification", "pharmacy_selection:assigned"]) {
        expect(problems).toContain(`fork "bi" exit "no_coverage_pap" requires ${m} in the recipe`);
      }
    }
  });

  it("reports no coverage, runs no PA, assigns the pharmacy, and sends no cash offer", () => {
    const actor = completeBi({ bi: "no_coverage_pap" });
    expect(data(actor)).toMatchObject({
      biStatus: "complete",
      biResult: "no_coverage",
      paRequired: false,
      paStatus: "none",
      pharmacyAssigned: true,
      cashOfferSmsSent: false,
    });
    actor.stop();
  });

  it("hands the Rx to the scenario's assigned pharmacy as soon as BI completes, only on the free drug program exit", () => {
    const pap = completeBi({ bi: "no_coverage_pap" });
    expect(data(pap).selectedPharmacy).toEqual(COA_DTP.content.transferPharmacy);
    expect(data(pap).dispatchStatus).toBe("none");
    pap.stop();
    const transfer = completeBi({ bi: "pharmacy_transfer" }, "CoA_Coverage");
    expect(data(transfer).selectedPharmacy).toBeNull();
    transfer.stop();
  });

  it("leaves the cash offer alone on the plain no_coverage exit", () => {
    const actor = completeBi({ bi: "no_coverage" });
    expect(data(actor)).toMatchObject({ biResult: "no_coverage", paStatus: "none", pharmacyAssigned: false, cashOfferSmsSent: true });
    actor.stop();
  });

  it("keeps a PA-backed assigned pharmacy exactly as before", () => {
    const actor = completeBi({ bi: "pharmacy_transfer" }, "CoA_Coverage");
    expect(data(actor)).toMatchObject({ pharmacyAssigned: true, paStatus: "submitted", cashOfferSmsSent: false });
    actor.stop();
  });

  it("assignsWithoutPa is true only for the free drug program exit", () => {
    const flag = (bi: string) => assignsWithoutPa(BI_FORK, { choices: { bi } } as any);
    expect(COASSIST_FORKS.find((f) => f.id === "bi")!.exits.filter((e) => flag(e.id)).map((e) => e.id)).toEqual(["no_coverage_pap"]);
  });
});
