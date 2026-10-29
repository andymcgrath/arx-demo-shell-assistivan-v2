/**
 * CoAssist rules: the transition table shared by CoA_DTP, CoA_Copay, and CoA_Coverage. Replaces three copied 700-line
 * machines (coaDtp, coaCopay, workflows/coassist). Each module under ./modules owns its own rules. This file assembles them.
 *
 * Reading a rule: `when` is the precondition on workflowData, `set` is what changes, `emit` is what lands in the
 * event log (which Field notification emails read). A rule with `scenarios` applies only to those scenarios.
 * For one event the first matching rule wins, so order matters. Most events have one rule. The ones with several
 * are recorded by id in __fixtures__/rules/coassist.json, and a test fails if their order or scope changes.
 *
 * Onboarding (SMS, OTP, consent), BI, and PA are independent timelines. Each rule checks only the data it needs,
 * so BI or PA may race ahead of the patient's own onboarding without stranding it.
 *
 * The assembly order below keeps, per event: the spine before provider_transfer (VIEW_STAGE, LEAVE_STAGE), and
 * payment before financial_assistance before cash_offer (SELECT_SELF_PAY).
 */
import { ENROLLMENT_RULES } from "./modules/enrollment";
import { SPINE_RULES } from "./modules/spine";
import { PA_NOTIFICATION_RULES } from "./modules/pa_notification";
import { PAYMENT_RULES } from "./modules/payment";
import { FINANCIAL_ASSISTANCE_RULES } from "./modules/financial_assistance";
import { CASH_OFFER_RULES } from "./modules/cash_offer";
import { PROVIDER_TRANSFER_RULES } from "./modules/provider_transfer";
import { PAP_TRANSFER_RULES } from "./modules/pap_transfer";
import { INCOME_QUALIFICATION_COA_RULES } from "./modules/income_qualification";
import { PHARMACY_SELECTION_RULES } from "./modules/pharmacy_selection";
import { SCHEDULING_RULES } from "./modules/scheduling";
import { TRACKING_RULES } from "./modules/tracking";
import type { CoaRule } from "./modules/shared";

export const COASSIST_RULES: CoaRule[] = [
  ...ENROLLMENT_RULES,
  ...SPINE_RULES,
  ...PA_NOTIFICATION_RULES,
  ...PAYMENT_RULES,
  ...FINANCIAL_ASSISTANCE_RULES,
  ...CASH_OFFER_RULES,
  ...PROVIDER_TRANSFER_RULES,
  ...PAP_TRANSFER_RULES,
  ...INCOME_QUALIFICATION_COA_RULES,
  ...PHARMACY_SELECTION_RULES,
  ...SCHEDULING_RULES,
  ...TRACKING_RULES,
];
