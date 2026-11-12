import { describe, it, expect } from "vitest";
import { createActor, SimulatedClock } from "xstate";
import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import type { ModuleSpec, ScenarioRecipe } from "@/engine/workflow/components";
import { ASSISTANCE_FORK, COASSIST_FORKS, assistanceFork } from "@/workflows/coassist/forks";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
import { COA_COPAY, COA_COVERAGE, COA_DTP, COA_PAP, COA_WEB_COPAY, COA_HCP_ENROLL, COA_APA_SPECIALTY, COA_WEB_HCP_PATIENT } from "@/workflows/coassist/scenarios";
import { withFrozenClock } from "./harness";

/**
 * Income qualification (PAP) and copay as independent blocks (CLAUDE.md rules 3, 4, 5, 11).
 *
 * A recipe lists the blocks it wants. Neither knows about the other, and neither needs `pap_transfer`, the `copay` fork,
 * or the `pricing` module. The recipe here is a covered-BI case (`pharmacy_transfer`) with both blocks and nothing else.
 */
const incomeModule = (props?: Record<string, unknown>): ModuleSpec => ({ id: "income_qualification", ...(props ? { props } : {}) });
const COPAY_MODULE: ModuleSpec = { id: "financial_assistance", props: { variant: "copay" } };

const recipe = (modules: ModuleSpec[], extra: Partial<ScenarioRecipe> = {}): ScenarioRecipe => ({
  source: "coassist",
  forks: ["bi"],
  choices: { bi: "pharmacy_transfer" },
  panels: ["benefits"],
  modules,
  ...extra,
});

const GOOD_ORDER = [{ id: "enrollment" }, incomeModule({ trigger: "system" }), COPAY_MODULE, { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }] as ModuleSpec[];

// The test recipe runs on DTP's id. It declares only the `bi` fork, and the real scenarios stay registered for the scope check.
const HOST = "CoA_DTP" as const;
const forks = forksForScenario(COASSIST_FORKS, HOST);
/** The assistance fork applies to no scenario yet. These tests put it on the host so its rule runs. */
const FORKS_WITH_ASSISTANCE = [...COASSIST_FORKS.filter((f) => f.id !== "assistance"), assistanceFork([HOST])];

function build(modules: ModuleSpec[], extra: Partial<ScenarioRecipe> = {}, withFork = false) {
  const r = recipe(modules, extra);
  const scenario = { ...COA_DTP, choices: r.choices, recipe: r };
  const machine = createWorkflowMachine({
    id: "coassist-assistance-blocks",
    defaultFlowType: HOST,
    rules: COASSIST_RULES,
    forks: withFork ? FORKS_WITH_ASSISTANCE : COASSIST_FORKS,
    scenarios: { CoA_DTP: scenario, CoA_Copay: COA_COPAY, CoA_Coverage: COA_COVERAGE, CoA_PAP: COA_PAP, CoA_Web_Copay: COA_WEB_COPAY, CoA_HCP_Enroll: COA_HCP_ENROLL, CoA_Web_HCP_Patient: COA_WEB_HCP_PATIENT, CoA_APA_Specialty: COA_APA_SPECIALTY },
  });
  const clock = new SimulatedClock();
  const actor = createActor(machine, { input: { flowType: HOST }, clock } as any);
  actor.start();
  const send = (type: string, extraFields: Record<string, unknown> = {}) => actor.send({ type, ...extraFields } as any);
  const can = (type: string, extraFields: Record<string, unknown> = {}) => actor.getSnapshot().can({ type, ...extraFields } as any);
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

/**
 * The assistance fork (rules 8, 12, 14). Every combination of the three blocks gets one headless test per exit: the exit is
 * offered exactly when its block is in the recipe, choosing it sets its outcome, and nothing else can be chosen after it.
 */
type Exit = "pap" | "copay" | "self_pay";
const ALL_EXITS: Exit[] = ["pap", "copay", "self_pay"];
const subsets = (): Exit[][] => {
  const out: Exit[][] = [];
  for (let mask = 1; mask < 8; mask++) out.push(ALL_EXITS.filter((_, i) => mask & (1 << i)));
  return out;
};

function assistanceRecipe(blocks: Exit[], allowMultiple = false) {
  const selfPay = blocks.includes("self_pay");
  const modules: ModuleSpec[] = [
    { id: "enrollment" },
    ...(blocks.includes("pap") ? [incomeModule({ trigger: "system", activate: "on_choose" })] : []),
    ...(blocks.includes("copay") ? [COPAY_MODULE] : []),
    ...(selfPay ? [{ id: "cash_offer", props: { variant: "sms" } } as ModuleSpec] : [{ id: "pharmacy_selection", props: { variant: "assigned" } } as ModuleSpec]),
    { id: "tracking" },
  ];
  return { modules, extra: { forks: ["bi", "assistance"], choices: { bi: selfPay ? "no_coverage" : "pharmacy_transfer" }, ...(allowMultiple ? { assistance: { allowMultiple } } : {}) } as Partial<ScenarioRecipe> };
}

/** The patient is verified, BI is back, and each block's own start is done (cash offer text confirmed, income qualified). */
function readyToChoose(blocks: Exit[], allowMultiple = false) {
  const { modules, extra } = assistanceRecipe(blocks, allowMultiple);
  const t = build(modules, extra, true);
  for (const e of ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "COMPLETE_BI"]) t.send(e);
  if (blocks.includes("self_pay")) t.send("VERIFY_CASH_OFFER_SMS");
  if (blocks.includes("pap")) {
    t.clock.increment(2000);
    qualify(t);
  }
  return t;
}

const outcomeOf = (d: any): Record<Exit, boolean> => ({ pap: d.papStatus === "active", copay: !!d.copayEnrolled, self_pay: d.pricingOption === "self_pay" });

describe("assistance fork: one headless test per allowed exit", () => {
  for (const blocks of subsets()) {
    describe(`recipe with ${blocks.join(" + ")}`, () => {
      it("is a valid recipe, and its pins name only exits it has", () => {
        const { modules, extra } = assistanceRecipe(blocks);
        expect(recipeProblems(recipe(modules, extra), FORKS_WITH_ASSISTANCE.filter((f) => f.id !== "pricing" && f.id !== "copay" && f.id !== "pa"))).toEqual([]);
        for (const exit of ALL_EXITS.filter((e) => !blocks.includes(e))) {
          const problems = recipeProblems(recipe(modules, { ...extra, choices: { ...extra.choices, assistance: exit } }), FORKS_WITH_ASSISTANCE);
          expect(problems.join("\n"), `a pin to ${exit}`).toMatch(new RegExp(`fork "assistance" exit "${exit}" requires`));
        }
      });

      for (const exit of ALL_EXITS) {
        if (blocks.includes(exit)) {
          it(`${exit}: offered, sets its outcome, and nothing else can be chosen after it`, () => {
            withFrozenClock(() => {
              const t = readyToChoose(blocks);
              expect(t.can("CHOOSE_ASSISTANCE", { option: exit })).toBe(true);
              t.send("CHOOSE_ASSISTANCE", { option: exit });
              expect(outcomeOf(t.data())).toEqual({ pap: exit === "pap", copay: exit === "copay", self_pay: exit === "self_pay" });
              if (exit === "pap") expect(t.data().dispatchStatus).toBe("pending_selection");
              for (const other of ALL_EXITS) expect(t.can("CHOOSE_ASSISTANCE", { option: other }), `${other} after ${exit}`).toBe(false);
            });
          });
        } else {
          it(`${exit}: not offered, because its block is not in the recipe`, () => {
            withFrozenClock(() => {
              const t = readyToChoose(blocks);
              expect(t.can("CHOOSE_ASSISTANCE", { option: exit })).toBe(false);
              t.send("CHOOSE_ASSISTANCE", { option: exit });
              expect(outcomeOf(t.data())[exit]).toBe(false);
            });
          });
        }
      }
    });
  }

  it("PAP is offered only after the patient qualifies, and qualifying still leaves copay open", () => {
    withFrozenClock(() => {
      const { modules, extra } = assistanceRecipe(["pap", "copay"]);
      const t = build(modules, extra, true);
      for (const e of ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "COMPLETE_BI"]) t.send(e);
      expect(t.can("CHOOSE_ASSISTANCE", { option: "pap" })).toBe(false); // not qualified yet
      expect(t.can("CHOOSE_ASSISTANCE", { option: "copay" })).toBe(true); // copay is open whenever its block is listed
      t.clock.increment(2000);
      qualify(t);
      expect(t.can("CHOOSE_ASSISTANCE", { option: "pap" })).toBe(true);
      expect(t.data().papStatus).toBe("none"); // qualified, not committed
      t.send("CHOOSE_ASSISTANCE", { option: "copay" });
      expect(t.data().copayEnrolled).toBe(true);
      expect(t.data().papStatus).toBe("none");
    });
  });

  it("a recipe may opt in to more than one outcome", () => {
    withFrozenClock(() => {
      const t = readyToChoose(["pap", "copay"], true);
      t.send("CHOOSE_ASSISTANCE", { option: "copay" });
      expect(t.can("CHOOSE_ASSISTANCE", { option: "pap" })).toBe(true);
      t.send("CHOOSE_ASSISTANCE", { option: "pap" });
      expect(outcomeOf(t.data())).toMatchObject({ pap: true, copay: true });
    });
  });

  it("the fork lists its exits with the block each requires", () => {
    expect(ASSISTANCE_FORK.exits.map((e) => [e.id, e.requires])).toEqual([
      ["pap", ["income_qualification"]],
      ["copay", ["financial_assistance:copay"]],
      ["self_pay", ["cash_offer:sms"]],
    ]);
  });
});
