/**
 * coassistLadders.ts: the event lists behind the presenter's "jump to stage"
 * menu for the CoAssist flows (CoA_DTP, CoA_Copay, CoA_DME).
 *
 * DemoShell's resetActorToStage RESETs the actor, then sends these events to
 * land on a stage. This module is pure (no store, no actor, no React) so the
 * same lists run in the headless tests (__tests__/stageLadders.test.ts). A
 * test that mirrored a copy of this code is how the DME "stage 7 never
 * advances" bug stayed hidden: it sent SHIP_RX without READY_RX.
 *
 * Stages: 2 enrolled and verified (BI is already running), 3 same as 2, 4 BI complete (and for
 * DTP/Copay, PA approved and re-verified), 5 pricing and delivery chosen,
 * 6 filling, 7 shipped, 8 delivered.
 *
 * DTP and Copay: pricing defaults to Retail, a quick jump rather than a
 * scenario picker. CoA_DME reads its stages from the BI fork
 * (workflows/coassist/forks.ts), so the list and the events follow the
 * selected branch. The branch's stage count differs: covered by both stops
 * at the provider transfer.
 */

import { biForkFor, ENROLL_AND_VERIFY } from "@/workflows/coassist/forks";
import { forkStageEvents } from "@/engine/workflow/forks";

export interface LadderEvent {
  type: string;
  portal: string;
  [key: string]: unknown;
}

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): LadderEvent => ({ type, portal, ...extra });

// One list, shared with the DME benefits-investigation fork's lead-in (workflows/coassist/forks.ts).
const IDENTITY: LadderEvent[] = ENROLL_AND_VERIFY;

/**
 * Every event to send, in order, to land a RESET actor on `stage`. Stage 1 is the reset itself.
 * CoA_DME reads its stages from the BI fork (workflows/coassist/forks.ts), so `choices` selects the branch.
 * Without `choices`, it takes the scenario's default branch.
 */
export function coassistStageEvents(
  flowType: "CoA_DTP" | "CoA_Copay" | "CoA_DME",
  stage: number,
  choices: Record<string, string> = {},
): LadderEvent[] {
  if (flowType === "CoA_DME") return forkStageEvents(biForkFor("CoA_DME"), { choices }, stage);

  const out: LadderEvent[] = [];
  const upTo = (n: number) => stage >= n;

  if (upTo(2)) out.push(...IDENTITY);
  // Stage 3 (BI running) needs no event: REFERRAL_RECEIVED starts BI, and COMPLETE_BI submits the PA when one is required.

  {
    if (upTo(4)) {
      out.push(
        ev("COMPLETE_BI", "crm"),
        ev("APPROVE_PA", "crm"),
        ev("VERIFY_PA_APPROVED_SMS", "patient"),
        ev("VERIFY_PA_APPROVED_OTP", "patient"),
      );
    }
    if (upTo(5)) {
      out.push(
        ev("SELECT_PRICING_OPTION", "patient", { option: "retail" }),
        ev("PATIENT_SETS_ADDRESS", "patient"),
        ev("PATIENT_SELECTS_SHIP_DATE", "patient"),
      );
    }
  }

  if (upTo(6)) out.push(ev("FILL_RX", "crm"));
  if (upTo(7)) out.push(ev("READY_RX", "field"), ev("SHIP_RX", "crm"));
  if (upTo(8)) out.push(ev("DELIVER_RX", "crm"));
  return out;
}
