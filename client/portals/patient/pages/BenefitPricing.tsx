import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, Store, Truck, Sparkles } from "lucide-react";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PROGRAM } from "@/config/branding";

/**
 * Benefit Pricing — CoA_DTP and iAssist_PA_Approved (WF4 replicates this
 * screen exactly, see WorkflowEngine.ts's derivePatientRoute and iAssist.ts's
 * updateSelectPricingOption/updateSelectSelfPay). WF1 (Fax_QS_PA_Approved)
 * never routes here.
 *
 * Shown once PA is approved (see WorkflowEngine's isCoA/iAssist branches and
 * PAApproved.tsx, which routes here instead of straight to /delivery-address
 * for CoA_DTP). Presents the 3 options CoAssist offers once insurance
 * covers the drug: Retail pickup, Mail order, or the Copay program — a
 * self-pay option through the CoAssist Pharmacy at a reduced price. Cards
 * stack vertically with Copay last, since it's a lower-priority fallback to
 * Retail/Mail. This replaces the old two-step "Apply" banner + separate
 * /copay-enroll screen (which offered a Savings Card vs. a pricier Self-Pay
 * tier) — those are now combined into this single $25 option.
 *
 * Retail/Mail record the choice (SELECT_PRICING_OPTION) and go straight
 * into the existing delivery-address flow, unchanged. Copay routes to a
 * dedicated /copay-enroll screen instead — enrolling only unlocks the
 * reduced price, it isn't payment, so nothing is dispatched here yet. The
 * actual charge happens later at the payment step (after address + date),
 * same point Retail/Mail reach it, just at the discounted price.
 *
 * CoA_Copay (WF4) is the one exception to all of the above — see
 * isCopayWorkflow below. Its Copay option is no longer a third
 * mutually-exclusive pricing tier: enrolling is a separate step (still
 * /copay-enroll) that comes back here afterward for the patient to pick
 * Retail or Mail Order as the actual fulfillment channel, at a discounted
 * Copay rate. This file stays the single source of truth for both — the
 * CoA_DTP/iAssist rendering below (DefaultBenefitPricing) is untouched.
 *
 * CoA_Copay's Retail card is a second, narrower exception, layered on top of
 * the first: instead of dispatching SELECT_PRICING_OPTION immediately like
 * every other Retail/Mail card on this page, it navigates to the new
 * /pharmacy-selection screen (PharmacySelection.tsx) so the patient can pick
 * a real pharmacy chain instead of always landing on the same fixed "CVS
 * Pharmacy #3795". Mail Order keeps dispatching immediately, same as
 * CoA_DTP/iAssist. See CopayBenefitPricing's handleSelect below.
 */

type PricingKey = "retail" | "mail_order" | "self_pay";

interface PricingOption {
  key: PricingKey;
  icon: typeof Store;
  label: string;
  price: number;
  cadence?: string;
  supply?: string;
  pharmacy?: string;
  description?: string;
  cta: string;
  badge?: string;
}

const PRICING_OPTIONS: PricingOption[] = [
  {
    key: "retail",
    icon: Store,
    label: "Retail Pharmacy",
    price: 50,
    supply: "1.0 mg Dose / 30 days",
    pharmacy: "CVS Pharmacy #3795",
    cta: "Select",
  },
  {
    key: "mail_order",
    icon: Truck,
    label: "Mail Order",
    price: 100,
    supply: "1.0 mg Dose / 90 days",
    pharmacy: "FutureScripts Home Delivery",
    cta: "Select",
  },
  {
    key: "self_pay",
    icon: Sparkles,
    label: "Assistivan Copay Program",
    price: 25,
    cadence: "/month",
    description: `Pay a reduced price by filling through the CoAssist Pharmacy — no separate insurance approval needed for this option.`,
    cta: "Enroll",
    badge: "Best Value",
  },
];

// CoA_Copay only — not yet enrolled. Copay leads (styled as the main CTA in
// CopayBenefitPricing below), followed by Retail/Mail at their normal,
// un-enrolled prices — enrolling is what unlocks the discount below.
const COPAY_PRE_ENROLL_OPTIONS: PricingOption[] = [
  {
    key: "self_pay",
    icon: Sparkles,
    label: "Assistivan Copay Program",
    price: 25,
    cadence: "/month",
    description: `As low as $25/month — enroll, then pick Retail or Mail Order for pickup or delivery at the discounted rate. No separate insurance approval needed.`,
    cta: "Enroll",
    badge: "Best Value",
  },
  {
    key: "retail",
    icon: Store,
    label: "Retail Pharmacy",
    price: 50,
    supply: "1.0 mg Dose / 30 days",
    pharmacy: "CVS Pharmacy #3795",
    cta: "Select",
  },
  {
    key: "mail_order",
    icon: Truck,
    label: "Mail Order",
    price: 100,
    supply: "1.0 mg Dose / 90 days",
    pharmacy: "FutureScripts Home Delivery",
    cta: "Select",
  },
];

// CoA_Copay only — already enrolled (copayEnrolled true, pricingOption still
// null). Copay's card is gone (already chosen); Retail/Mail now show the
// discounted Copay rate instead of their normal price, since that's the
// whole point of having enrolled.
const COPAY_POST_ENROLL_OPTIONS: PricingOption[] = [
  {
    key: "retail",
    icon: Store,
    label: "Retail Pharmacy",
    price: 25,
    cadence: "/month",
    supply: "1.0 mg Dose / 30 days",
    pharmacy: "CVS Pharmacy #3795",
    cta: "Select",
  },
  {
    key: "mail_order",
    icon: Truck,
    label: "Mail Order",
    price: 50,
    cadence: "/month",
    supply: "1.0 mg Dose / 90 days",
    pharmacy: "FutureScripts Home Delivery",
    cta: "Select",
  },
];

export default function BenefitPricing() {
  const { workflowData } = usePersonaState('patient');

  // CoA_Copay is the only flow where Copay isn't a third mutually-exclusive
  // pricing tier alongside Retail/Mail — see this file's header comment.
  // Every other flow (CoA_DTP, iAssist_PA_Approved) keeps the original,
  // untouched rendering below.
  if (workflowData.flowType === "CoA_Copay") {
    return <CopayBenefitPricing copayEnrolled={workflowData.copayEnrolled} />;
  }

  return <DefaultBenefitPricing />;
}

function DefaultBenefitPricing() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  function choosePricing(option: "retail" | "mail_order") {
    dispatch("SELECT_PRICING_OPTION", { portal: "patient", option });
    navigate("/delivery-address");
  }

  function handleSelect(key: PricingKey) {
    if (key === "self_pay") {
      // Enrollment (and the actual SELECT_SELF_PAY dispatch) happens on the
      // dedicated screen — this card is just the entry point to it.
      navigate("/copay-enroll");
    } else {
      choosePricing(key);
    }
  }

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-2xl mx-auto px-4 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <h1 className="text-xl font-bold text-arx-slate mb-1">Benefit Pricing</h1>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Coverage banner */}
            <div className="rounded-xl p-4 bg-arx-sky border border-arx-borders">
              <p className="font-bold text-base text-arx-slate">
                Great news! {PROGRAM.drugDisplayName} is covered by your insurance
              </p>
              <p className="text-sm mt-1 text-arx-body-copy">Prior Authorization Required</p>
            </div>

            {/* Retail, Mail Order, then Copay — stacked vertically */}
            <div className="flex flex-col gap-4">
              {PRICING_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    onClick={() => handleSelect(option.key)}
                    className="relative text-left rounded-xl p-4 border-2 border-arx-borders hover:border-arx-primary hover:bg-arx-sky/20 transition-colors"
                  >
                    {option.badge && (
                      <span className="absolute -top-2.5 right-4 bg-arx-primary text-white text-[10px] font-bold uppercase tracking-wide rounded-full px-3 py-1 shadow-sm">
                        {option.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-arx-sky flex-shrink-0">
                        <Icon className="w-4 h-4 text-arx-primary" />
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
                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-arx-primary">
                      <span>{option.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// CoA_Copay only — see this file's header comment. Structurally the same
// screen as DefaultBenefitPricing (same header/coverage-banner shell, same
// card layout), but with its own option list/ordering and its own card
// renderer so the Copay card can be styled as the primary CTA (filled
// button instead of the plain text+arrow link Retail/Mail/DefaultBenefitPricing
// use) without touching that shared styling for every other flow.
function CopayBenefitPricing({ copayEnrolled }: { copayEnrolled: boolean }) {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  function handleSelect(key: PricingKey) {
    if (key === "self_pay") {
      navigate("/copay-enroll");
    } else if (key === "retail") {
      // CoA_Copay only — Retail gets an extra pharmacy-selection step instead
      // of dispatching straight away (see PharmacySelection.tsx's header
      // comment for why and how). Nothing is dispatched here yet; that page
      // fires SELECT_PRICING_OPTION + SELECT_PHARMACY once a specific store
      // is picked.
      navigate("/pharmacy-selection");
    } else {
      // Mail Order — unchanged, still dispatches immediately.
      dispatch("SELECT_PRICING_OPTION", { portal: "patient", option: key });
      navigate("/delivery-address");
    }
  }

  const options = copayEnrolled ? COPAY_POST_ENROLL_OPTIONS : COPAY_PRE_ENROLL_OPTIONS;

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-2xl mx-auto px-4 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <h1 className="text-xl font-bold text-arx-slate mb-1">Benefit Pricing</h1>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Coverage banner */}
            <div className="rounded-xl p-4 bg-arx-sky border border-arx-borders">
              <p className="font-bold text-base text-arx-slate">
                Great news! {PROGRAM.drugDisplayName} is covered by your insurance
              </p>
              <p className="text-sm mt-1 text-arx-body-copy">Prior Authorization Required</p>
            </div>

            {copayEnrolled && (
              <div className="rounded-xl p-4 bg-arx-primary/10 border border-arx-primary/30">
                <p className="font-bold text-sm text-arx-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  You're enrolled in the Assistivan Copay Program
                </p>
                <p className="text-xs mt-1 text-arx-body-copy">
                  Pick Retail or Mail Order below to lock in your discounted rate.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {options.map((option) => {
                const Icon = option.icon;
                // Copay's card is the main CTA only while it's still on
                // offer (pre-enroll, always first in this list) — once
                // enrolled, Retail/Mail are both equally valid, plain picks.
                const isPrimary = !copayEnrolled && option.key === "self_pay";
                return (
                  <button
                    key={option.key}
                    onClick={() => handleSelect(option.key)}
                    className={
                      isPrimary
                        ? "relative text-left rounded-xl p-4 border-2 border-arx-primary bg-arx-primary/5 hover:bg-arx-primary/10 transition-colors"
                        : "relative text-left rounded-xl p-4 border-2 border-arx-borders hover:border-arx-primary hover:bg-arx-sky/20 transition-colors"
                    }
                  >
                    {option.badge && (
                      <span className="absolute -top-2.5 right-4 bg-arx-primary text-white text-[10px] font-bold uppercase tracking-wide rounded-full px-3 py-1 shadow-sm">
                        {option.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isPrimary ? "bg-arx-primary" : "bg-arx-sky"}`}>
                        <Icon className={`w-4 h-4 ${isPrimary ? "text-white" : "text-arx-primary"}`} />
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
                    {isPrimary ? (
                      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-arx-primary text-white font-semibold text-sm py-2.5">
                        <span>{option.cta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-arx-primary">
                        <span>{option.cta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
