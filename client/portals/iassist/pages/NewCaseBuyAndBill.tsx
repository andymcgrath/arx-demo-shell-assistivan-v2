/**
 * NewCaseBuyAndBill: Step 6 of the iAssist wizard when the scenario's recipe lists the `copay` module. It replaces the
 * Rx step. The HCP buys and bills the drug, so there is no prescription and no pharmacy. The step summarizes the
 * medication, lets the HCP enroll the patient in copay, and Submit sends the referral. The machine holds the referral
 * until eMedBV and copay are done (see workflows/iassist/modules/enrollment.ts), so Submit waits on both.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch, usePersonaState } from "@/engine/WorkflowProvider";
import { useCaseWizardStore, prescriberNameById } from "@/store/caseWizardStore";
import { usePatientStore } from "@/store/patientStore";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";
import CopayCard from "../components/CopayCard";
import { useRecipeModule } from "@/hooks/useRecipeModule";
import { SITES_OF_CARE, siteAddress, siteByName } from "../data/sitesOfCare";
import { indicationSummary } from "@/brand/indication";

/** Representative NDC for the demo medication. The diagnosis comes from the Clinical step (the brand's indication). */
const NDC = "123456789";

const inputCls =
  "w-full rounded-lg border border-[#D9D9D9] px-3 py-2.5 text-sm text-[#1D1D1D] outline-none focus:ring-2 focus:ring-[#007178] focus:border-[#007178]";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 text-sm">
      <span className="text-[#6F7276] w-full sm:w-56 flex-shrink-0">{label}</span>
      <span className="font-semibold text-[#1D1D1D]">{value}</span>
    </div>
  );
}

const card = { boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" };

export default function NewCaseBuyAndBill() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState("provider");
  const patient = useCaseWizardStore((s) => s.patient);
  const rx = useCaseWizardStore((s) => s.rx);
  const clinical = useCaseWizardStore((s) => s.clinical);
  const medication = useCaseWizardStore((s) => s.medication);
  const setRx = useCaseWizardStore((s) => s.setRx);
  const resetCaseWizard = useCaseWizardStore((s) => s.resetCaseWizard);
  const drugName = usePatientStore((s) => s.drugName);
  const dosageForm = usePatientStore((s) => s.dosageForm);
  const [supplies, setSupplies] = useState(true);

  const prescriber = `1234567890, ${prescriberNameById(patient.prescriber) || "Sarah Chen, MD"}`;
  const medicationName = `${drugName.toUpperCase()} ${dosageForm}`.trim();
  const medbvDone = workflowData.medbvStatus === "complete";
  const copayEnrolled = workflowData.copayEnrolled;
  // Free drug (PAP) has no copay: the recipe does not list the module, so there is nothing to enroll.
  const hasCopay = !!useRecipeModule("copay");
  const canSubmit = medbvDone && (copayEnrolled || !hasCopay);
  // One diagnosis everywhere: the Clinical step's pick, which starts on the brand's indication.
  const diagnosis = clinical.selectedIcd ? clinical.selectedIcd.replace(" — ", ": ") : indicationSummary() ?? "Not selected";
  // The office is a site of care from the Medication step. It starts on the one picked there.
  const office = siteByName(rx.submittingOffice) ? rx.submittingOffice : siteByName(medication.siteOfCare) ? medication.siteOfCare : SITES_OF_CARE[0].name;
  const officeSite = siteByName(office) ?? SITES_OF_CARE[0];

  function submit() {
    dispatch("REFERRAL_RECEIVED", { portal: "provider" });
    resetCaseWizard();
    navigate("/patient");
  }

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={6} lastLabel="Buy and Bill" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <IAssistLogo className="h-6 w-auto hidden sm:block" />
            <button onClick={() => navigate("/")} className="text-[#6F7276] hover:text-[#1D1D1D] focus:outline-none" aria-label="Close and return to dashboard">
              <X size={20} />
            </button>
            <h1 className="text-xl font-semibold text-[#1D1D1D]">Buy and Bill Information</h1>
          </div>
          <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-4 py-1.5 hover:bg-[#EEF9F9]">Save Draft</button>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <section className="bg-white rounded-xl p-6 space-y-2.5" style={card}>
              <SummaryRow label="Prescriber" value={prescriber} />
              <SummaryRow label="Medication Name" value={medicationName} />
              <SummaryRow label="NDC" value={NDC} />
              <SummaryRow label="ICD-10 Code with Diagnosis" value={diagnosis} />
            </section>

            <section className="bg-white rounded-xl p-6 space-y-3" style={card}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Ancillary Supplies</h2>
              <label className="flex items-center gap-2 text-sm text-[#1D1D1D]">
                <input type="checkbox" checked={supplies} onChange={(e) => setSupplies(e.target.checked)} className="accent-[#007178]" />
                Injection supplies (syringe, needle, alcohol swabs)
              </label>
            </section>

            <section className="bg-white rounded-xl p-6 space-y-4" style={card}>
              <label className="block">
                <span className="text-sm font-semibold text-[#1D1D1D] mb-1.5 block">Which office are you submitting this on behalf of?</span>
                <select value={office} onChange={(e) => setRx({ submittingOffice: e.target.value })} className={`${inputCls} appearance-none`}>
                  {SITES_OF_CARE.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </label>
              <div className="text-sm text-[#1D1D1D]">
                <p className="font-semibold mb-1">Office address</p>
                <p className="text-[#6F7276]">{siteAddress(officeSite)}</p>
              </div>
            </section>

            {hasCopay && (
            <section className="bg-white rounded-xl p-6 space-y-3" style={card}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Benefits Information</h2>
              <CopayCard enrolled={copayEnrolled} onEnroll={medbvDone ? () => dispatch("ENROLL_COPAY", { portal: "provider" }) : undefined} defaultOpen />
              {!medbvDone && <p className="text-xs text-[#6F7276]">Run eMedBV on the Insurance step before enrolling in copay.</p>}
            </section>
            )}

            <div className="flex justify-between pb-8">
              <button
                onClick={() => navigate("/new-case/pa")}
                className="text-sm font-semibold text-[#6F7276] border border-[#D9D9D9] rounded-full px-6 py-3 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                title={canSubmit ? undefined : hasCopay ? "Run eMedBV and enroll the patient in copay first" : "Run eMedBV first"}
                className="bg-[#007178] text-white px-8 py-3 rounded-full font-semibold text-base hover:bg-[#03656B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
