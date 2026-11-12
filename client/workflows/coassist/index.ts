import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { COASSIST_FORKS } from "./forks";
import { COASSIST_RULES } from "./rules";
import { COA_COPAY, COA_COVERAGE, COA_DTP, COA_MEDICAL_TRANSFER, COA_PAP, COA_WEB_COPAY, COA_HCP_ENROLL, COA_APA_SPECIALTY, COA_APA_ASSISTANCE, COA_WEB_PAP } from "./scenarios";

/** CoAssist: one machine for CoA_DTP, CoA_Copay, CoA_Web_Copay, CoA_Coverage, CoA_Medical_Transfer, and CoA_PAP. The scenario arrives as `input: { flowType }`. */
export const coassistMachine = createWorkflowMachine({
  id: "coassist",
  defaultFlowType: "CoA_DTP",
  rules: COASSIST_RULES,
  forks: COASSIST_FORKS,
  scenarios: {
    CoA_DTP: COA_DTP,
    CoA_Copay: COA_COPAY,
    CoA_Web_Copay: COA_WEB_COPAY,
    CoA_HCP_Enroll: COA_HCP_ENROLL,
    CoA_Coverage: COA_COVERAGE,
    CoA_Medical_Transfer: COA_MEDICAL_TRANSFER,
    CoA_PAP: COA_PAP,
    CoA_APA_Specialty: COA_APA_SPECIALTY,
    CoA_APA_Assistance: COA_APA_ASSISTANCE,
    CoA_Web_PAP: COA_WEB_PAP,
  },
});
