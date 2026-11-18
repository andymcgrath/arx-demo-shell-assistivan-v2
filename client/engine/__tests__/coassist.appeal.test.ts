import { afterEach, describe, expect, it } from "vitest";
import { SimulatedClock } from "xstate";
import { recipeProblems } from "@/engine/workflow/recipe";
import type { ModuleSpec, ScenarioRecipe } from "@/engine/workflow/components";
import { setRecipeOverride } from "@/engine/workflow/recipeOverride";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { forksForScenario } from "@/engine/workflow/forks";
import { APPEAL_DECISION_MS, APPEAL_START_MS } from "@/workflows/coassist/modules/appeal";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * Appeal in CoAssist (CLAUDE.md rules 8, 10, 11, 12, 14). A denied PA starts the appeal on its own. The decision lands when the
 * agent opens the Appeals stage, and the `appeal` fork says which way. The recipe runs as a demo's blocks laid over Copay.
 */
const MODULES: ModuleSpec[] = [{ id: "enrollment" }, { id: "prior_authorization", props: { variant: "auto" } }, { id: "pa_notification" }, { id: "cash_offer", props: { variant: "bridge" } }, { id: "appeal" }, { id: "tracking" }];
const ONBOARD = [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }];

function start(appeal: "approved" | "denied" = "approved") {
  setRecipeOverride("CoA_Copay", { modules: MODULES, forks: ["bi", "pa", "appeal"] });
  const clock = new SimulatedClock();
  const actor = startFlow("CoA_Copay", { clock, choices: { bi: "pharmacy_covered", pa: "denied", appeal } });
  const data = () => ctx(actor).workflowData;
  const can = (type: string) => actor.getSnapshot().can({ type } as any);
  return { actor, clock, data, can };
}

describe("coassist appeal", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));

  it("the denial starts the appeal on its own, and the agent's visit decides it: approved", () => {
    withFrozenClock(() => {
      const t = start();
      runSteps(t.actor, [...ONBOARD, { type: "DENY_PA" }]);
      expect(t.data().appealStatus).toBe("none");
      t.clock.increment(APPEAL_START_MS);
      expect(t.data().appealStatus).toBe("initiated");
      expect(t.data().paStatus).toBe("denied");
      runSteps(t.actor, [{ type: "VIEW_STAGE", stage: "APPEAL" }]);
      expect(t.data().appealStatus).toBe("initiated");
      t.clock.increment(APPEAL_DECISION_MS);
      expect(t.data().appealStatus).toBe("approved");
      expect(t.data().paStatus).toBe("denied"); // a denied PA stays denied
    });
  });

  it("the fork's other exit denies the appeal", () => {
    withFrozenClock(() => {
      const t = start("denied");
      runSteps(t.actor, [...ONBOARD, { type: "DENY_PA" }]);
      t.clock.increment(APPEAL_START_MS);
      runSteps(t.actor, [{ type: "VIEW_STAGE", stage: "APPEAL" }]);
      t.clock.increment(APPEAL_DECISION_MS);
      expect(t.data().appealStatus).toBe("denied");
    });
  });

  it("leaving the stage cancels the pending decision", () => {
    withFrozenClock(() => {
      const t = start();
      runSteps(t.actor, [...ONBOARD, { type: "DENY_PA" }]);
      t.clock.increment(APPEAL_START_MS);
      runSteps(t.actor, [{ type: "VIEW_STAGE", stage: "APPEAL" }, { type: "LEAVE_STAGE", stage: "APPEAL" }]);
      t.clock.increment(APPEAL_DECISION_MS * 4);
      expect(t.data().appealStatus).toBe("initiated");
    });
  });

  it("rejects each step before its precondition (rule 12)", () => {
    withFrozenClock(() => {
      const t = start();
      runSteps(t.actor, ONBOARD);
      for (const e of ["INITIATE_APPEAL", "APPROVE_APPEAL", "DENY_APPEAL"]) expect(t.can(e), `${e} before the denial`).toBe(false);
      runSteps(t.actor, [{ type: "DENY_PA" }]);
      expect(t.can("APPROVE_APPEAL")).toBe(false); // filed first
      expect(t.can("DENY_APPEAL")).toBe(false);
      t.clock.increment(APPEAL_START_MS);
      expect(t.can("INITIATE_APPEAL")).toBe(false); // only once
      runSteps(t.actor, [{ type: "APPROVE_APPEAL" }]);
      expect(t.can("DENY_APPEAL")).toBe(false); // and decided once
      expect(t.can("APPROVE_APPEAL")).toBe(false);
    });
  });

  it("a recipe without the appeal block starts none and cannot pin an appeal exit", () => {
    withFrozenClock(() => {
      setRecipeOverride("CoA_Copay", { modules: MODULES.filter((m) => m.id !== "appeal") });
      const actor = startFlow("CoA_Copay", { clock: new SimulatedClock(), choices: { bi: "pharmacy_covered", pa: "denied" } });
      runSteps(actor, [...ONBOARD, { type: "DENY_PA" }]);
      expect(actor.getSnapshot().can({ type: "INITIATE_APPEAL" } as any)).toBe(false);
      expect(ctx(actor).workflowData.appealStatus).toBe("none");
    });
    const recipe: ScenarioRecipe = { source: "coassist", forks: ["bi", "pa", "appeal"], choices: { bi: "pharmacy_covered", pa: "denied", appeal: "approved" }, modules: MODULES.filter((m) => m.id !== "appeal") };
    expect(recipeProblems(recipe, forksForScenario(COASSIST_FORKS, "CoA_Copay")).join("\n")).toMatch(/fork "appeal" exit "approved" requires appeal/);
    expect(recipeProblems({ ...recipe, modules: MODULES }, forksForScenario(COASSIST_FORKS, "CoA_Copay"))).toEqual([]);
  });
});
