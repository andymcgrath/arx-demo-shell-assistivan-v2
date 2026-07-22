/**
 * iAssist Dashboard — structural port of CoaDashboard (WF3's start/end
 * screen, wf3-coassist-v2 branch, client/portals/provider/index.tsx),
 * reskinned with iAssist teal instead of CoA's Heroic blue.
 *
 * wf4-iassist (this branch) forked from main before the CoaDashboard work
 * landed on wf3-coassist/wf3-coassist-v2, so none of that code existed here
 * — this is a port, not a rebuild from scratch. Structure matches exactly:
 * sidebar + header + a "Patients" table (name/DOB, medication, status dots
 * + a colored status pill). The earlier Figma-derived version of this file
 * (Medications section, Upcoming renewals list, floating chat button) has
 * been replaced — none of that exists in CoaDashboard.
 *
 * Only one roster row (Keanu Dixon) is backed by the live workflow actor,
 * same as CoA — everyone else is static decoy data from ../data/samplePatients.
 */
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { usePersonaState } from "@/engine/WorkflowProvider";
import { useNavigate } from "@/lib/portalRouter";
import type { WorkflowData } from "@/engine/types";
import { SAMPLE_PATIENTS, type PatientStatus } from "@/store/samplePatients";
import { useCaseWizardStore, MEDICATION_OPTIONS, MEDICATION_CODES } from "@/store/caseWizardStore";
import { StatusDots, StatusBadge } from "../components/StatusIndicators";
import IAssistSidebar, { IASSIST_TEAL } from "../components/IAssistSidebar";
import IAssistHeader from "../components/IAssistHeader";

// Commonly Prescribed row — a second, medication-first way to start a case
// (vs. the Patients table's patient-first way). Starting from here seeds
// the medication choice into caseWizardStore so it's already reflected by
// the time the wizard reaches Medication Details, instead of defaulting to
// whatever's first in the dropdown.
const COMMONLY_PRESCRIBED = [
  { medication: MEDICATION_OPTIONS[0], label: "Assistivan", color: IASSIST_TEAL },
  { medication: MEDICATION_OPTIONS[1], label: "ASSISTIMAB", color: "#2563EB" },
  { medication: MEDICATION_OPTIONS[3], label: "Voloxivan", color: "#7C3AED" },
];

// Ported from CoaDashboard's deriveKeanuStatus — reads only the generic
// WorkflowData fields (enrollmentStatus/pharmacyStatus/paStatus/biStatus)
// that iAssist.ts's machine sets identically to workflowMachine.ts/coaDtp.ts,
// so this logic is compatible with iAssist's actor unchanged.
function deriveActivePatientStatus(workflowData: WorkflowData): PatientStatus | null {
  if (workflowData.enrollmentStatus === "none") return null;

  if (workflowData.pharmacyStatus === "delivered") {
    return { label: "Delivered", color: "success", dots: ["completed", "completed", "completed", "completed", "completed", "completed"] };
  }
  if (workflowData.pharmacyStatus === "shipped" ||
      workflowData.pharmacyStatus === "processing" ||
      workflowData.pharmacyStatus === "ready") {
    return { label: "Dispensing", color: "warning", dots: ["completed", "completed", "completed", "completed", "pending", "disabled"] };
  }
  if (workflowData.paStatus === "approved") {
    return { label: "PA Approved", color: "success", dots: ["completed", "completed", "completed", "completed", "pending", "disabled"] };
  }
  if (workflowData.paStatus === "denied") {
    return { label: "PA Denied", color: "error", dots: ["completed", "completed", "completed", "attention", "disabled", "disabled"] };
  }
  if (workflowData.paStatus === "submitted") {
    return { label: "PA Submitted", color: "warning", dots: ["completed", "completed", "completed", "pending", "disabled", "disabled"] };
  }
  if (workflowData.biStatus === "complete") {
    return { label: "PA Required", color: "warning", dots: ["completed", "completed", "pending", "disabled", "disabled", "disabled"] };
  }
  return { label: "Enrolled", color: "warning", dots: ["completed", "pending", "disabled", "disabled", "disabled", "disabled"] };
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const resetCaseWizard = useCaseWizardStore((s) => s.resetCaseWizard);
  const setMedication = useCaseWizardStore((s) => s.setMedication);

  function openCaseWizard() {
    // Starting the wizard from a roster row is this demo's stand-in for
    // starting a new case — clear prior answers so they don't leak in.
    resetCaseWizard();
    navigate("/new-case/patient");
  }

  function startWithMedication(medication: string) {
    resetCaseWizard();
    const codes = MEDICATION_CODES[medication];
    setMedication({ medication, jcode: codes?.jcode ?? "", cptCode: codes?.cptCode ?? "" });
    // Medication-first entry doesn't know which patient yet — route through
    // the patient search screen instead of jumping straight to Step 1.
    navigate("/new-case/patient-search");
  }
  // "provider" persona id used only for tagging events dispatched from this
  // screen (there are none yet) — usePersonaState reads whichever actor is
  // currently active (iAssist's, since this only renders on WF4), so this
  // has no cross-workflow effect. Matches the tag CoaDashboard itself uses.
  const { workflowData } = usePersonaState("provider");
  const activeStatus = deriveActivePatientStatus(workflowData);

  const patients = SAMPLE_PATIENTS.map((p) =>
    p.id === "keanu-dixon" && activeStatus
      ? { ...p, hasActiveRx: true, status: activeStatus }
      : p
  );

  const query = searchQuery.trim().toLowerCase();
  const visiblePatients = query
    ? patients.filter(
        (p) => p.name.toLowerCase().includes(query) || p.dob.includes(query) || p.medication.toLowerCase().includes(query)
      )
    : patients.filter((p) => p.hasActiveRx);

  // Once Keanu has an active Rx, he surfaces at the top of the list.
  const sortedPatients = [...visiblePatients].sort((a, b) =>
    a.id === "keanu-dixon" ? -1 : b.id === "keanu-dixon" ? 1 : 0
  );

  return (
    <div className="iassist-portal min-h-screen bg-neutral-100 flex font-['Open_Sans']">
      <IAssistSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <IAssistHeader onSearchChange={setSearchQuery} />

        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-100">
          <h2 className="text-xl font-normal text-neutral-800 mb-4">Commonly Prescribed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {COMMONLY_PRESCRIBED.map((med) => (
              <div key={med.medication} className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between gap-3">
                <span className="text-lg font-bold" style={{ color: med.color }}>{med.label}</span>
                <button
                  type="button"
                  onClick={() => startWithMedication(med.medication)}
                  className="text-white text-sm font-semibold rounded-full pl-4 pr-3 py-2 flex items-center gap-1 hover:opacity-90 flex-shrink-0"
                  style={{ backgroundColor: med.color }}
                  aria-label={`Start a case for ${med.label}`}
                >
                  Start <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-normal text-neutral-800 mb-4">Patients</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="text-left p-4 font-bold text-neutral-600 text-sm">Patient</th>
                  <th className="text-left p-4 font-bold text-neutral-600 text-sm">Medication</th>
                  <th className="text-left p-4 font-bold text-neutral-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={openCaseWizard}
                    className="border-b border-neutral-300 last:border-b-0 hover:bg-[#EEF9F9] cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-bold text-sm text-neutral-800">{patient.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">DOB {patient.dob}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-neutral-800">{patient.medication}</p>
                    </td>
                    <td className="p-4">
                      {patient.status ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusDots dots={patient.status.dots} />
                          <StatusBadge status={patient.status.label} color={patient.status.color} />
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500">No Rx yet</p>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedPatients.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-sm text-neutral-500">
                      No patients found for "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
