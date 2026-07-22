/**
 * Sample Patients — shared roster for read-only dashboard demos.
 *
 * This is NOT the active patient identity used by live flow screens (that's
 * usePatientStore, a single Keanu Dixon record shared across every portal).
 * This is a decoy roster for dashboards that need to *look* like a real
 * caseload — e.g. a "Patients" table you can search/filter — while only one
 * entry (Keanu Dixon) is actually wired to the rest of the demo.
 *
 * Keanu Dixon here intentionally matches PATIENT_SEED in patientStore.ts
 * (same DOB, same drug) so search results and the record you click through
 * agree with each other. Decoy names/medications/statuses are reused from
 * the WF4 IAssistDashboard roster (client/portals/provider/index.tsx) for
 * visual consistency across dashboards — that file's own local list is left
 * untouched on purpose, so this doesn't risk changing WF4's appearance.
 *
 * "medication" here means the drug (e.g. Assistivan) — not to be confused
 * with CoAssist, which is the dispensing pharmacy, not a medication.
 *
 * hasActiveRx: false means "known patient, no prescription on file yet."
 * Keanu starts this way in WF3 — he's the patient whose eRx CoaRxForm is
 * about to create — so dashboards should hide him from the default (active
 * only) view but still surface him by name/DOB search.
 */

export type PatientDotState = "completed" | "pending" | "attention" | "disabled";

export interface PatientStatus {
  label: string;
  color: "success" | "warning" | "error";
  dots: PatientDotState[];
}

export interface SamplePatient {
  id: string;
  name: string;
  dob: string;
  medication: string;
  hasActiveRx: boolean;
  status?: PatientStatus;
}

export const SAMPLE_PATIENTS: SamplePatient[] = [
  {
    id: "keanu-dixon",
    name: "Keanu Dixon",
    dob: "09/02/1964",
    medication: "Assistivan",
    hasActiveRx: false,
  },
  {
    id: "laura-olson",
    name: "Laura Olson",
    dob: "04/10/1950",
    medication: "Assistivan",
    hasActiveRx: true,
    status: { label: "PA Questions", color: "warning", dots: ["completed", "completed", "completed", "attention", "disabled", "disabled"] },
  },
  {
    id: "bob-smith",
    name: "Bob Smith",
    dob: "04/10/1950",
    medication: "Assistimab",
    hasActiveRx: true,
    status: { label: "Finish Draft", color: "warning", dots: ["completed", "completed", "pending", "disabled", "disabled", "disabled"] },
  },
  {
    id: "jerry-hermiston",
    name: "Jerry Hermiston",
    dob: "04/10/1950",
    medication: "Ramoni",
    hasActiveRx: true,
    status: { label: "PA Denied", color: "error", dots: ["completed", "completed", "completed", "completed", "attention", "disabled"] },
  },
  {
    id: "edward-sanders",
    name: "Edward Sanders",
    dob: "04/10/1950",
    medication: "Assistimab",
    hasActiveRx: true,
    status: { label: "Finish Draft", color: "warning", dots: ["completed", "completed", "pending", "disabled", "disabled", "disabled"] },
  },
  {
    id: "anna-lee",
    name: "Anna Lee",
    dob: "04/10/1950",
    medication: "Ramoni",
    hasActiveRx: true,
    status: { label: "Complete", color: "success", dots: ["completed", "completed", "completed", "completed", "completed", "completed"] },
  },
  {
    id: "eric-herr",
    name: "Eric Herr",
    dob: "04/10/1950",
    medication: "Assistivan",
    hasActiveRx: true,
    status: { label: "Complete", color: "success", dots: ["completed", "completed", "completed", "completed", "completed", "completed"] },
  },
  {
    id: "katherine-johnson",
    name: "Katherine Johnson",
    dob: "04/10/1950",
    medication: "Assistivan",
    hasActiveRx: true,
    status: { label: "Complete", color: "success", dots: ["completed", "completed", "completed", "completed", "completed", "completed"] },
  },
  {
    id: "donna-rossman",
    name: "Donna Rossman",
    dob: "04/10/1950",
    medication: "Assistimab",
    hasActiveRx: true,
    status: { label: "Complete", color: "success", dots: ["completed", "completed", "completed", "completed", "completed", "completed"] },
  },
];
