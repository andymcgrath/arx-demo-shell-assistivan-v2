/**
 * The assistance fork's rule: the patient picks PAP, copay, or self-pay (`CHOOSE_ASSISTANCE` with an `option`).
 *
 * The fork (forks.ts) owns the "one outcome" rule and which exits exist (each exit `requires` its block). The blocks own
 * what their exit sets, so this rule only checks that the block is in the recipe, that its own precondition holds, and
 * that nothing else was chosen yet. No block reads another (CLAUDE.md rule 5).
 *
 * Needs: PAP needs a qualified patient. Copay needs a verified patient. Self-pay needs the verified cash offer.
 * Triggers: `patient`. The preconditions are the same wherever the click comes from.
 */
import { recipeMeets } from "@/engine/workflow/recipe";
import type { WorkflowData } from "@/engine/types";
import type { ScenarioRecipe } from "@/engine/workflow/components";
import { assistanceOutcomes, ASSISTANCE_FORK } from "../forks";
import { activatePap } from "../../shared/income";
import { copayUnlocked } from "./financial_assistance";
import type { CoaRule } from "./shared";

type Recipe = { recipe?: Pick<ScenarioRecipe, "modules" | "assistance"> };

/** Each exit's own precondition, on the data its block sets. */
const AVAILABLE: Record<string, (d: WorkflowData, s: Recipe) => boolean> = {
  pap: (d) => d.incomeStatus === "verified" && d.papStatus !== "active",
  copay: (d, s) => copayUnlocked(d, s) && !d.copayEnrolled,
  self_pay: (d) => d.cashOfferSmsVerified && d.pricingOption === null,
};

/** The exits this recipe offers right now: its blocks are listed, their preconditions hold, and nothing else was chosen. */
export function offeredAssistance(d: WorkflowData, s: Recipe): string[] {
  const recipe = s.recipe;
  if (!recipe) return [];
  if (!recipe.assistance?.allowMultiple && assistanceOutcomes(d).length > 0) return [];
  return ASSISTANCE_FORK.exits
    .filter((e) => (e.requires ?? []).every((r) => recipeMeets(recipe, r)) && AVAILABLE[e.id]?.(d, s))
    .map((e) => e.id);
}

export const ASSISTANCE_RULES: CoaRule[] = [
  {
    id: "assistance.choose",
    on: "CHOOSE_ASSISTANCE", // trigger: patient
    scope: { fork: "assistance" },
    when: (d, e, s) => offeredAssistance(d, s).includes(e.option),
    set: (d, e, s) => {
      if (e.option === "pap") return activatePap(d);
      if (e.option === "copay") return { copayEnrolled: true };
      return { pricingOption: "self_pay" as const, selectedPharmacy: s.content.selfPay };
    },
    emit: { portal: "patient", step: 9 },
  },
];
