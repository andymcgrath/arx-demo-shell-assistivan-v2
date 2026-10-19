/**
 * iAssist rules: the transition table shared by iAssist_PA_Approved and iAssist_PAP (the appeal scenario). Replaces
 * two copied 600-line machines. Each module under ./modules owns its own rules. This file assembles them.
 *
 * Reading a rule: `when` is the precondition on workflowData, `set` is what changes, `emit` is what lands in the
 * event log, `then` fires another event (now or after a delay). A rule's `scope` says which scenarios get it, read
 * from the scenario's recipe (see recipes.ts) and forks.
 *
 * Order of events (CLAUDE.md rule 11): iAssist is an `erx` workflow. The eRx holds everything the PA needs.
 * REFERRAL_RECEIVED starts BI. BI completing with a result that requires a PA starts the PA. The patient's own
 * onboarding (SMS, OTP, consent) is an independent timeline and can finish before, during or after BI and the PA.
 *
 * For one event the first matching rule wins, so order matters. The ids and order are recorded in
 * __fixtures__/rules/iassist.json, and a test fails if the order or the scope of any rule changes.
 */
import { ENROLLMENT_RULES } from "./modules/enrollment";
import { SPINE_RULES } from "./modules/spine";
import { PA_NOTIFICATION_RULES } from "./modules/pa_notification";
import { APPEAL_RULES } from "./modules/appeal";
import { PAYMENT_RULES } from "./modules/payment";
import { PHARMACY_SELECTION_RULES } from "./modules/pharmacy_selection";
import { SCHEDULING_RULES } from "./modules/scheduling";
import { TRACKING_RULES } from "./modules/tracking";
import type { IaRule } from "./modules/shared";

export const IASSIST_RULES: IaRule[] = [
  ...ENROLLMENT_RULES,
  ...SPINE_RULES,
  ...PA_NOTIFICATION_RULES,
  ...APPEAL_RULES,
  ...PAYMENT_RULES,
  ...PHARMACY_SELECTION_RULES,
  ...SCHEDULING_RULES,
  ...TRACKING_RULES,
];
