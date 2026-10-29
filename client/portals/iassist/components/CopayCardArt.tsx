/**
 * CopayCardArt: the copay card as the HCP sees it. It wears the brand's colors and carries the patient's name and a
 * member ID made for that patient (data/copayProgram.ts).
 */
import { BRAND } from "@/brand";
import { usePatientStore } from "@/store/patientStore";
import { copayMemberId } from "../data/copayProgram";

export function useCopayMemberId(): string {
  const patientName = usePatientStore((s) => s.patientName);
  return copayMemberId(patientName, BRAND.program.name);
}

export default function CopayCardArt() {
  const patientName = usePatientStore((s) => s.patientName);
  const memberId = useCopayMemberId();
  const { brand, accent } = BRAND.program.colors;

  return (
    <div
      className="w-72 shrink-0 rounded-xl p-4 text-white shadow-sm relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${brand}, ${brand} 55%, ${accent})` }}
    >
      <p className="text-sm font-semibold">{BRAND.program.name}</p>
      <p className="text-lg font-bold mt-1">Copay Card</p>
      <p className="text-base font-semibold tracking-wide mt-5">{patientName}</p>
      <p className="text-xs opacity-80 mt-1">Member ID {memberId}</p>
    </div>
  );
}
