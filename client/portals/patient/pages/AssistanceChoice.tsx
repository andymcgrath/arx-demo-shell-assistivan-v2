import type { ComponentType } from "react";
import { ArrowRight, HeartHandshake, Sparkles } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PricingBanner } from "@/portals/patient/components/pricing/PricingCard";

/**
 * The assistance fork's screen (workflows/coassist/forks.ts). The patient qualified for the free drug program and now
 * chooses it or the copay program. Qualifying committed nothing. The pick is `CHOOSE_ASSISTANCE`, and the route follows.
 * It has the look of the pricing options screen: a banner, then one card per option with a big figure and a Select link.
 */
export default function AssistanceChoice() {
  const dispatch = useWorkflowDispatch();
  const choose = (option: "pap" | "copay") => dispatch("CHOOSE_ASSISTANCE", { portal: "patient", option });

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-lg mx-auto px-4 space-y-4">
        <PricingBanner copy={{ kind: "approved", title: "You qualified for the free drug program", detail: `Pick the option that works best for you for ${PROGRAM.drugDisplayName}.` }} />

        <Card Icon={HeartHandshake} label="Free drug program" figure="Free" lines={["No cost to you", "Shipped to you by the program pharmacy"]} cta="Select" onSelect={() => choose("pap")} />
        <Card
          Icon={Sparkles}
          label={`${PROGRAM.drugDisplayName} Copay Program`}
          figure="$25"
          cadence="/month"
          lines={["As low as, with your insurance", "No separate approval required"]}
          cta="Select"
          onSelect={() => choose("copay")}
        />

        <p className="text-[10px] leading-relaxed text-arx-body-copy">
          Government insurance beneficiaries (Medicare, Medicaid, VA, TRICARE) are not eligible for the {PROGRAM.drugDisplayName} Copay Program. Terms and conditions apply.
        </p>
      </div>
    </main>
  );
}

interface CardProps {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  figure: string;
  cadence?: string;
  lines: string[];
  cta: string;
  onSelect: () => void;
}

function Card({ Icon, label, figure, cadence, lines, cta, onSelect }: CardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="block w-full text-left rounded-xl p-4 border-2 border-arx-borders bg-arx-white hover:border-arx-primary hover:bg-arx-sky/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-arx-sky">
          <Icon className="w-4 h-4 text-arx-link" />
        </div>
        <span className="font-semibold text-sm text-arx-slate">{label}</span>
      </div>
      <p className="text-2xl font-bold text-arx-slate mb-1">
        {figure}
        {cadence && <span className="text-sm font-semibold">{cadence}</span>}
      </p>
      {lines.map((l) => (
        <p key={l} className="text-xs text-arx-body-copy">{l}</p>
      ))}
      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-arx-link">
        <span>{cta}</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}
