import type { WorkflowData } from "@/engine/types";
import { scenarioHasModule } from "@/workflows/scenarios";
import { scenarioFacts } from "@/workflows/scenarioFacts";

/** The scenario flags the CRM page and its stage list depend on. */
export interface CrmStageFlags {
  isPapFlow: boolean;
  isCoaFlow: boolean;
  isCoverageFlow: boolean;
  isIAssistFlow: boolean;
  isIAssistPapFlow: boolean;
  isFreeDrug: boolean;
  isBuyAndBill: boolean;
  isCopayRetailFlow: boolean;
  isCoverageRetailFlow: boolean;
  schedulingDone: boolean;
}

/**
 * The flags, read from the scenario definition (workflows/scenarioFacts.ts) and the workflow data. The names are the
 * page's own. `isCoaFlow` is the pricing-fork scenarios (DTP and Copay), not every CoAssist scenario.
 */
export function crmFlags(workflowData: WorkflowData): CrmStageFlags & { isFaxFlow: boolean } {
  const flowType = workflowData.flowType;
  const f = scenarioFacts(flowType);
  const isCopayRetailFlow = f.isCopayRetail(workflowData.pricingOption);
  return {
    isFaxFlow: f.isFax,
    isPapFlow: f.isNoPaIntake,
    isCoaFlow: f.hasPricingFork,
    isCoverageFlow: f.isCoverageScenario,
    isIAssistFlow: f.isIassistSource,
    isIAssistPapFlow: f.dispensesAtSiteOfCare,
    isFreeDrug: f.isFreeDrug,
    isBuyAndBill: scenarioHasModule(flowType, "copay"),
    isCopayRetailFlow,
    // Scenario 1 of the coverage scenario: the pharmacy benefit covers, the medical benefit does not, and the patient picked retail.
    isCoverageRetailFlow:
      f.isCoverageScenario &&
      workflowData.pharmacyBenefitStatus === "covered" &&
      workflowData.medicalBenefitStatus !== "covered" &&
      workflowData.pricingOption === "retail",
    // Copay retail and mail order skip ship-date collection, so the pick alone ends scheduling.
    schedulingDone: isCopayRetailFlow || workflowData.patientShipDate !== null,
  };
}
