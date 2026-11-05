/**
 * One pricing card and the coverage banner above the list. The patient's Benefit Pricing screen and the client web
 * page both draw them, so the hand-off from the page to the app keeps one look. A card is a button. `primary` is the
 * filled call to action (the Copay card, while it is still on offer).
 */
import { ArrowRight } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
import type { PricingOption } from "./pricingOptions";

/** `note` replaces the prior authorization line, for a screen that shows the outcome. */
export function CoverageBanner({ priorAuthRequired, note }: { priorAuthRequired: boolean; note?: string }) {
  return (
    <div className="rounded-xl p-4 bg-arx-sky border border-arx-borders">
      <p className="font-bold text-base text-arx-slate">Great news! {PROGRAM.drugDisplayName} is covered by your insurance</p>
      {(note ?? (priorAuthRequired ? "Prior Authorization Required" : null)) && (
        <p className="text-sm mt-1 text-arx-body-copy">{note ?? "Prior Authorization Required"}</p>
      )}
    </div>
  );
}

interface PricingCardProps {
  option: PricingOption;
  primary?: boolean;
  onSelect?: () => void;
}

export default function PricingCard({ option, primary = false, onSelect }: PricingCardProps) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        primary
          ? "relative text-left rounded-xl p-4 border-2 border-arx-primary bg-arx-primary/5 hover:bg-arx-primary/10 transition-colors"
          : "relative text-left rounded-xl p-4 border-2 border-arx-borders hover:border-arx-primary hover:bg-arx-sky/20 transition-colors"
      }
    >
      {option.badge && (
        <span className="absolute -top-2.5 right-4 bg-arx-primary text-arx-on-primary text-[10px] font-bold uppercase tracking-wide rounded-full px-3 py-1 shadow-sm">
          {option.badge}
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${primary ? "bg-arx-primary" : "bg-arx-sky"}`}>
          <Icon className={`w-4 h-4 ${primary ? "text-arx-on-primary" : "text-arx-link"}`} />
        </div>
        <span className="font-semibold text-sm text-arx-slate">{option.label}</span>
      </div>
      <p className="text-2xl font-bold text-arx-slate mb-1">
        ${option.price}
        {option.cadence && <span className="text-sm font-semibold">{option.cadence}</span>}
      </p>
      {option.description ? (
        <p className="text-xs text-arx-body-copy">{option.description}</p>
      ) : (
        <>
          <p className="text-xs text-arx-body-copy">{option.supply}</p>
          <p className="text-xs text-arx-body-copy">Pharmacy: {option.pharmacy}</p>
        </>
      )}
      {primary ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-arx-primary text-arx-on-primary font-semibold text-sm py-2.5">
          <span>{option.cta}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-arx-link">
          <span>{option.cta}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </button>
  );
}
