/**
 * Prior authorization in CoAssist: the shared APA rules (workflows/shared/apa.ts), given ids and a module scope so the
 * recorded rule tables and the scope check can see them. The `auto` variant adds no rules: its PA starts from the spine.
 *
 * Needs: a completed BI whose exit requires a PA. Sets: `paFormStatus`, then `paStatus` through `SUBMIT_PA`.
 * Triggers: the form email is a `system` step. The prescriber's steps are `agent` (they act after the email).
 */
import { PRIOR_AUTHORIZATION_RULES } from "../../shared/apa";
import type { CoaRule } from "./shared";

export const PRIOR_AUTHORIZATION_COA_RULES: CoaRule[] = PRIOR_AUTHORIZATION_RULES.map((rule) => ({
  ...rule,
  id: `prior_authorization.${rule.on.toLowerCase()}`,
  scope: { module: "prior_authorization" },
}));
