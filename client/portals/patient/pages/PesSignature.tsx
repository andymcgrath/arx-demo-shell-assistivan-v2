import { PenLine, ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { usePatientCase } from "@/hooks/usePatientCase";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";

/**
 * PrES_PAP (WF5) foundation placeholder — patient-side "PES" screen.
 *
 * WF5's real capture mechanism (provider e-signature intake) hasn't been
 * designed yet. This stands in for Signature.tsx (which WF1/WF2/WF4 use) so
 * WF5 has its own isolated screen to replace once the real design lands,
 * instead of overloading Signature.tsx's isPapFlow branch with a fourth
 * flow. Downstream behavior mirrors WF2's exact next step (PAP skips Upload
 * Insurance — CONFIRM_CONSENT fires here, then on to Income Qualification)
 * so the rest of the WF5 flow keeps working end-to-end today.
 */
export default function PesSignature() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { data: patient } = usePatientCase();

  return (
    <main className="flex-grow">
      <EnrollmentShell
        icon={<PenLine className="w-7 h-7" />}
        title="Provider e-signature (placeholder)"
        stepsFilled={2}
        stepsTotal={3}
      >
        <div className="rounded-xl border border-dashed border-arx-borders bg-arx-neutral-100 p-5 text-sm leading-relaxed text-arx-body-copy">
          <p className="font-semibold text-arx-slate mb-2">WF5 — PrES/PAP foundation placeholder</p>
          <p>
            This screen stands in for {patient.patientName}'s real e-signature
            intake step, which hasn't been designed yet. Continuing below
            confirms consent the same way WF2's Signature step does, so the
            rest of this workflow (Benefits Investigation, PAP income
            qualification, dispatch) keeps working while the real design is
            pending.
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => {
              // Mirrors Signature.tsx's isPapFlow branch: PAP-style flows skip
              // Upload Insurance entirely, so CONFIRM_CONSENT fires here
              // instead of at that (skipped) step.
              dispatch('CONFIRM_CONSENT', { portal: 'patient' });
              navigate("/income-qualification");
            }}
            className="w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors bg-arx-primary text-white hover:bg-arx-primary-dark"
          >
            <span>Continue</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </EnrollmentShell>
    </main>
  );
}
