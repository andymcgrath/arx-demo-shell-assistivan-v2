import type { WorkflowData } from "@/engine/types";
import { scenarioHasModule } from "@/workflows/scenarios";
import { scenarioFacts } from "@/workflows/scenarioFacts";

/** The scenario flags the CRM page and its stage list depend on. */
export interface CrmStageFlags {
  /** Fax or esign intake with no PA. PrES_PAP counts, so the CRM renders it like Fax_PAP_Audit. Its own capture happens in the Provider and Patient portals. */
  isPapFlow: boolean;
  /** DTP and Copay. The pricing fork. */
  isCoaFlow: boolean;
  /** Medical-benefit coverage: no PA, pricing or fulfillment. Deliberately not part of `isCoaFlow`. */
  isCoverageFlow: boolean;
  /** Only changes the Enrollment Assistance copy ("Welcome message sent"). */
  isIAssistFlow: boolean;
  /** The drug goes to a site of care, not a pharmacy shipment: the appeal scenario and the free drug program. */
  isIAssistPapFlow: boolean;
  /** Free drug (Buy and Bill PAP): `financial_assistance` with eMedBV. Like the appeal scenario, it uses the site-of-care screens. */
  isFreeDrug: boolean;
  /** The recipe's `copay` module: a four-stage list, no appeals, triage or order stages. */
  isBuyAndBill: boolean;
  /** Copay retail and mail order. Filled outside AssistRx's pipeline, so Triage to Pharmacy is the last stage and Pharmacy Status is dropped. */
  isCopayRetailFlow: boolean;
  /** Coverage scenario 1: the patient picks a network pharmacy (pricingOption "retail"). Same reasoning as `isCopayRetailFlow`. */
  isCoverageRetailFlow: boolean;
  /** Copay retail and mail order skip ship-date collection, so the pick alone ends scheduling. */
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
