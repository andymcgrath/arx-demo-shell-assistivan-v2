/**
 * Sample Patients — decoy roster for the iAssist dashboard.
 *
 * Ported from client/store/samplePatients.ts on the wf3-coassist-v2 branch
 * (CoaDashboard's roster), which itself borrowed these names/medications
 * from an earlier WF4 IAssistDashboard draft — so this is the data coming
 * back to where it started, structurally. Kept as an iAssist-scoped copy
 * rather than a shared client/store/ file so WF3 and WF4 can each evolve
 * their own roster without coupling one workflow's changes to the other's
 * dashboard — the same isolation principle client/workflows/iAssist.ts
 * follows by cloning workflowMachine.ts instead of sharing it.
 *
 * This is NOT the active patient identity used by live flow screens (that's
 * usePatientStore, a single "Keanu Reeves" record shared across every
 * portal/workflow in this demo). This is a decoy roster for a dashboard that
 * needs to *look* like a real caseload — a "Patients" table you can
 * search/filter — while only one entry (Keanu Reeves) is actually wired to
 * the rest of the demo via the active workflow actor.
 *
 * "medication" here means the drug (e.g. Assistivan) — not to be confused
 * with iAssist, which is the platform, not a medication.
 *
 * hasActiveRx: false means "known patient, no prescription on file yet."
 * Keanu starts this way — he's the patient the case-creation wizard is
 * about to create an eRx for — so the dashboard hides him from the default
 * (active only) view but still surfaces him by name/DOB search.
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
    id: "keanu-reeves",
    name: "Keanu Reeves",
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
