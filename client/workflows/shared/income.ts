/**
 * Income qualification: the patient applies for the free drug program (PAP). Step module shared by the PAP
 * workflow (Fax_PAP_Audit, PrES_PAP) and, from the next steps, a CoAssist scenario (CLAUDE.md rule 6).
 *
 * Needs: a completed BI with no coverage. The Fulfillment Center then sends the "application update" text,
 * the patient confirms it, and taps "Enroll" to open the income form.
 * Sets: `incomeStatus` (qualify), then `papStatus: "active"` and dispatch clearance (activate). There is no PA, so
 * `paStatus` stays "none". Active status does the job `paStatus: "approved"` does elsewhere: it clears the case.
 * Qualify and activate are two events. `activate: "on_qualify"` (default) does both at `VERIFY_INCOME`.
 * `activate: "on_choose"` waits for `ACTIVATE_PAP`, the patient's pick on the assistance fork.
 *
 * Triggers: the update text (`SEND_PAP_SMS`) is an `agent` step in the PAP workflow, `system` when the recipe sets
 * `trigger: "system"`, and fired by `pap_transfer` in CoA_PAP. The patient does the rest.
 * Rules carry no ids on purpose, so the recorded rule tables keep their current shape.
 */
import type { Rule } from "@/engine/workflow/types";
import { clearDispatch } from "./dispatch";

type WithRecipe = { recipe?: { modules: { id: string; props?: Record<string, unknown> }[] } };

/** The recipe's `income_qualification` props. A workflow with no recipe (PAP) gets none, which means today's behavior. */
export const incomeProps = (s: WithRecipe): { trigger?: string; activate?: string } =>
  s.recipe?.modules.find((m) => m.id === "income_qualification")?.props ?? {};

/** Qualifying activates the program at once. The default, and the only behavior the PAP workflow has. */
export const activatesOnQualify = (s: WithRecipe): boolean => incomeProps(s).activate !== "on_choose";

/** A recipe whose `income_qualification` starts on a timer once BI completes. */
export const incomeStartsOnTimer = (s: WithRecipe): boolean => incomeProps(s).trigger === "system";

export const INCOME_QUALIFICATION_RULES: Rule<any, any>[] = [
  {
    // The Fulfillment Center stages the update once BI is back.
    on: "SEND_PAP_SMS", // trigger: agent
    // `system` (a block prop) fires it on a timer after BI. `agent` waits for a click. `pap_transfer` fires it in CoA_PAP.
    when: (d) => d.biStatus === "complete" && !d.papSmsSent,
    set: () => ({ papSmsSent: true }),
    emit: { portal: "crm", step: 7 },
  },
  {
    on: "VERIFY_PAP_SMS",
    when: (d) => d.papSmsSent && !d.papSmsVerified,
    set: () => ({ papSmsVerified: true }),
    emit: { portal: "patient", step: 7 },
  },
  {
    // Fax PAP only. The PrES patient has no code screen.
    on: "VERIFY_PAP_OTP",
    when: (d) => d.papSmsVerified && !d.papOtpVerified,
    set: () => ({ papOtpVerified: true }),
    emit: { portal: "patient", step: 7 },
  },
  {
    // The patient taps "Enroll" on the home card. Only then does the income form open.
    on: "START_INCOME_QUALIFICATION",
    when: (d) => d.papSmsVerified && d.incomeStatus === "none",
    set: () => ({ incomeStatus: "pending" }),
    emit: { portal: "patient", step: 8 },
  },
  {
    // Qualify: income verified. The patient is eligible (`incomeStatus` "verified"). With `activate: "on_qualify"` (the
    // default) the program also turns active and the case clears to dispatch, before a pharmacy is picked.
    // With `on_choose` nothing is committed: the patient can still pay out of pocket or use the copay program.
    on: "VERIFY_INCOME",
    when: (d) => d.papSmsVerified && d.incomeStatus !== "verified",
    set: (d, _e, s) => ({
      incomeStatus: "verified",
      ...(activatesOnQualify(s) ? { papStatus: "active", ...clearDispatch(d) } : {}),
    }),
    emit: { portal: "patient", step: 8 },
  },
  {
    // Choose: the patient picks PAP after qualifying. Only a recipe with `activate: "on_choose"` needs it.
    on: "ACTIVATE_PAP", // trigger: patient
    when: (d, _e, s) => !activatesOnQualify(s) && d.incomeStatus === "verified" && d.papStatus !== "active",
    set: (d) => ({ papStatus: "active", ...clearDispatch(d) }),
    emit: { portal: "patient", step: 8 },
  },
];
