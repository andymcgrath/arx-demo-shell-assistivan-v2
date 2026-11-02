/**
 * What a few manual events need besides their type. The CRM and provider apps collect it from a person: the Triage tab
 * picks the pharmacy, the claim form asks for a date of service. The Trigger panel offers the same choices. This is the
 * one place that says which events need what. The rules read the payload inside their own functions, so the definition
 * cannot list it.
 */
import type { Pharmacy, WorkflowData } from "@/engine/types";
import { ARX_PHARMACY, SITES_OF_CARE, SPECIALTY_PHARMACIES } from "@/portals/crm/caseData";
import { scenarioFacts } from "@/workflows/scenarioFacts";

export type PayloadField =
  | { key: "pharmacy"; label: string; options: Pharmacy[] }
  | { key: "dateOfService"; label: string };

/** The pharmacies the CRM Triage tab offers for this scenario. */
function pharmacyChoices(data: WorkflowData): Pharmacy[] {
  const facts = scenarioFacts(data.flowType);
  const pharmacies = facts.isNoPaIntake ? [...SPECIALTY_PHARMACIES, ARX_PHARMACY] : SPECIALTY_PHARMACIES;
  return facts.dispensesAtSiteOfCare ? SITES_OF_CARE : pharmacies;
}

/** The inputs an event needs, in the order to show them. Empty for an event that carries nothing. */
export function payloadFields(event: string, data: WorkflowData): PayloadField[] {
  switch (event) {
    case "SELECT_PHARMACY":
      return [{ key: "pharmacy", label: "Pharmacy", options: pharmacyChoices(data) }];
    case "SUBMIT_COPAY_CLAIM":
      return [{ key: "dateOfService", label: "Date of service" }];
    default:
      return [];
  }
}

/** A payload that works with no choice made: the first pharmacy, today's date. */
export function defaultPayload(event: string, data: WorkflowData): Record<string, unknown> {
  // The Rules portal's "Initiate appeal on PA denial" switch, turned on.
  if (event === "SET_APPEAL_RULE") return { active: true };
  return Object.fromEntries(
    payloadFields(event, data).map((f) => [f.key, f.key === "pharmacy" ? f.options[0] : new Date().toISOString().slice(0, 10)]),
  );
}
