import { SF_SECTION_BG, SF_BLUE, NOT_APPLICABLE } from "./SfPrimitives";
import { X } from "lucide-react";

interface ProductDetailModalProps {
  onClose: () => void;
  drugName: string;
  /** Fax or e-sign intake with no insurance found, so the product shows no coverage. */
  noPaIntake: boolean;
  payer: string;
}

export function ProductDetailModal({ onClose, drugName, noPaIntake, payer }: ProductDetailModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => onClose()} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white border border-[#dddbda] rounded shadow-xl" style={{ width: 600, maxHeight: "90vh" }}>
          <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded" style={{ width: 32, height: 32, background: "var(--crm-primary, #0070d2)" }}>
                <span className="text-white text-[12px] font-bold">PC</span>
              </div>
              <h2 className="text-[16px] font-semibold text-[#3e3e3c]">BIPC-0455</h2>
            </div>
            <button onClick={() => onClose()} className="p-1 hover:bg-[#f3f3f3] rounded">
              <X size={18} className="text-[#706e6b]" />
            </button>
          </div>

          <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 80px)" }}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PRODUCT</div>
                <div className="text-[13px] text-[#3e3e3c]">{drugName}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BI PRODUCT COVERAGE NAME</div>
                <div className="text-[13px] text-[#3e3e3c]">BIPC-0455</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PRODUCT COVERAGE STATUS</div>
                <div className="text-[13px] text-[#3e3e3c]">{noPaIntake ? "No Coverage" : "Covered"}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BENEFIT INVESTIGATION RESULT</div>
                <div className="text-[13px]" style={{ color: SF_BLUE }}>BIR-0431</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PA REQUIRED?</div>
                <div className="text-[13px] text-[#3e3e3c]">{noPaIntake ? NOT_APPLICABLE : "Yes"}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PAYER</div>
                <div className="text-[13px] text-[#3e3e3c]">{payer}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">CARE</div>
                <div className="text-[13px]" style={{ color: SF_BLUE }}>00001740</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PAYER TYPE</div>
                <div className="text-[13px] text-[#3e3e3c]">Commercial</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BENEFIT TYPE</div>
                <div className="text-[13px] text-[#3e3e3c]">Pharmacy</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">STATUS</div>
                <div className="text-[13px] text-[#3e3e3c]">Active</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">RANK</div>
                <div className="text-[13px] text-[#3e3e3c]">Primary</div>
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">INTERNAL COMMENTS</div>
                <div className="text-[13px] text-[#3e3e3c]">—</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
