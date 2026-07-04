/**
 * Sample Patients — shared roster for read-only dashboard demos.
 *
 * This is NOT the active patient identity used by live flow screens (that's
 * usePatientStore, a single Keanu Reeves record shared across every portal).
 * This is a decoy roster for dashboards that need to *look* like a real
 * caseload — e.g. a "Patients" table you can search/filter — while only one
 * entry (Keanu Reeves) is actually wired to the rest of the demo.
 *
 * Keanu Reeves here intentionally matches PATIENT_SEED in patientStore.ts
 * (same DOB, same drug) so search results and the record you click through
 * agree with each other. Decoy names/medications are reused from the WF4
 * IAssistDashboard roster (client/portals/provider/index.tsx) for visual
 * consistency across dashboards — that file's own local list is left
 * untouched on purpose, so this doesn't risk changing WF4's appearance.
 */

export interface SamplePatient {
  id: string;
  name: string;
  dob: string;
  medication: string;
}

export const SAMPLE_PATIENTS: SamplePatient[] = [
  { id: "keanu-reeves", name: "Keanu Reeves", dob: "09/02/1964", medication: "Assistivan" },
  { id: "laura-olson", name: "Laura Olson", dob: "04/10/1950", medication: "Assistivan" },
  { id: "bob-smith", name: "Bob Smith", dob: "04/10/1950", medication: "Assistimab" },
  { id: "jerry-hermiston", name: "Jerry Hermiston", dob: "04/10/1950", medication: "Ramoni" },
  { id: "edward-sanders", name: "Edward Sanders", dob: "04/10/1950", medication: "Assistimab" },
  { id: "anna-lee", name: "Anna Lee", dob: "04/10/1950", medication: "Ramoni" },
  { id: "eric-herr", name: "Eric Herr", dob: "04/10/1950", medication: "Assistivan" },
  { id: "katherine-johnson", name: "Katherine Johnson", dob: "04/10/1950", medication: "Assistivan" },
  { id: "donna-rossman", name: "Donna Rossman", dob: "04/10/1950", medication: "Assistimab" },
];
