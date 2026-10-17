import { CheckCircle, Phone } from "lucide-react";
import { PROGRAM } from "@/config/branding";
import { ADVANCED_DIABETES_SUPPLY_FACTS } from "@/engine/WorkflowEngine";

// CoA_DME's terminal screen — mirrors PapEnrollmentComplete.tsx's structure
// (full-bleed primary-color card, checkmark banner), but has nothing left to
// dispatch: this flow ends here, with CoAssist having already handed the
// case to Advanced Diabetes Supply for fulfillment, so there's no "Got it"
// button advancing the machine further (see workflows/coaDme.ts and
// WorkflowEngine.ts's derivePatientRoute — this is the real terminal route).
export default function DmeProviderTransfer() {
  return (
    <main className="flex-grow min-h-full flex items-center justify-center px-6 py-6 bg-arx-primary">
      <div className="text-center max-w-sm mx-auto">
        <h1 className="text-xl font-bold text-white mt-0 mb-3 leading-snug">
          You're all set!
        </h1>

        <div className="rounded-2xl p-4 mb-4 flex flex-col items-center gap-1.5 bg-white/15 border border-white/35">
          <CheckCircle className="w-7 h-7 text-white" />
          <p className="text-lg font-semibold text-white/90 leading-tight">
            Your {PROGRAM.name} sensor is covered under your medical benefit
          </p>
        </div>

        <p className="text-white/90 text-sm leading-snug mb-3">
          Your case has been transferred to {ADVANCED_DIABETES_SUPPLY_FACTS.name}, the durable medical equipment provider who will complete your order.
        </p>

        <div className="rounded-2xl p-4 mb-3 flex items-start gap-2 bg-white/15 border border-white/35 text-left">
          <Phone className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">{ADVANCED_DIABETES_SUPPLY_FACTS.name}</p>
            <p className="text-xs text-white/80">{ADVANCED_DIABETES_SUPPLY_FACTS.contactPhone}</p>
            <p className="text-xs text-white/80">
              {ADVANCED_DIABETES_SUPPLY_FACTS.address}, {ADVANCED_DIABETES_SUPPLY_FACTS.city}, {ADVANCED_DIABETES_SUPPLY_FACTS.state} {ADVANCED_DIABETES_SUPPLY_FACTS.zip}
            </p>
          </div>
        </div>

        <p className="text-white/90 text-sm leading-snug">
          {ADVANCED_DIABETES_SUPPLY_FACTS.name} will contact you directly to complete your order. No further action is needed at this time.
        </p>
      </div>
    </main>
  );
}
