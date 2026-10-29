/**
 * CopayClaimModal: the HCP files a copay claim for the patient whose record is open. The patient is fixed, so there is
 * no patient search. Prescriber, date of service, then the CMS-1500 and EOB. Submit sends SUBMIT_COPAY_CLAIM, and a
 * success modal follows. The files never upload: the demo has no file service (see FileDropzone).
 */
import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { BRAND } from "@/brand";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PRESCRIBER_OPTIONS } from "@/store/caseWizardStore";
import { usePatientStore } from "@/store/patientStore";
import FileDropzone from "./FileDropzone";

const inputCls =
  "w-full rounded-lg border border-[#D9D9D9] px-3 py-2.5 text-sm text-[#1D1D1D] outline-none focus:ring-2 focus:ring-[#007178] focus:border-[#007178]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-[#6F7276] mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Copay claim">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#6F7276] hover:text-[#1D1D1D]" aria-label="Close"><X size={20} /></button>
        {children}
      </div>
    </div>
  );
}

export default function CopayClaimModal({ onClose: close }: { onClose: (submitted: boolean) => void }) {
  const dispatch = useWorkflowDispatch();
  const { patientName, patientDob } = usePatientStore();
  const [prescriber, setPrescriber] = useState(PRESCRIBER_OPTIONS[0].id);
  const [dateOfService, setDateOfService] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const canSubmit = !!dateOfService && files.length > 0;
  const onClose = () => close(submitted);

  function submit() {
    dispatch("SUBMIT_COPAY_CLAIM", { portal: "provider", dateOfService });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Shell onClose={onClose}>
        <div className="p-8 text-center space-y-3">
          <CheckCircle2 size={44} className="mx-auto text-[#007178]" />
          <h2 className="text-xl font-semibold text-[#1D1D1D]">Your copay claim was submitted</h2>
          <p className="text-sm text-[#6F7276]">
            The claim is in review. You can follow it in the copay transactions on the submission. We'll update its status when the program responds.
          </p>
          <button onClick={onClose} className="bg-[#007178] text-white px-8 py-2.5 rounded-full font-semibold text-sm hover:bg-[#03656B]">Done</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div className="p-8 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1D]">Copay Claim</h2>
          <p className="text-sm text-[#6F7276] mt-1">Please provide the following information to submit a claim.</p>
        </div>

        <div className="rounded-lg bg-[#F8F8F8] border border-[#E8E8E8] px-4 py-3 text-sm">
          <p className="text-[#6F7276]">Patient</p>
          <p className="font-semibold text-[#1D1D1D]">{patientName} <span className="font-normal text-[#6F7276]">DOB {patientDob}</span></p>
        </div>

        <Field label="Prescriber">
          <select value={prescriber} onChange={(e) => setPrescriber(e.target.value)} className={`${inputCls} appearance-none`}>
            {PRESCRIBER_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <div className="max-w-[220px]">
          <Field label="Date of Service">
            <input type="date" value={dateOfService} onChange={(e) => setDateOfService(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="border-t border-[#F0F0F0] pt-4 space-y-2">
          <h3 className="text-sm font-semibold text-[#1D1D1D]">Documents</h3>
          <p className="text-xs text-[#6F7276]">
            Please upload any relevant documents specifically for the {BRAND.manufacturer.name} program to get reimbursed (CMS-1500 form and the EOB).
          </p>
          <FileDropzone files={files} onChange={setFiles} sampleFiles={["CMS-1500.pdf", "EOB.pdf"]} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="bg-[#007178] text-white px-8 py-2.5 rounded-full font-semibold text-sm hover:bg-[#03656B] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit
          </button>
          {!canSubmit && (
            <p className="text-xs text-[#6F7276]">
              {!dateOfService && files.length === 0 ? "Add the date of service and a document to submit." : !dateOfService ? "Add the date of service to submit." : "Add a document to submit."}
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}
