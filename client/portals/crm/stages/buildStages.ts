import type { WorkflowData } from "@/engine/types";
import { stagesFor } from "@/engine/workflow/stages";
import { stageMapFor } from "@/workflows/stageMaps";
import { STAGE_BUILDERS } from "./builders";
import type { Stage } from "./types";

/**
 * buildStages.ts: the stages the CRM shows in the Stage Quick View and the stage tabs, from the workflow data. The
 * workflow's stage map (workflows/<name>/stages.ts) says which stages show, in what order, and which variant draws each.
 * The builders (./builders) draw them. Pure: no React, no store, so the stage-list test (engine/__tests__/crm.stages.test.ts) runs it headless.
 */
export function buildCrmStages(workflowData: WorkflowData): Stage[] {
  return stagesFor(stageMapFor(workflowData.flowType), workflowData).map(({ stage, variant }) => STAGE_BUILDERS[stage][variant](workflowData));
}
