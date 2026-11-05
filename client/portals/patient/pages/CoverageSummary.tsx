import { ArrowRight } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { usePersonaState, useWorkflowActor, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { CoverageBanner } from "@/portals/patient/components/pricing/PricingCard";

/**
 * Coverage summary: CoA_Web_Copay only. The client's web page started the case, benefit verification and the prior
 * authorization ran through the gateway, and the PA came back approved. The patient sees the outcome here, then taps
 * Check Pricing. Because the approval is shown here, the PA-approved text and code are skipped. The tap sends
 * CHECK_PRICING, and the case runs like Copay from there: pricing, copay enrollment, pricing at the reduced amount,
 * pharmacy selection.
 */
export default function CoverageSummary() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const actor = useWorkflowActor();
  const { workflowData: w } = usePersonaState("patient");

  function checkPricing() {
    dispatch("CHECK_PRICING", { portal: "patient" });
    navigate(derivePatientRoute(actor.getSnapshot().context));
  }

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-2xl mx-auto px-4 space-y-5">
        <div className="bg-arx-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <h1 className="text-xl font-bold text-arx-slate mb-1">Coverage Summary</h1>
          </div>
          <div className="px-5 py-5 space-y-4">
            <CoverageBanner priorAuthRequired={false} note="Prior Authorization approved" />
            <dl className="rounded-xl border border-arx-borders divide-y divide-arx-borders text-sm">
              <Row label="Pharmacy benefit" value={w.pharmacyBenefitStatus === "covered" ? "Covered" : "Not covered"} />
              <Row label="Medical benefit" value={w.medicalBenefitStatus === "covered" ? "Covered" : "Not covered"} />
              <Row label="Prior authorization" value="Approved" />
            </dl>
            <button
              type="button"
              onClick={checkPricing}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-arx-primary text-arx-on-primary font-semibold text-sm py-3"
            >
              Check Pricing
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-arx-body-copy">{label}</dt>
      <dd className="font-semibold text-arx-slate">{value}</dd>
    </div>
  );
}
