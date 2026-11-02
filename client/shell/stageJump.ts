/**
 * stageJump.ts: the stage-jump list and the events behind it, for every scenario. One place, so the header's jump
 * menu and the patient view's phase rail read the same list and the same replay, and cannot disagree.
 *
 * The lists and the branch order moved here from DemoShell.tsx unchanged. The ladders themselves live in
 * `*Ladders.ts` (each pinned by `engine/__tests__/stageLadders.test.ts`). Pure: no store, no actor, no React.
 */
import type { FlowType } from "@/engine/types";
import { forkStageList } from "@/engine/workflow/forks";
import { biForkFor } from "@/workflows/coassist/forks";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { scenarioHasModule } from "@/workflows/scenarios";
import { buyAndBillStageEvents, BUY_AND_BILL_STAGE_LABELS, freeDrugStageEvents, FREE_DRUG_STAGE_LABELS, isBuyAndBillScenario, isFreeDrugScenario } from "./buyAndBillLadders";
import { coassistStageEvents, type CoassistLadderFlow, type LadderEvent } from "./coassistLadders";
import { faxStageEvents } from "./faxLadders";
import { iassistStageEvents, type IassistLadderFlow } from "./iassistLadders";
import { isTransferScenario, transferStageEvents, TRANSFER_STAGE_LABELS } from "./transferLadders";

export interface JumpStage {
  /** 1-based. Stage 1 sends nothing. */
  stage: number;
  label: string;
}

type Choices = Record<string, string> | undefined;

const numbered = (labels: string[]): JumpStage[] => labels.map((label, i) => ({ stage: i + 1, label }));

const PAP_LABELS = ["Referral Received", "Patient Enrolled", "Benefits Investigation", "PAP Enrolled", "Triage to Pharmacy", "Rx Processing", "Rx Shipped", "Medication Delivered"];

const IASSIST_PAP_LABELS = [
  "Referral Received",
  "eRx Submitted (BI Complete, PA Submitted)",
  "Patient Enrolled",
  "PA Denied",
  "Appeal Filed",
  "Triage to Pharmacy (Keanu to Facility)",
];

const IASSIST_LABELS = [
  "Referral Received",
  "eRx Submitted (BI Complete, PA Submitted)",
  "Patient Enrolled",
  "PA Approved",
  "Triage to Pharmacy",
  "Rx Shipped",
  "Medication Delivered",
];

// CoA_DTP and CoA_Copay have their own list. It adds the "Cash Offer" rung the CRM has between Prior Authorization and Triage.
const COA_LABELS = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "Prior Authorization",
  "Cash Offer",
  "Triage to Pharmacy",
  "Rx Processing",
  "Rx Shipped",
  "Medication Delivered",
];

const STANDARD_LABELS = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "Prior Authorization",
  "Triage to Pharmacy",
  "Rx Processing",
  "Rx Shipped",
  "Medication Delivered",
];

/** The stages to show for a scenario. A scenario with a `bi` fork follows the selected branch. */
export function stageList(flowType: FlowType, choices: Choices): JumpStage[] {
  const facts = scenarioFacts(flowType);
  if (facts.isNoPaIntake) return numbered(PAP_LABELS);
  if (facts.isIassistAppeal) return numbered(IASSIST_PAP_LABELS);
  if (isBuyAndBillScenario(flowType)) return numbered(BUY_AND_BILL_STAGE_LABELS);
  if (isFreeDrugScenario(flowType)) return numbered(FREE_DRUG_STAGE_LABELS);
  if (isTransferScenario(flowType)) return numbered(TRANSFER_STAGE_LABELS);
  if (facts.isIassistSource) return numbered(IASSIST_LABELS);
  // The list comes from the BI fork, so it follows the selected branch (workflows/coassist/forks.ts).
  if (scenarioHasModule(flowType, "pap_transfer") || facts.isCoverageScenario) {
    return forkStageList(biForkFor(flowType), { choices: choices ?? {} }).map(({ stage, label }) => ({ stage, label }));
  }
  if (facts.hasPricingFork) return numbered(COA_LABELS);
  return numbered(STANDARD_LABELS);
}

/**
 * The events to send, in order, to land a RESET machine on `stage`. The caller sends RESET first. RESET keeps the
 * current fork choices, so the jump lands on the selected branch.
 */
export function jumpEvents(flowType: FlowType, stage: number, choices: Choices): LadderEvent[] {
  const facts = scenarioFacts(flowType);
  // Buy and Bill: the HCP runs eMedBV and enrolls copay before the referral, so it has its own ladder.
  if (isBuyAndBillScenario(flowType)) return buyAndBillStageEvents(stage);
  // Free drug (PAP): eMedBV finds no coverage, so it has its own ladder too.
  if (isFreeDrugScenario(flowType)) return freeDrugStageEvents(stage);
  // A scenario whose recipe ends in the Triage transfer exit: one ladder, whatever the source.
  if (isTransferScenario(flowType)) return transferStageEvents(stage);
  // iAssist flows (iAssist_PA_Approved and the iAssist_PAP appeal).
  if (facts.isIassistAppeal || facts.isIassistSource) return iassistStageEvents(flowType as IassistLadderFlow, stage);
  // The free drug program ladder follows the scenario's own `bi` fork rungs, like Coverage's.
  if (scenarioHasModule(flowType, "pap_transfer")) return coassistStageEvents(flowType as CoassistLadderFlow, stage, choices);
  // CoAssist flows (CoA_DTP, CoA_Copay, CoA_Coverage).
  if (facts.isCoverageScenario || facts.hasPricingFork) return coassistStageEvents(flowType as CoassistLadderFlow, stage, choices);
  // Standard (Fax_QS_PA_Approved) and PAP (Fax_PAP_Audit, PrES_PAP).
  return faxStageEvents(facts.isNoPaIntake ? "pap" : "standard", stage);
}
