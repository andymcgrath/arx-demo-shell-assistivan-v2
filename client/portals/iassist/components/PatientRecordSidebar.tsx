/**
 * PatientRecordSidebar: the left panel of the iAssist patient view. Identity comes from the shared patient store.
 * It is iAssist-branded: the drug is plain text, with no manufacturer logo.
 */
import { Flag, User, Pill, FileText } from "lucide-react";
import { usePatientStore } from "@/store/patientStore";
import { IAssistLogo } from "./IAssistSidebar";

export default function PatientRecordSidebar() {
  const { patientName, patientDob, drugName, payer, memberId } = usePatientStore();
  return (
    <aside className="hidden md:flex w-[260px] flex-shrink-0 flex-col bg-white border-r border-[#E8E8E8] p-6 gap-6">
      <IAssistLogo className="h-7 w-auto self-start" />
      <div>
        <h2 className="text-xl font-semibold text-[#007178]">{patientName}</h2>
        <p className="text-sm text-[#6F7276] mt-1">{drugName} patient since {new Date().getFullYear()}</p>
        <p className="text-sm text-[#007178] font-semibold mt-3 flex items-center gap-2"><Flag size={14} /> Alert (0)</p>
      </div>
      <div className="border-t border-[#E8E8E8] pt-5 space-y-5 text-sm">
        <div className="flex gap-3">
          <User size={16} className="text-[#007178] mt-0.5 flex-shrink-0" />
          <div><p className="font-semibold text-[#1D1D1D]">{patientName}</p><p className="text-[#6F7276]">{patientDob}</p></div>
        </div>
        <div className="flex gap-3">
          <Pill size={16} className="text-[#007178] mt-0.5 flex-shrink-0" />
          <div><p className="font-semibold text-[#1D1D1D]">{drugName}</p><p className="text-[#6F7276]">NDC 123456789</p></div>
        </div>
        <div className="flex gap-3">
          <FileText size={16} className="text-[#007178] mt-0.5 flex-shrink-0" />
          <div><p className="font-semibold text-[#1D1D1D]">{payer}</p><p className="text-[#6F7276]">Cardholder ID {memberId}</p></div>
        </div>
      </div>
    </aside>
  );
}
