import { BRAND } from "@/brand";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import type { WorkflowData } from "@/engine/types";
import { usePatientStore } from "@/store/patientStore";

/**
 * White-label pharmacy intake (the `pharmacy_intake` block). The assigned specialty pharmacy receives the Rx on an
 * intake screen under the client's name and logo, not the platform's. Accepting it sends ACCEPT_PHARMACY_INTAKE, and the
 * machine does the rest (the handoff to the client's CRM). Shown only while the machine says the intake is open.
 */
export default function PharmacyIntake({ workflowData }: { workflowData: WorkflowData }) {
  const dispatch = useWorkflowDispatch();
  const patientName = usePatientStore((s) => s.patientName);
  const pharmacy = workflowData.selectedPharmacy;
  const accent = BRAND.program.colors.brand;
  const rows: [string, string | null | undefined][] = [
    ["Patient", patientName],
    ["Medication", BRAND.program.drugDisplayName],
    ["Dosage form", BRAND.program.dosageForm],
    ["Prior authorization", workflowData.paStatus === "approved" ? "Approved" : null],
    ["Dispensing pharmacy", pharmacy?.name],
  ];

  return (
    <div className="portal-field min-h-screen bg-slate-100 flex flex-col">
      <header className="px-8 py-4 flex items-center justify-between" style={{ backgroundColor: accent }}>
        <img src={BRAND.manufacturer.logo.white} alt={BRAND.manufacturer.name} className="h-8" />
        <span className="text-white/90 text-sm">Specialty pharmacy intake</span>
      </header>
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 w-full max-w-xl p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-1">New prescription received</h1>
          <p className="text-sm text-slate-600 mb-6">
            {BRAND.manufacturer.name} sent this prescription to {pharmacy?.name ?? "the specialty pharmacy"}. Review it and accept to start the order.
          </p>
          <dl className="divide-y divide-slate-200 border-y border-slate-200 mb-6">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between py-2.5 text-sm">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-900 font-medium">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className="w-full rounded-md py-2.5 text-white font-medium"
            style={{ backgroundColor: accent }}
            onClick={() => dispatch("ACCEPT_PHARMACY_INTAKE", { portal: "field" })}
          >
            Accept prescription
          </button>
        </div>
      </main>
    </div>
  );
}
