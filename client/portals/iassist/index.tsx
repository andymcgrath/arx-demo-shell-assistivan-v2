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
import { PortalRouter, Routes, Route } from "@/lib/portalRouter";
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

export default function IAssistPortal() {
  return (
    <PortalRouter initialPath="/">
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
