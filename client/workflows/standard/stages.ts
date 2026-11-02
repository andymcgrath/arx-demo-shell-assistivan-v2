import type { StageMap } from "@/engine/workflow/stages";
import { STAGE_DEFS as S } from "../shared/stageDefs";
import { STANDARD_FLOWS } from "./scenarios";

/** The CRM stages for the standard (fax) scenario: the full list. See workflows/coassist/stages.ts for how the lists work. */
export const STANDARD_STAGES: StageMap = {
  flows: STANDARD_FLOWS,
  catalog: [S.EA, S.BI, S.PA, S.A, S.FA, S.TP, S.PS],
  rules: [
    { id: "ea", stage: S.EA.id, variant: "default" },
    { id: "bi", stage: S.BI.id, variant: "standard" },
    { id: "pa", stage: S.PA.id, variant: "standard" },
    { id: "appeal", stage: S.A.id, variant: "standard" },
    { id: "fa", stage: S.FA.id, variant: "standard" },
    { id: "tp", stage: S.TP.id, variant: "standard" },
    { id: "ps", stage: S.PS.id, variant: "standard" },
  ],
};
