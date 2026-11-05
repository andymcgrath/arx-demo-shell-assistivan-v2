import type { ReactNode } from "react";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowActor, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { PROGRAM } from "@/portals/patient/config/branding";

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

  function checkPricing() {
    dispatch("CHECK_PRICING", { portal: "patient" });
    navigate(derivePatientRoute(actor.getSnapshot().context));
  }

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-arx-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          <div className="px-5 pt-6 pb-5 bg-arx-sky border-b border-arx-borders text-center">
            <CheckCircle2 className="w-10 h-10 text-arx-primary mx-auto mb-3" aria-hidden="true" />
            <h1 className="text-xl font-bold text-arx-slate mb-1">Good news! You're covered.</h1>
            <p className="text-sm text-arx-body-copy">
              Your insurance approved {PROGRAM.drugDisplayName}. You don't need to do anything else to get approved.
            </p>
          </div>
          <div className="px-5 py-5 space-y-5">
            <ul className="space-y-3 text-sm text-arx-slate">
              <Item>Your plan covers it at the pharmacy</Item>
              <Item>Your insurance approved it</Item>
            </ul>
            <div>
              <h2 className="text-sm font-bold text-arx-slate mb-1">What happens next</h2>
              <p className="text-sm text-arx-body-copy">
                We'll show you what you may pay and ways to save. It takes about a minute. You won't be charged yet.
              </p>
            </div>
            <button
              type="button"
              onClick={checkPricing}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-arx-primary text-arx-on-primary font-semibold text-sm py-3"
            >
              See my price
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="w-5 h-5 shrink-0 text-arx-primary" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
