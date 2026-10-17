import { BRAND } from "@/brand";
import type { FlowType } from "@/engine/types";
import type { PatientPersona, ScenarioDefinition } from "@/engine/workflow/types";
import { ALL_SCENARIOS } from "./scenarios";

/** The patient every scenario starts with unless it overrides a field. All data is representative. */
export const DEFAULT_PERSONA: PatientPersona = {
  patientName: "Keanu Dixon",
  patientDob: "09/02/1964",
  rxNumber: "40002500",
  phone: "(555) 310-4200",
  email: "keanu.dixon@email.com",
  payer: "Commercial",
  caseNumber: "00056249",
  npi: "1234567890",
  deliveryAddress: "123 Main Street, Orlando, FL 32801",
  preferredMethodOfContact: "Text",
  gender: "Male",
  phoneType: "Cell",
  preferredLanguage: "English",
  householdSize: "2",
  householdIncome: "$62,000",
  memberId: "HQK883883ZZ88",
  rxBin: "003858",
  rxPcn: "A4",
  rxGroup: "RX4471",
  currentMedications: "Lisinopril 10mg once daily, Atorvastatin 20mg once daily",
  healthConditions: "Hypertension, Hyperlipidemia",
};

/**
 * The patient for a flow: the shared persona, then the scenario's overrides, then the drug from the brand.
 * The drug always comes from the brand, so a scenario cannot name one.
 */
export function personaFor(flowType: FlowType, scenarios: ScenarioDefinition<any>[] = ALL_SCENARIOS) {
  const override = scenarios.find((s) => s.flowType === flowType)?.patient;
  return {
    ...DEFAULT_PERSONA,
    ...override,
    drugName: BRAND.program.drugDisplayName || BRAND.program.name,
    dosageForm: BRAND.program.dosageForm ?? "",
  };
}
