/**
 * transferLadders.ts: the stage-jump list for a scenario whose recipe ends in the Triage `transfer` exit (HCP
 * administered, no payment, no scheduling). Two sources run it today (iAssist and CoAssist). The events are the same
 * for both, so the list lives here and the recipe, not the source, picks it.
 *
 * 2 referral received (BI runs), 3 patient enrolled, 4 BI complete and PA approved, 5 patient verified and the Rx
 * transferred to the assigned site of care (the terminal stage).
 */
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import type { LadderEvent } from "./coassistLadders";

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): LadderEvent => ({ type, portal, ...extra });

/** The `bi` exits this ladder lands on. The ladder guard test reads it. */
export const TRANSFER_LADDER_EXITS = ["medical_pa_required"];

export const TRANSFER_STAGE_LABELS = [
  "Referral Received",
  "eRx Submitted (BI Complete, PA Submitted)",
  "Patient Enrolled",
  "PA Approved",
  "Patient Verified, Rx Transferred",
];

/** True when the scenario's recipe uses the Triage `transfer` exit. */
export const isTransferScenario = (flowType: string): boolean =>
  ALL_SCENARIOS.find((s) => s.flowType === flowType)?.recipe?.triage === "transfer";

export function transferStageEvents(stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  const upTo = (n: number) => stage >= n;
  if (upTo(2)) out.push(ev("REFERRAL_RECEIVED", "provider"));
  if (upTo(3)) out.push(ev("VERIFY_SMS", "patient"), ev("VERIFY_OTP", "patient"), ev("CONFIRM_CONSENT", "patient"));
  if (upTo(4)) out.push(ev("COMPLETE_BI", "crm"), ev("APPROVE_PA", "crm"));
  if (upTo(5)) out.push(ev("VERIFY_PA_APPROVED_SMS", "patient"), ev("VERIFY_PA_APPROVED_OTP", "patient"));
  return out;
}
