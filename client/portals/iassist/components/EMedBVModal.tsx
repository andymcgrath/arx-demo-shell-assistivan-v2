/**
 * EMedBVModal: the prices eMedBV found for a medical benefit (Buy and Bill). The Insurance step runs the request (a
 * short progress bar, then RUN_MEDBV) and opens this. Results are representative demo values, not a live payer
 * response.
 */
import { CheckCircle2, X } from "lucide-react";
import { usePatientStore } from "@/store/patientStore";
import { useCaseWizardStore } from "@/store/caseWizardStore";
import { MEDBV_RESULT as RESULT, money } from "../data/medbvResult";

function Bar({ label, limit, met }: { label: string; limit: number; met: number }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#1D1D1D]">{label} ({money(limit).replace(".00", "")})</p>
      <p className="text-xs text-[#6F7276] mb-1">Patient contribution: {money(met)}</p>
      <div className="h-2 rounded-full bg-[#E8E8E8] overflow-hidden">
        <div className="h-full bg-[#007178]" style={{ width: `${Math.min(100, (met / limit) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function EMedBVModal({ covered = true, onClose }: { covered?: boolean; onClose: () => void }) {
  const patientName = usePatientStore((s) => s.patientName);
  const insurance = useCaseWizardStore((s) => s.selectedInsurance);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Medical benefit verification results">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#6F7276] hover:text-[#1D1D1D]" aria-label="Close">
          <X size={20} />
        </button>

          {!covered ? (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-semibold text-[#1D1D1D]">Here is what we found</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[["Product", RESULT.product.code], ["Administration", RESULT.administration.code]].map(([label, code]) => (
                <div key={label} className="border border-[#D9D9D9] rounded-xl p-4">
                  <p className="text-sm text-[#6F7276]">Not covered</p>
                  <p className="text-sm font-semibold text-[#1D1D1D] mt-2">{label}, {code}</p>
                  <p className="text-xs mt-1 text-[#6F7276]">The medical benefit does not cover buy and bill for this service.</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#1D1D1D]">The patient may qualify for the free drug program. Submit the enrollment and the program will contact the patient.</p>
            <div className="text-sm text-[#1D1D1D] border-t border-[#F0F0F0] pt-4">
              <p className="font-semibold mb-1">Insurance</p>
              <p>{patientName}</p>
              <p className="text-[#6F7276]">{insurance?.payer ?? "Payer on file"}</p>
              <p className="text-xs text-[#6F7276] mt-2">Cardholder ID {insurance?.memberId ?? ""}</p>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="bg-[#007178] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-[#03656B]">Done</button>
            </div>
          </div>
          ) : (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-semibold text-[#1D1D1D]">Here are the prices we found</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-[#D9D9D9] rounded-xl p-4">
                <p className="text-sm text-[#6F7276] flex items-center gap-1"><CheckCircle2 size={14} className="text-[#007178]" /> Buy and bill covered</p>
                <p className="text-sm font-semibold text-[#1D1D1D] mt-2">Product, {RESULT.product.code}</p>
                <p className="text-3xl text-[#1D1D1D] my-1">{RESULT.product.coinsurance}</p>
                <p className="text-xs text-[#6F7276]">Coinsurance</p>
                <p className="text-xs mt-1 text-[#6F7276]">Prior authorization <span className="font-semibold text-[#D02B20]">Required</span></p>
              </div>
              <div className="border border-[#D9D9D9] rounded-xl p-4">
                <p className="text-sm text-[#6F7276] flex items-center gap-1"><CheckCircle2 size={14} className="text-[#007178]" /> Provider in network</p>
                <p className="text-sm font-semibold text-[#1D1D1D] mt-2">Administration, {RESULT.administration.code}</p>
                <p className="text-3xl text-[#1D1D1D] my-1">{RESULT.administration.copay}</p>
                <p className="text-xs text-[#6F7276]">Copay</p>
                <p className="text-xs mt-1 text-[#6F7276]">Prior authorization <span className="font-semibold text-[#007178]">Not required</span></p>
              </div>
            </div>
            <p className="text-xs text-[#999]">Pricing shown is an estimate, valid at the time of transaction, and subject to change.</p>

            <div className="border-t border-[#F0F0F0] pt-4 grid grid-cols-1 sm:grid-cols-[180px_1fr_1fr] gap-6">
              <div className="text-sm text-[#1D1D1D]">
                <p className="font-semibold mb-1">Insurance</p>
                <p>{patientName}</p>
                <p className="text-[#6F7276]">{insurance?.payer ?? "Payer on file"}</p>
                <p className="text-xs text-[#6F7276] mt-2">Cardholder ID {insurance?.memberId ?? ""}</p>
              </div>
              <div className="space-y-4">{RESULT.deductible.map((d) => <Bar key={d.label} {...d} />)}</div>
              <div className="space-y-4">{RESULT.oop.map((d) => <Bar key={d.label} {...d} />)}</div>
            </div>

            <div className="flex justify-end">
              <button onClick={onClose} className="bg-[#007178] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-[#03656B]">
                Done
              </button>
            </div>
          </div>
          )}
      </div>
    </div>
  );
}
