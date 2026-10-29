/**
 * Income qualification in CoAssist: the shared rules (workflows/shared/income.ts), given ids and a module scope so the
 * recorded rule tables and the scope check can see them. The PAP workflow uses the same rules, unscoped.
 *
 * Needs: a completed BI with no coverage. Sets: `incomeStatus` and `papStatus`.
 * Triggers: the update text is a `system` step here. `pap_transfer.verify_sms` fires it once the patient taps the
 * transfer text. In the PAP workflow an agent stages it. The precondition is the same.
 */
import { INCOME_QUALIFICATION_RULES } from "../../shared/income";
import type { CoaRule } from "./shared";

export const INCOME_QUALIFICATION_COA_RULES: CoaRule[] = INCOME_QUALIFICATION_RULES.map((rule) => ({
  ...rule,
  id: `income_qualification.${rule.on.toLowerCase()}`,
  scope: { module: "income_qualification" },
}));
