import { CheckCircle, Phone } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
import { ADVANCED_DIABETES_SUPPLY_FACTS } from "@/engine/WorkflowEngine";

// CoA_DME's terminal screen — mirrors PapEnrollmentComplete.tsx's structure
// (full-bleed primary-color card, checkmark banner), but has nothing left to
// dispatch: this flow ends here, with CoAssist having already handed the
// case to Advanced Diabetes Supply for fulfillment, so there's no "Got it"
// button advancing the machine further (see workflows/coaDme.ts and
// WorkflowEngine.ts's derivePatientRoute — this is the real terminal route).
export default function DmeProviderTransfer() {
  return (
    <main className="flex-grow min-h-full flex items-center justify-center px-6 py-6 bg-arx-hero">
      <div className="text-center max-w-sm mx-auto">
        <h1 className="text-xl font-bold text-arx-on-hero mt-0 mb-3 leading-snug">
          You're all set!
        </h1>

        <div className="rounded-2xl p-4 mb-4 flex flex-col items-center gap-1.5 bg-arx-on-hero/15 border border-arx-on-hero/35">
          <CheckCircle className="w-7 h-7 text-arx-on-hero" />
          <p className="text-lg font-semibold text-arx-on-hero/90 leading-tight">
            Your {PROGRAM.name} sensor is covered under your medical benefit
          </p>
        </div>

        <p className="text-arx-on-hero/90 text-sm leading-snug mb-3">
          Your case has been transferred to {ADVANCED_DIABETES_SUPPLY_FACTS.name}, the durable medical equipment provider who will complete your order.
        </p>

        <div className="rounded-2xl p-4 mb-3 flex items-start gap-2 bg-arx-on-hero/15 border border-arx-on-hero/35 text-left">
          <Phone className="w-4 h-4 text-arx-on-hero flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-arx-on-hero">{ADVANCED_DIABETES_SUPPLY_FACTS.name}</p>
            <p className="text-xs text-arx-on-hero/80">{ADVANCED_DIABETES_SUPPLY_FACTS.contactPhone}</p>
            <p className="text-xs text-arx-on-hero/80">
              {ADVANCED_DIABETES_SUPPLY_FACTS.address}, {ADVANCED_DIABETES_SUPPLY_FACTS.city}, {ADVANCED_DIABETES_SUPPLY_FACTS.state} {ADVANCED_DIABETES_SUPPLY_FACTS.zip}
            </p>
          </div>
        </div>

        <p className="text-arx-on-hero/90 text-sm leading-snug">
          {ADVANCED_DIABETES_SUPPLY_FACTS.name} will contact you directly to complete your order. No further action is needed at this time.
        </p>
      </div>
    </main>
  );
}
