import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, Store, Truck, Sparkles } from "lucide-react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
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
    label: "Jascayd Copay Program",
    price: 25,
    cadence: "/month",
    description: `Pay a reduced price by filling through the CoAssist Pharmacy — no separate insurance approval needed for this option.`,
    cta: "Enroll",
    badge: "Best Value",
  },
];

export default function BenefitPricing() {
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
