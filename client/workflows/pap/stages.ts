import type { StageMap } from "@/engine/workflow/stages";
import { STAGE_DEFS as S } from "../shared/stageDefs";
import { PAP_FLOWS } from "./scenarios";

/**
 * The CRM stages for the PAP scenarios (Fax PAP and the legacy PrES PAP): no insurance is found, so there is no PA and
 * no appeal. PAP Enrollment and Financial Assistance take their place. See workflows/coassist/stages.ts for how the lists work.
 */
export const PAP_STAGES: StageMap = {
  flows: PAP_FLOWS,
  catalog: [S.EA, S.BI, S.PAP, S.FA, S.TP, S.PS],
  rules: [
    { id: "ea", stage: S.EA.id, variant: "default" },
    { id: "bi", stage: S.BI.id, variant: "no_insurance" },
    { id: "pap", stage: S.PAP.id, variant: "standard" },
    { id: "fa", stage: S.FA.id, variant: "pap" },
    { id: "tp", stage: S.TP.id, variant: "standard" },
    { id: "ps", stage: S.PS.id, variant: "standard" },
  ],
};
