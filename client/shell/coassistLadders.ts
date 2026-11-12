/**
 * coassistLadders.ts: the event lists behind the presenter's "jump to stage"
 * menu for the CoAssist flows (CoA_DTP, CoA_Copay, CoA_Coverage, CoA_Medical_Transfer, CoA_PAP).
 *
 * DemoShell's resetActorToStage RESETs the actor, then sends these events to
 * land on a stage. This module is pure (no store, no actor, no React) so the
 * same lists run in the headless tests (__tests__/stageLadders.test.ts). A
 * test that mirrored a copy of this code is how the Coverage "stage 7 never
 * advances" bug stayed hidden: it sent SHIP_RX without READY_RX.
 *
 * Stages: 2 enrolled and verified (BI is already running), 3 same as 2, 4 BI complete (and for
 * DTP/Copay, PA approved and re-verified), 5 pricing and delivery chosen,
 * 6 filling, 7 shipped, 8 delivered.
 *
 * DTP and Copay: pricing defaults to Retail, a quick jump rather than a
 * scenario picker. CoA_Coverage reads its stages from the BI fork
 * (workflows/coassist/forks.ts), so the list and the events follow the
 * selected branch. The branch's stage count differs: covered by both stops
 * at the provider transfer.
 */

import { biForkFor, ENROLL_AND_VERIFY } from "@/workflows/coassist/forks";
import { forkStageEvents } from "@/engine/workflow/forks";
import { isTransferScenario, transferStageEvents } from "./transferLadders";
import { scenarioFacts } from "@/workflows/scenarioFacts";

export interface LadderEvent {
  type: string;
  portal: string;
  [key: string]: unknown;
}

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): LadderEvent => ({ type, portal, ...extra });

// One list, shared with the Coverage benefits-investigation fork's lead-in (workflows/coassist/forks.ts).
const IDENTITY: LadderEvent[] = ENROLL_AND_VERIFY;

/**
 * The `bi` exits the hand-built DTP and Copay ladder below can land on. It ignores `choices`, so it is right only for
 * these. stageLadders.test.ts fails when a recipe can pick another exit.
 */
export const HAND_BUILT_LADDER_EXITS = ["pharmacy_covered"];

/**
 * Every event to send, in order, to land a RESET actor on `stage`. Stage 1 is the reset itself.
 * CoA_Coverage reads its stages from the BI fork (workflows/coassist/forks.ts), so `choices` selects the branch.
 * Without `choices`, it takes the scenario's default branch.
 */
/** The flows with a CoAssist stage-jump ladder. */
export type CoassistLadderFlow = "CoA_DTP" | "CoA_Copay" | "CoA_Web_Copay" | "CoA_HCP_Enroll" | "CoA_Coverage" | "CoA_Medical_Transfer" | "CoA_PAP" | "CoA_APA_Specialty" | "CoA_APA_Assistance" | "CoA_Web_PAP";

/**
 * The web scenario's rungs. The client page's submit starts BI. Stage 4 is the Gateway opened (BI back, PA approved), the
 * patient checking pricing (no PA text), and copay enrolled. Stage 5 picks Mail Order and sets the delivery. 6 to 8 are
 * fulfillment, as elsewhere.
 */
function webStageEvents(stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  if (stage >= 2) out.push(ev("WEB_SUBMIT", "patient"));
  if (stage >= 4) {
    out.push(
      // Opening the Gateway releases BI. The decisions arrive on timers in the demo, so the ladder sends them.
      ev("VIEW_GATEWAY", "patient"),
      ev("COMPLETE_BI", "crm"),
      ev("APPROVE_PA", "crm"),
      ev("CHECK_PRICING", "patient"),
      ev("SELECT_SELF_PAY", "patient"),
    );
  }
  if (stage >= 5) {
    out.push(
      ev("SELECT_PRICING_OPTION", "patient", { option: "mail_order" }),
      ev("PATIENT_SETS_ADDRESS", "patient"),
      ev("PATIENT_SELECTS_SHIP_DATE", "patient"),
    );
  }
  if (stage >= 6) out.push(ev("FILL_RX", "crm"));
  if (stage >= 7) out.push(ev("READY_RX", "field"), ev("SHIP_RX", "crm"));
  if (stage >= 8) out.push(ev("DELIVER_RX", "crm"));
  return out;
}

/**
 * The HCP enrollment rungs. 2 is the HCP's submit (the patient is texted), 3 the patient opens the link and verifies the
 * phone, 4 the one-time code, 5 consent. The case ends there.
 */
function hcpStageEvents(stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  if (stage >= 2) out.push(ev("HCP_ENROLL_SUBMIT", "patient"));
  if (stage >= 3) out.push(ev("VERIFY_SMS", "patient"));
  if (stage >= 4) out.push(ev("VERIFY_OTP", "patient"));
  if (stage >= 5) out.push(ev("CONFIRM_CONSENT", "patient"));
  return out;
}

export function coassistStageEvents(
  flowType: CoassistLadderFlow,
  stage: number,
  choices: Record<string, string> = {},
): LadderEvent[] {
  if (scenarioFacts(flowType).isHcpEnrollment) return hcpStageEvents(stage);
  // A web scenario with its own rungs after the `bi` fork (Web PAP) reads them from the fork. Web Copay keeps the hand-built ones.
  if (scenarioFacts(flowType).isWebSource && !biForkFor(flowType).stagesBefore) return webStageEvents(stage);
  if (isTransferScenario(flowType)) return transferStageEvents(stage);
  // A scenario with its own rungs after the `bi` fork reads them from the fork.
  const biFork = biForkFor(flowType);
  if (biFork.stagesBefore) return forkStageEvents(biFork, { choices }, stage);

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
