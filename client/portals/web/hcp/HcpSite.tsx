/**
 * The client's HCP web site for the HCP enrollment scenario (mock). The HCP starts on the product page, opens Support
 * Services, taps Enroll Patient, picks a service, and completes the enrollment form. The submit sends HCP_ENROLL_SUBMIT,
 * which texts the patient. The patient then follows the link into the patient experience and consents there.
 *
 * Which page shows is local, except the last one: a reload or Reset All lands on the right page from the machine.
 */
import { useEffect, useRef, useState } from "react";
import { useScrollTopOnChange } from "@/hooks/useScrollTopOnChange";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useWorkflowDispatch, usePersonaState } from "@/engine/WorkflowProvider";
import { usePatientCase } from "@/hooks/usePatientCase";
import { START_OVER_EVENT } from "../events";
import { hcpSite, withPatient } from "./content";
import EnrollmentForm from "./EnrollmentForm";
import { primaryBtn } from "./fields";
import { SiteFooter, SiteHeader, type HcpPage } from "./SiteChrome";
import { ProductPage, ServicesPage, SupportPage } from "./SitePages";

/**
 * `submitEvent` is the event the form sends. The HCP enrollment scenario uses the default. `startOver` swaps the last page's button
 * for Start over, for a scenario that goes on to the patient's phone by its own steps (the same reset as Reset All).
 */
export default function HcpSite({ submitEvent = "HCP_ENROLL_SUBMIT", startOver = false }: { submitEvent?: string; startOver?: boolean }) {
  const dispatch = useWorkflowDispatch();
  const navigate = useNavigate();
  const { workflowData: w } = usePersonaState("patient");
  const { data: patient } = usePatientCase();
  const [page, setPage] = useState<HcpPage>(w.enrollmentStatus === "none" ? "product" : "submitted");
  useEffect(() => {
    if (w.enrollmentStatus === "none") setPage((p) => (p === "submitted" ? "product" : p));
  }, [w.enrollmentStatus]);

  const rootRef = useRef<HTMLDivElement>(null);
  useScrollTopOnChange(rootRef, page);

  function submit(npi: string) {
    dispatch(submitEvent, { portal: "patient", prescriberNpi: npi });
    setPage("submitted");
  }

  return (
    <div ref={rootRef} className="portal-patient flex h-full flex-col overflow-y-auto bg-arx-neutral-100 text-arx-neutral-800">
      <SiteHeader page={page} go={setPage} />
      <main className="flex-1">
        {page === "product" && <ProductPage onSupport={() => setPage("support")} />}
        {page === "support" && <SupportPage onEnroll={() => setPage("services")} />}
        {page === "services" && <ServicesPage onContinue={() => setPage("form")} onCancel={() => setPage("support")} />}
        {page === "form" && <EnrollmentForm onSubmit={submit} onCancel={() => setPage("services")} />}
        {page === "submitted" && (
          <div className="mx-auto max-w-xl px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-arx-success" />
            <h1 className="mb-3 text-3xl font-black text-arx-primary">Enrollment submitted</h1>
            <p className="mb-8 text-base text-arx-body-copy">{withPatient(hcpSite().submitted, patient.patientName.split(" ")[0])}</p>
            {/* The Patient tab's URL slug. Not imported from DemoShell, which imports this file's parent. */}
            <button type="button" className={primaryBtn} onClick={() => (startOver ? window.dispatchEvent(new Event(START_OVER_EVENT)) : navigate("/patient"))}>
              {startOver ? "Start over" : "Open the patient's phone"}
            </button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
