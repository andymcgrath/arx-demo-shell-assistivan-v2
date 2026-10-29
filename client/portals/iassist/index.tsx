/**
 * iAssist Portal — Shell wrapper
 *
 * Wrapped in its own PortalRouter (the same lightweight in-portal router the
 * patient portal uses — see client/lib/portalRouter.tsx) so the eRx
 * case-creation wizard can live at its own path ("/new-case/patient", with
 * "/new-case/med-details" etc. to follow as later steps are built) without
 * touching the shell's top-level BrowserRouter or any other portal/workflow.
 */
import "./styles.css";
import { useEffect, useRef } from "react";
import { PortalRouter, Routes, Route, useNavigate } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import { useCaseWizardStore } from "@/store/caseWizardStore";
import Dashboard from "./pages/Dashboard";
import NewCasePatientSearch from "./pages/NewCasePatientSearch";
import NewCasePatient from "./pages/NewCasePatient";
import NewCaseMedication from "./pages/NewCaseMedication";
import NewCaseInsurance from "./pages/NewCaseInsurance";
import NewCaseClinical from "./pages/NewCaseClinical";
import NewCasePA from "./pages/NewCasePA";
import NewCaseRx from "./pages/NewCaseRx";
import NewCaseBuyAndBill from "./pages/NewCaseBuyAndBill";
import PatientRecord from "./pages/PatientRecord";
import PatientSubmission from "./pages/PatientSubmission";
import { useRecipeModule } from "@/hooks/useRecipeModule";

/** Step 6. A recipe with eMedBV (`benefit_verification`: Buy and Bill, with or without copay) replaces the Rx step with the Buy and Bill step. */
function RxStep() {
  return useRecipeModule("benefit_verification") ? <NewCaseBuyAndBill /> : <NewCaseRx />;
}

/**
 * Back to the dashboard on every Reset and every demo switch. This router keeps its own path, so without this the
 * portal stays on whatever screen the last run ended on (for example a patient record from the previous demo). The
 * case wizard answers clear too, so the next run starts from a blank form.
 */
function ResetToDashboard() {
  const navigate = useNavigate();
  const resetCaseWizard = useCaseWizardStore((s) => s.resetCaseWizard);
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const demoId = useDemoStore((s) => s.demoId);
  const flowType = useDemoStore((s) => s.flowType);
  const last = useRef(`${resetNonce}|${demoId}|${flowType}`);

  useEffect(() => {
    const key = `${resetNonce}|${demoId}|${flowType}`;
    if (key === last.current) return;
    last.current = key;
    resetCaseWizard();
    navigate("/");
  }, [resetNonce, demoId, flowType, navigate, resetCaseWizard]);

  return null;
}

export default function IAssistPortal() {
  return (
    <PortalRouter initialPath="/">
      <ResetToDashboard />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new-case/patient-search" element={<NewCasePatientSearch />} />
        <Route path="/new-case/patient" element={<NewCasePatient />} />
        <Route path="/new-case/medication" element={<NewCaseMedication />} />
        <Route path="/new-case/insurance" element={<NewCaseInsurance />} />
        <Route path="/new-case/clinical" element={<NewCaseClinical />} />
        <Route path="/new-case/pa" element={<NewCasePA />} />
        <Route path="/new-case/rx" element={<RxStep />} />
        <Route path="/patient" element={<PatientRecord />} />
        <Route path="/patient/submission" element={<PatientSubmission />} />
      </Routes>
    </PortalRouter>
  );
}
