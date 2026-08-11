import { FileCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";
import YesNoToggle from "@/components/enrollment/YesNoToggle";
import { usePresPapStore } from "@/store/presPapStore";
import { PROGRAM } from "@/config/branding";

/**
 * WF5 (PrES_PAP) entry point — ported from arx-pes-prototype-omniplan's
 * Entry.tsx ("attestation") screen. Ready by the patient themself (no CRM
 * referral / SMS invite needed first), unlike WF1/WF2/WF4.
 *
 * On Continue, bundles ENROLL → INVITE → VERIFY_SMS → VERIFY_OTP into one
 * dispatch sequence — presPap.ts's machine is unchanged from the other
 * flows' shape, it just has no SMS/OTP screens in WF5's real UI, so this
 * collapses that beat into the single self-attestation step, the same way
 * DemoShell's stage-jump ladder already collapses multiple events into one
 * click elsewhere in this codebase.
 */
export default function PesAttestation() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const hasPrescription = usePresPapStore((s) => s.hasPrescription);
  const setField = usePresPapStore((s) => s.setField);

  function handleContinue() {
    if (!hasPrescription) return;
    dispatch("ENROLL", { portal: "patient" });
    dispatch("INVITE", { portal: "patient" });
    dispatch("VERIFY_SMS", { portal: "patient" });
    dispatch("VERIFY_OTP", { portal: "patient" });
    navigate("/pes-patient-info");
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell
        icon={<FileCheck className="w-7 h-7" />}
        title="Eligibility Information"
        stepsFilled={1}
        stepsTotal={3}
        wide
      >
        <p className="text-sm text-arx-body-copy mb-5">
          Please provide the following information to start the enrollment.
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <label className="text-sm font-bold text-arx-slate">
            Does the patient have a prescription for {PROGRAM.drugDisplayName} from a Healthcare Professional?
          </label>
          <YesNoToggle
            name="hasPrescription"
            value={hasPrescription}
            onChange={(v: "Yes" | "No") => setField("hasPrescription", v)}
          />
        </div>

        <button
          onClick={handleContinue}
          disabled={!hasPrescription}
          className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
            hasPrescription
              ? "bg-arx-primary text-white hover:bg-arx-primary-dark"
              : "bg-arx-borders text-arx-inactive cursor-not-allowed"
          }`}
        >
          <span>Continue</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </EnrollmentShell>
    </main>
  );
}
