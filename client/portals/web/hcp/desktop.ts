/** Whether the client's web page shows as a desktop site (the HCP's) or in the phone frame (the patient's). Pure, so the shell and the page agree. */
import type { WorkflowData } from "@/engine/types";
import { scenarioFacts } from "@/workflows/scenarioFacts";

/**
 * The HCP enrollment page is a desktop site. A scenario where the HCP enrolls and the patient then authorizes on the same page
 * (`hcp_patient`) is a desktop site until the patient consents, then a mobile page in the phone frame.
 */
export function webIsDesktopSite(flowType: string, d: Pick<WorkflowData, "consentStatus">): boolean {
  const facts = scenarioFacts(flowType);
  return facts.isHcpEnrollment || (facts.isHcpThenPatient && d.consentStatus !== "confirmed");
}
