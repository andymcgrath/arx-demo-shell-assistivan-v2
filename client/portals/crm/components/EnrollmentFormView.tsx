import { FileText } from "lucide-react";
import { enrollmentFormDocument } from "@/brand/documents";
import { daysFromToday, dateFromToday } from "@/lib/relativeDate";
import { FieldRow } from "./SfPrimitives";

interface EnrollmentFormViewProps {
  patientName: string;
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  phone: string;
  deliveryAddressStreet: string;
  deliveryAddressCityStateZip: string;
  patientEmail: string;
  drugName: string;
  dosageForm: string;
  npi: string;
}

export function EnrollmentFormView({ patientName, patientFirstName, patientLastName, patientDob, phone, deliveryAddressStreet, deliveryAddressCityStateZip, patientEmail, drugName, dosageForm, npi }: EnrollmentFormViewProps) {
  return (
    <div className="bg-white">
        {/* Doc header */}
        <div className="border-b border-[#dddbda] px-6 py-3 flex items-center justify-between" style={{ background: "#f9f9f9" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded" style={{ width: 36, height: 36, background: "var(--crm-primary-80, #6b5ecd)" }}>
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <div className="text-[11px] text-[#706e6b]">Related Document</div>
              <div className="text-[16px] font-bold text-[#3e3e3c]">FAX-2026-00431</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-[#706e6b]">
            <span>{enrollmentFormDocument().fileName}</span>
            <span>·</span>
            <span>5 pages</span>
            <span>·</span>
            <span>Received {daysFromToday(-4)}</span>
            <span>·</span>
            <span>Fax: 866-725-7218</span>
          </div>
        </div>

        {/* Side-by-side body: parsed data left, PDF right */}
        <div className="flex overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>

          {/* Left panel — extracted form data */}
          <div className="overflow-y-auto p-5 space-y-4 border-r border-[#dddbda]" style={{ width: "45%", minWidth: 320, background: "#fafafa" }}>

            {/* Section 1 — Patient Authorization */}
            <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>1</span>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">Patient Authorization</span>
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>Signed</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                <FieldRow label="Patient Signature" value={patientName} />
                <FieldRow label="Relationship to Patient" value="Self" />
                <FieldRow label="Date Signed" value={dateFromToday(1).toLocaleDateString()} />
              </div>
            </div>

            {/* Section 2 — Patient Information */}
            <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>2</span>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">Patient Information</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                <FieldRow label="First Name" value={patientFirstName} />
                <FieldRow label="Last Name" value={patientLastName} />
                <FieldRow label="Date of Birth" value={patientDob} />
                <FieldRow label="Sex" value="M" />
                <FieldRow label="Mobile Phone" value={phone} />
                <FieldRow label="Preferred Contact" value="Mobile" />
                <FieldRow label="Shipping Address" value={deliveryAddressStreet} />
                <FieldRow label="City, State, ZIP" value={deliveryAddressCityStateZip} />
                <FieldRow label="Email" value={patientEmail} isLink />
                <FieldRow label="OK to Leave Voicemail" value="Yes" />
                <FieldRow label="Best Time" value="Morning" />
                <FieldRow label="Preferred Language" value="English" />
              </div>
              <div className="px-4 pb-2">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-1">Alternate Contact</div>
                <div className="grid grid-cols-2 gap-x-4">
                  <FieldRow label="Name" value={`Maria ${patientLastName}`} />
                  <FieldRow label="Relationship" value="Spouse" />
                  <FieldRow label="Phone" value="(555) 867-5310" />
                  <FieldRow label="Email" value={`maria.${patientLastName.toLowerCase()}@gmail.com`} isLink />
                  <FieldRow label="OK to Discuss" value="Yes" />
                </div>
              </div>
            </div>

            {/* Section 3 — Insurance Information */}
            <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>3</span>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">Insurance Information</span>
              </div>
              <div className="px-4 pb-2">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-1">Prescription Drug Insurance</div>
                <div className="grid grid-cols-2 gap-x-4">
                  <FieldRow label="Payer" value="BlueCross BlueShield of Florida" />
                  <FieldRow label="Phone" value="(800) 477-3736" />
                  <FieldRow label="Policy / Member ID" value="BCB-KR-298341" />
                  <FieldRow label="Rx BIN" value="610415" />
                  <FieldRow label="Rx PCN" value="ADV" />
                </div>
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-2">Medical Insurance</div>
                <div className="grid grid-cols-2 gap-x-4">
                  <FieldRow label="Payer" value="BlueCross BlueShield of Florida" />
                  <FieldRow label="Phone" value="(800) 477-3736" />
                  <FieldRow label="Policy / Member ID" value="BCB-KR-298341" />
                </div>
              </div>
            </div>

            {/* Section 4 — Prescription */}
            <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>4</span>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescription for {drugName}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                <FieldRow label="Drug" value={drugName} />
                <FieldRow label="Strength / Form" value={dosageForm} />
                <FieldRow label="Sig" value="Take one tablet by mouth twice per day" />
                <FieldRow label="Quantity" value="30-day supply" />
                <FieldRow label="Refills" value="0" />
                <FieldRow label="Preferred Pharmacy" value="Accredo Health Group Inc." />
              </div>
            </div>

            {/* Section 5 — Clinical Information */}
            <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>5</span>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">Clinical Information</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                <FieldRow label="Diagnosis (ICD-10)" value="J84.112" />
                <FieldRow label="Diagnosis Description" value="Idiopathic Pulmonary Fibrosis (IPF)" />
                <FieldRow label="Allergies" value="Penicillin" />
                <FieldRow label="Prior Therapies" value="Ofev (nintedanib) — discontinued 02/15/20" />
                <FieldRow label="Concurrent Therapies" value="None" />
              </div>
            </div>

            {/* Section 6 — Prescriber Information */}
            <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>6</span>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescriber Information</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                <FieldRow label="Prescriber Name" value="Sarah Chen, MD" />
                <FieldRow label="Facility" value="Orlando Pulmonology Associates" />
                <FieldRow label="Address" value="1800 Medical Park Dr, Orlando, FL 32803" />
                <FieldRow label="Phone" value="(407) 885-9999" />
                <FieldRow label="Fax" value="(407) 885-9998" />
                <FieldRow label="NPI" value={npi} />
                <FieldRow label="State License #" value="ME78901" />
                <FieldRow label="Office Contact" value="Jennifer Torres" />
                <FieldRow label="Email" value="scheduling@orlandopulm.com" isLink />
              </div>
            </div>

            {/* Section 7 — Prescriber Certification */}
            <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>7</span>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescriber Certification</span>
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>Signed</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                <FieldRow label="Prescriber Signature" value="Sarah Chen, MD" />
                <FieldRow label="Dispense As Written" value="Yes" />
                <FieldRow label="Date" value={dateFromToday(1).toLocaleDateString()} />
              </div>
            </div>

          </div>

          {/* Right panel — original PDF */}
          <div className="flex flex-col" style={{ flex: 1 }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
              <span className="text-[12px] font-semibold text-[#3e3e3c]">Original Fax — {enrollmentFormDocument().fileName}</span>
              <a
                href={enrollmentFormDocument().file}
                download={enrollmentFormDocument().fileName}
                className="text-[11px] px-2 py-1 rounded border border-[#dddbda] bg-white text-[var(--crm-primary, #0176d3)] hover:bg-[var(--crm-primary-30, #f0f7ff)] transition-colors"
              >
                Download
              </a>
            </div>
            <object
              data={enrollmentFormDocument().file}
              type="application/pdf"
              className="flex-1 w-full"
            >
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#706e6b]" style={{ background: "#f9f9f9" }}>
                <FileText size={40} className="opacity-30" />
                <div className="text-[13px] font-medium">PDF preview not available</div>
                <div className="text-[11px]">Add <code className="bg-[#f0f0f0] px-1 rounded">{enrollmentFormDocument().file}</code> under <code className="bg-[#f0f0f0] px-1 rounded">public/</code> to enable preview</div>
              </div>
            </object>
          </div>

        </div>
    </div>
  );
}
