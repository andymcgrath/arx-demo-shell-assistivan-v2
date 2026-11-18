/**
 * What a scenario changes about its documents. The CRM and the Field portal both call this, so they pass the same
 * options to `caseDocuments()` and show the same list.
 */
import type { CaseDocumentOptions } from "@/brand/caseDocuments";
import { scenarioFacts } from "./scenarioFacts";
import { scenarioHasModule } from "./scenarios";

export function caseDocumentOptions(flowType: string): CaseDocumentOptions {
  const facts = scenarioFacts(flowType);
  return {
    freeDrug: scenarioHasModule(flowType, "financial_assistance"),
    fax: facts.isFax,
    // An HCP-administered case: the HCP runs eMedBV in iAssist and submits the enrollment.
    hcp: scenarioHasModule(flowType, "benefit_verification"),
  };
}
