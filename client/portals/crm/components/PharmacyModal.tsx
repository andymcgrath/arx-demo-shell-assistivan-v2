import { useState } from "react";
import type { PharmacyOption } from "../caseData";
import { SF_SECTION_BG } from "./SfPrimitives";
import { X } from "lucide-react";
import { FC_BLUE } from "./SfControls";

type PharmacyType = "preferred" | "payer" | "program" | "dispenser";

interface PharmacyModalProps {
  /** Pharmacies the preferred, payer and program dropdowns offer. */
  pharmacyOptions: PharmacyOption[];
  /** What the Office Dispense dropdown offers: sites of care where the drug is given at one, else the pharmacies. */
  officeDispenseOptions: PharmacyOption[];
  dispensesAtSiteOfCare: boolean;
  onSelect: (pharmacy: PharmacyOption) => void;
  onClose: () => void;
}

/** The agent's triage pharmacy pick. The picks live here, so closing the modal clears them. */
export function PharmacyModal({ pharmacyOptions, officeDispenseOptions, dispensesAtSiteOfCare, onSelect, onClose }: PharmacyModalProps) {
  const [selectedPharmacyType, setSelectedPharmacyType] = useState<PharmacyType | null>(null);
  const [preferredPharmacy, setPreferredPharmacy] = useState<PharmacyOption | null>(null);
  const [payerPharmacy, setPayerPharmacy] = useState<PharmacyOption | null>(null);
  const [programPharmacy, setProgramPharmacy] = useState<PharmacyOption | null>(null);
  const [dispenserPharmacy, setDispenserPharmacy] = useState<PharmacyOption | null>(null);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => {
        onClose();
      }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white border border-[#dddbda] rounded shadow-xl" style={{ width: 600, maxHeight: "80vh" }}>
          <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
            <h2 className="text-[16px] font-semibold text-[#3e3e3c]">Select Triage Pharmacy</h2>
            <button onClick={() => {
              onClose();
            }} className="p-1 hover:bg-[#f3f3f3] rounded">
              <X size={18} className="text-[#706e6b]" />
            </button>
          </div>

          <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: "calc(80vh - 80px)" }}>
            <div>
              <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Patient Preferred Pharmacy</label>
              <select
                className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                disabled={selectedPharmacyType !== null && selectedPharmacyType !== "preferred"}
                onChange={(e) => {
                  if (e.target.value) {
                    const pharm = pharmacyOptions.find(p => p.name === e.target.value);
                    if (pharm) {
                      setPreferredPharmacy(pharm);
                      setPayerPharmacy(null);
                      setProgramPharmacy(null);
                      setDispenserPharmacy(null);
                      setSelectedPharmacyType("preferred");
                    }
                  } else {
                    setPreferredPharmacy(null);
                    if (selectedPharmacyType === "preferred") setSelectedPharmacyType(null);
                  }
                }}
                value={preferredPharmacy?.name || ""}
              >
                <option value="">Select...</option>
                {pharmacyOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Payer Mandated Pharmacy</label>
              <select
                className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                disabled={selectedPharmacyType !== null && selectedPharmacyType !== "payer"}
                onChange={(e) => {
                  if (e.target.value) {
                    const pharm = pharmacyOptions.find(p => p.name === e.target.value);
                    if (pharm) {
                      setPayerPharmacy(pharm);
                      setPreferredPharmacy(null);
                      setProgramPharmacy(null);
                      setDispenserPharmacy(null);
                      setSelectedPharmacyType("payer");
                    }
                  } else {
                    setPayerPharmacy(null);
                    if (selectedPharmacyType === "payer") setSelectedPharmacyType(null);
                  }
                }}
                value={payerPharmacy?.name || ""}
              >
                <option value="">Select...</option>
                {pharmacyOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Program Mandated Pharmacy</label>
              <select
                className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                disabled={selectedPharmacyType !== null && selectedPharmacyType !== "program"}
                onChange={(e) => {
                  if (e.target.value) {
                    const pharm = pharmacyOptions.find(p => p.name === e.target.value);
                    if (pharm) {
                      setProgramPharmacy(pharm);
                      setPreferredPharmacy(null);
                      setPayerPharmacy(null);
                      setDispenserPharmacy(null);
                      setSelectedPharmacyType("program");
                    }
                  } else {
                    setProgramPharmacy(null);
                    if (selectedPharmacyType === "program") setSelectedPharmacyType(null);
                  }
                }}
                value={programPharmacy?.name || ""}
              >
                <option value="">Select...</option>
                {pharmacyOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">
                {dispensesAtSiteOfCare ? "Office Dispense — Site of Care" : "Office Dispense"}
              </label>
              <select
                className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                disabled={selectedPharmacyType !== null && selectedPharmacyType !== "dispenser"}
                onChange={(e) => {
                  if (e.target.value) {
                    const pharm = officeDispenseOptions.find(p => p.name === e.target.value);
                    if (pharm) {
                      setDispenserPharmacy(pharm);
                      setPreferredPharmacy(null);
                      setPayerPharmacy(null);
                      setProgramPharmacy(null);
                      setSelectedPharmacyType("dispenser");
                    }
                  } else {
                    setDispenserPharmacy(null);
                    if (selectedPharmacyType === "dispenser") setSelectedPharmacyType(null);
                  }
                }}
                value={dispenserPharmacy?.name || ""}
              >
                <option value="">Select...</option>
                {officeDispenseOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
            <button
              onClick={() => {
                onClose();
              }}
              className="px-4 py-2 border border-[#dddbda] rounded text-[13px] font-semibold text-[#3e3e3c] hover:bg-[#f3f3f3] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const selected = preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy;
                if (selected) {
                  onSelect(selected);
                  onClose();
                }
              }}
              className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: FC_BLUE, opacity: (preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy) ? 1 : 0.5 }}
              disabled={!(preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy)}
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
