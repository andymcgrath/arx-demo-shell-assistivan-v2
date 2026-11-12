/**
 * Financial assistance, `copay` variant: enrolling in the manufacturer's copay program. A price modifier. It sets
 * `copayEnrolled`, and `pricing` and `payment` read it. It does not need the `pricing` module: with no price in the
 * recipe, copay still enrolls and approves.
 *
 * Needs: a verified patient. In a recipe with a PA notice (`pa_notification`) the offer waits for the PA approval to be
 * verified, as the Copay scenarios do today. Sets: `copayEnrolled`.
 * Triggers: the patient's tap (`patient`). The scope is the block being in the recipe, not a fork id.
 */
import type { WorkflowData } from "@/engine/types";
import type { CoaRule } from "./shared";

const COPAY: { module: "financial_assistance"; props: { variant: "copay" } } = { module: "financial_assistance", props: { variant: "copay" } };

/** The recipe waits on a PA notice before it offers assistance. */
export const waitsForPaNotice = (s: { recipe?: { modules: { id: string }[] } }) => !!s.recipe?.modules.some((m) => m.id === "pa_notification");

/** The patient may enroll: verified, and past the PA notice when the recipe has one. */
export const copayUnlocked = (d: WorkflowData, s: { recipe?: { modules: { id: string }[] } }) =>
  d.consentStatus === "confirmed" && (!waitsForPaNotice(s) || d.paApprovedOtpVerified);

export const FINANCIAL_ASSISTANCE_RULES: CoaRule[] = [
  {
    // The patient enrolls for the reduced price. `pricing`, when the recipe has it, still asks Retail or Mail Order next.
    id: "financial_assistance.select_self_pay.copay",
    on: "SELECT_SELF_PAY",
    // A recipe on the assistance fork enrolls through CHOOSE_ASSISTANCE, so this event never reaches it.
    scope: [COPAY, { not: { fork: "assistance" } }],
    when: (d, _e, s) => copayUnlocked(d, s) && d.pricingOption === null && !d.copayEnrolled,
    set: () => ({ copayEnrolled: true }),
    emit: { portal: "patient", step: 9 },
  },
];
