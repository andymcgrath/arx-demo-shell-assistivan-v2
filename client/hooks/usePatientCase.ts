/**
 * usePatientCase — CRM bridge hook
 *
 * Drop-in replacement for arx-prototype-crm's usePatientCase.ts
 * Returns the same PatientCase shape. Patient identity data comes from patientStore,
 * while workflow progression state comes from the XState actor via usePersonaState.
 */
import { usePatientStore } from "@/store/patientStore";
import { usePersonaState } from "@/engine/WorkflowProvider";

export interface PatientCase {
  caseId: string;
  patientName: string;
  phone: string;
  email: string;
  consentStatus: "pending" | "captured" | "revoked";
  deliveryAddress: string;
  shippingAddress: string;
  workflowStep: number;
  paPhone: string;
  stage: string;
  // Extended fields used in CRM views
  patientDob: string;
  drugName: string;
  rxNumber: string;
  payer: string;
  npi: string;
  paStatus: string;
  biStatus: string;
  pharmacyStatus: string;
  flowType: string;
}

/** Maps consent status to CRM-style consentStatus */
function mapConsent(s: string): PatientCase["consentStatus"] {
  if (s === "confirmed") return "captured";
  if (s === "declined") return "revoked";
  return "pending";
}

/** Maps workflowStep → Salesforce-style stage label */
function mapStage(step: number): string {
  return (
    [
      "",
      "Referral Received",
      "Patient Enrolled",
      "Authorization Pending",
      "Authorization Complete",
      "Rx Processing",
      "Rx Delivered",
      "Rx Delivered",
    ][step] ?? "Unknown"
  );
}

export function usePatientCase(_caseId?: string) {
  // Patient identity data — from patientStore
  const patient = usePatientStore();

  // Workflow progression state — from XState actor
  const workflowState = usePersonaState("crm");
  const w = workflowState.workflowData;

  // Compute workflowStep from workflowData
  const workflowStep = (() => {
    const p = w.pharmacyStatus;
    const d = w.dispatchStatus;
    const pa = w.paStatus;
    const bi = w.biStatus;
    const consent = w.consentStatus;
    const enrollment = w.enrollmentStatus;

    if (p === 'delivered') return 9;
    if (p === 'shipped') return 7;
    if (p === 'processing' || p === 'ready') return 6;
    if (d === 'pending_selection' || d === 'selected' || d === 'dispatched') return 5;
    if (pa === 'approved') return 5;
    if (pa === 'submitted' || pa === 'denied') return 4;
    if (bi === 'running' || bi === 'submitted') return 3;
    if (bi === 'complete') return 4;
    if (consent === 'confirmed' || enrollment === 'enrolled') return 2;
    return 1;
  })();

  const data: PatientCase = {
    // Identity fields from patientStore
    caseId:          patient.caseNumber,
    patientName:     patient.patientName,
    phone:           patient.phone,
    email:           patient.email,
    deliveryAddress: patient.deliveryAddress,
    shippingAddress: patient.deliveryAddress,
    patientDob:      patient.patientDob,
    drugName:        patient.drugName,
    rxNumber:        patient.rxNumber,
    payer:           patient.payer,
    npi:             patient.npi,

    // Workflow progression fields from XState actor
    paStatus:        w.paStatus,
    biStatus:        w.biStatus,
    pharmacyStatus:  w.pharmacyStatus,
    flowType:        w.flowType,

    // Derived fields from workflowData
    consentStatus:   mapConsent(w.consentStatus),
    workflowStep:    workflowStep,
    paPhone:         "(407) 885-9999",
    stage:           mapStage(workflowStep),
  };

  return {
    data,
    isLoading: false,
    isError: false,
  };
}
