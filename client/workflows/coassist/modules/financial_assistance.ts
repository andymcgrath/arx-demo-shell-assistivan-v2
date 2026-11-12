/**
 * Financial assistance, `copay` variant: enrolling in the manufacturer's copay program. A price modifier. It sets
 * `copayEnrolled`, and `pricing` and `payment` read it. It does not need the `pricing` module: with no price in the
 * recipe, copay still enrolls and approves.
 *
 * Needs: a verified patient. In a recipe with a PA notice (`pa_notification`) the offer waits for the PA approval to be
 * verified, as the Copay scenarios do today. Sets: `copayEnrolled`.
 * Triggers: the patient's tap (`patient`). The scope is the block being in the recipe, not a fork id.
 */
import type { CoaRule } from "./shared";

const COPAY: { module: "financial_assistance"; props: { variant: "copay" } } = { module: "financial_assistance", props: { variant: "copay" } };

/** The recipe waits on a PA notice before it offers assistance. */
const waitsForPaNotice = (s: { recipe?: { modules: { id: string }[] } }) => !!s.recipe?.modules.some((m) => m.id === "pa_notification");

export const FINANCIAL_ASSISTANCE_RULES: CoaRule[] = [
  {
    // The patient enrolls for the reduced price. `pricing`, when the recipe has it, still asks Retail or Mail Order next.
    id: "financial_assistance.select_self_pay.copay",
    on: "SELECT_SELF_PAY",
    scope: COPAY,
    when: (d, _e, s) => d.consentStatus === "confirmed" && (!waitsForPaNotice(s) || d.paApprovedOtpVerified) && d.pricingOption === null && !d.copayEnrolled,
    set: () => ({ copayEnrolled: true }),
    emit: { portal: "patient", step: 9 },
  },
];
