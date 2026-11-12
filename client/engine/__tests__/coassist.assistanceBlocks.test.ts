import { describe, it, expect } from "vitest";
import { createActor, SimulatedClock } from "xstate";
import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import type { ModuleSpec, ScenarioRecipe } from "@/engine/workflow/components";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
import { COA_COPAY, COA_COVERAGE, COA_DTP, COA_PAP, COA_WEB_COPAY, COA_HCP_ENROLL, COA_APA_SPECIALTY } from "@/workflows/coassist/scenarios";
import { withFrozenClock } from "./harness";

/**
 * Income qualification (PAP) and copay as independent blocks (CLAUDE.md rules 3, 4, 5, 11).
 *
 * A recipe lists the blocks it wants. Neither knows about the other, and neither needs `pap_transfer`, the `copay` fork,
 * or the `pricing` module. The recipe here is a covered-BI case (`pharmacy_transfer`) with both blocks and nothing else.
 */
const incomeModule = (props?: Record<string, unknown>): ModuleSpec => ({ id: "income_qualification", ...(props ? { props } : {}) });
const COPAY_MODULE: ModuleSpec = { id: "financial_assistance", props: { variant: "copay" } };

const recipe = (modules: ModuleSpec[]): ScenarioRecipe => ({
  source: "coassist",
  forks: ["bi"],
  choices: { bi: "pharmacy_transfer" },
  panels: ["benefits"],
  modules,
});

const GOOD_ORDER = [{ id: "enrollment" }, incomeModule({ trigger: "system" }), COPAY_MODULE, { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }] as ModuleSpec[];

// The test recipe runs on DTP's id. It declares only the `bi` fork, and the real scenarios stay registered for the scope check.
const HOST = "CoA_DTP" as const;
const forks = forksForScenario(COASSIST_FORKS, HOST);

function build(modules: ModuleSpec[]) {
  const r = recipe(modules);
  const scenario = { ...COA_DTP, choices: r.choices, recipe: r };
  const machine = createWorkflowMachine({
    id: "coassist-assistance-blocks",
    defaultFlowType: HOST,
    rules: COASSIST_RULES,
    forks: COASSIST_FORKS,
    scenarios: { CoA_DTP: scenario, CoA_Copay: COA_COPAY, CoA_Coverage: COA_COVERAGE, CoA_PAP: COA_PAP, CoA_Web_Copay: COA_WEB_COPAY, CoA_HCP_Enroll: COA_HCP_ENROLL, CoA_APA_Specialty: COA_APA_SPECIALTY },
  });
  const clock = new SimulatedClock();
  const actor = createActor(machine, { input: { flowType: HOST }, clock } as any);
  actor.start();
  const send = (type: string) => actor.send({ type } as any);
  const can = (type: string) => actor.getSnapshot().can({ type } as any);
  const data = () => (actor.getSnapshot().context as any).workflowData;
  return { actor, clock, send, can, data };
}

/** The patient is enrolled and BI is complete. */
function atBiComplete(modules: ModuleSpec[]) {
  const t = build(modules);
  for (const e of ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "COMPLETE_BI"]) t.send(e);
  return t;
}

/** The patient applies: update text sent, confirmed, then the income form verified. */
function qualify(t: ReturnType<typeof build>) {
  t.send("SEND_PAP_SMS");
  t.send("VERIFY_PAP_SMS");
  t.send("START_INCOME_QUALIFICATION");
  t.send("VERIFY_INCOME");
}

describe("assistance blocks: rule 4, declared needs and sets", () => {
  it("accepts the recipe with the blocks after enrollment", () => {
    expect(recipeProblems(recipe(GOOD_ORDER), forks)).toEqual([]);
  });

  it("rejects income_qualification before enrollment", () => {
    const wrong = [incomeModule(), { id: "enrollment" }, { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }] as ModuleSpec[];
    expect(recipeProblems(recipe(wrong), forks).join("\n")).toMatch(/income_qualification needs "consentVerified"/);
  });

  it("rejects copay before enrollment", () => {
    const wrong = [COPAY_MODULE, { id: "enrollment" }, { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }] as ModuleSpec[];
    expect(recipeProblems(recipe(wrong), forks).join("\n")).toMatch(/financial_assistance needs "consentVerified"/);
  });

  it("rejects income_qualification in a recipe that never runs BI", () => {
    const noBi: ScenarioRecipe = { ...recipe(GOOD_ORDER), forks: [], choices: {} };
    expect(recipeProblems(noBi).join("\n")).toMatch(/income_qualification needs "fork:bi"/);
  });

  it("does not need pap_transfer, the copay fork, or pricing", () => {
    expect(GOOD_ORDER.map((m) => m.id)).not.toContain("pap_transfer");
    expect(recipeProblems(recipe(GOOD_ORDER), forks)).toEqual([]);
  });
});

describe("assistance blocks: income qualification", () => {
  it("rejects every step before BI completes", () => {
    withFrozenClock(() => {
      const t = build(GOOD_ORDER);
      for (const e of ["SEND_PAP_SMS", "VERIFY_PAP_SMS", "START_INCOME_QUALIFICATION", "VERIFY_INCOME", "ACTIVATE_PAP"]) expect(t.can(e)).toBe(false);
    });
  });

  it("trigger system: the update text goes out on its own after BI", () => {
    withFrozenClock(() => {
      const t = atBiComplete(GOOD_ORDER);
      expect(t.data().biStatus).toBe("complete");
      expect(t.data().papSmsSent).toBe(false);
      t.clock.increment(2000);
      expect(t.data().papSmsSent).toBe(true);
    });
  });

  it("trigger absent: nothing fires it. An agent sends it", () => {
    withFrozenClock(() => {
      const t = atBiComplete([{ id: "enrollment" }, incomeModule(), { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }]);
      t.clock.increment(60000);
      expect(t.data().papSmsSent).toBe(false);
      expect(t.can("SEND_PAP_SMS")).toBe(true);
    });
  });

  it("activate on_qualify (default): qualifying activates the program and clears dispatch", () => {
    withFrozenClock(() => {
      const t = atBiComplete([{ id: "enrollment" }, incomeModule(), { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }]);
      qualify(t);
      expect(t.data().incomeStatus).toBe("verified");
      expect(t.data().papStatus).toBe("active");
      expect(t.data().dispatchStatus).toBe("pending_selection");
      expect(t.can("ACTIVATE_PAP")).toBe(false);
    });
  });

  it("activate on_choose: qualifying commits nothing. Choosing PAP activates it", () => {
    withFrozenClock(() => {
      const t = atBiComplete([{ id: "enrollment" }, incomeModule({ trigger: "system", activate: "on_choose" }), COPAY_MODULE, { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }]);
      expect(t.can("ACTIVATE_PAP")).toBe(false);
      t.clock.increment(2000);
      qualify(t);
      expect(t.data().incomeStatus).toBe("verified");
      expect(t.data().papStatus).toBe("none");
      expect(t.data().dispatchStatus).toBe("none");
      t.send("ACTIVATE_PAP");
      expect(t.data().papStatus).toBe("active");
      expect(t.data().dispatchStatus).toBe("pending_selection");
      expect(t.can("ACTIVATE_PAP")).toBe(false);
    });
  });

  it("a qualified patient can still enroll in copay without activating PAP", () => {
    withFrozenClock(() => {
      const t = atBiComplete(GOOD_ORDER.map((m) => (m.id === "income_qualification" ? incomeModule({ trigger: "system", activate: "on_choose" }) : m)));
      t.clock.increment(2000);
      qualify(t);
      t.send("SELECT_SELF_PAY");
      expect(t.data().copayEnrolled).toBe(true);
      expect(t.data().papStatus).toBe("none");
    });
  });
});

describe("assistance blocks: copay", () => {
  it("enrolls with no pricing module and no copay fork, once the patient is verified", () => {
    withFrozenClock(() => {
      const t = build(GOOD_ORDER);
      expect(t.can("SELECT_SELF_PAY")).toBe(false); // not verified yet
      for (const e of ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"]) t.send(e);
      expect(t.can("SELECT_SELF_PAY")).toBe(true);
      t.send("SELECT_SELF_PAY");
      expect(t.data().copayEnrolled).toBe(true);
      expect(t.data().pricingOption).toBeNull();
      expect(t.can("SELECT_SELF_PAY")).toBe(false); // once
    });
  });

  it("is absent from a recipe that does not list it", () => {
    withFrozenClock(() => {
      const t = build([{ id: "enrollment" }, incomeModule(), { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }]);
      for (const e of ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"]) t.send(e);
      expect(t.can("SELECT_SELF_PAY")).toBe(false);
    });
  });
});
