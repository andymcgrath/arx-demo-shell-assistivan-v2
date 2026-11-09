import type { WorkflowData } from "@/engine/types";
import type { Stage } from "../types";
import { EA_BUILDERS } from "./ea";
import { BI_BUILDERS } from "./bi";
import { PA_BUILDERS } from "./pa";
import { APPEAL_BUILDERS } from "./appeal";
import { PAP_BUILDERS, PSP_BUILDERS } from "./pap";
import { FA_BUILDERS } from "./fa";
import { TRANSFER_BUILDERS, CASH_OFFER_BUILDERS } from "./coverage";
import { TRIAGE_BUILDERS } from "./triage";
import { PHARMACY_BUILDERS } from "./pharmacy";

/**
 * One builder per stage and variant. A workflow's stage map (workflows/<name>/stages.ts) names a variant per stage,
 * and this table draws it. Builders are pure: they read workflow data and nothing else.
 */
export type StageBuilder = (data: WorkflowData) => Stage;

export const STAGE_BUILDERS: Record<string, Record<string, StageBuilder>> = {
  "EA-14272": EA_BUILDERS,
  "BI-14273": BI_BUILDERS,
  "PA-14274": PA_BUILDERS,
  "A-14275": APPEAL_BUILDERS,
  "PAP-14279": PAP_BUILDERS,
  "PSP-14283": PSP_BUILDERS,
  "FA-14276": FA_BUILDERS,
  "PT-14282": TRANSFER_BUILDERS,
  "CO-14281": CASH_OFFER_BUILDERS,
  "TP-14277": TRIAGE_BUILDERS,
  "PS-14278": PHARMACY_BUILDERS,
};
