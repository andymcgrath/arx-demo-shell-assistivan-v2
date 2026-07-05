import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, Store, Truck, Sparkles } from "lucide-react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PROGRAM } from "@/config/branding";

/**
 * Benefit Pricing — CoA_DTP only.
 *
 * Shown once PA is approved (see WorkflowEngine's isCoA branch and
 * PAApproved.tsx, which routes here instead of straight to /delivery-address
 * for this flow). Presents the 3 options CoAssist offers once insurance
 * covers the drug: Retail pickup, Mail order, or applying to the Assistivan
 * copay assistance program. Picking Retail/Mail records the choice
 * (SELECT_PRICING_OPTION) and continues into the existing delivery-address
 * flow shared with the rest of the app; Apply routes to the existing
 * /copay-enroll screen.
 */

interface PricingOption {
  key: "retail" | "mail_order";
  icon: typeof Store;
  label: string;
  price: number;
  supply: string;
  pharmacy: string;
}

const PRICING_OPTIONS: PricingOption[] = [
  {
    key: "retail",
    icon: Store,
    label: "Retail Pharmacy",
    price: 50,
    supply: "1.0 mg Dose / 30 days",
    pharmacy: "CVS Pharmacy #3795",
  },
  {
    key: "mail_order",
    icon: Truck,
    label: "Mail Order",
    price: 100,
    supply: "1.0 mg Dose / 90 days",
    pharmacy: "FutureScripts Home Delivery",
  },
];

export default function BenefitPricing() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  function choosePricing(option: "retail" | "mail_order") {
    dispatch("SELECT_PRICING_OPTION", { portal: "patient", option });
    navigate("/delivery-address");
  }

  return (
    <main className="flex-grow pb-8">
      <div className="max-w-2xl mx-auto px-4 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <h1 className="text-xl font-bold text-arx-slate mb-1">Benefit Pricing</h1>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Coverage banner */}
            <div className="rounded-xl p-4 bg-arx-sky border border-arx-borders">
              <p className="font-bold text-base text-arx-slate">
                Great news! {PROGRAM.drugDisplayName} is covered by your insurance
              </p>
              <p className="text-sm mt-1 text-arx-body-copy">Prior Authorization Required</p>
            </div>

            {/* Retail vs Mail Order — stacks on mobile, side by side from sm up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRICING_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    onClick={() => choosePricing(option.key)}
                    className="text-left rounded-xl p-4 border-2 border-arx-borders hover:border-arx-primary hover:bg-arx-sky/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-arx-sky flex-shrink-0">
                        <Icon className="w-4 h-4 text-arx-primary" />
                      </div>
                      <span className="font-semibold text-sm text-arx-slate">{option.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-arx-slate mb-1">${option.price}</p>
                    <p className="text-xs text-arx-body-copy">{option.supply}</p>
                    <p className="text-xs text-arx-body-copy">Pharmacy: {option.pharmacy}</p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-arx-primary">
                      <span>Select</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Copay assistance program banner */}
            <div className="rounded-xl p-4 bg-arx-neutral-100 border border-arx-borders flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-arx-sky flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-arx-primary" />
                </div>
                <p className="text-sm text-arx-body-copy">
                  You may qualify for $0 out-of-pocket cost. Enroll in the {PROGRAM.drugDisplayName} Assistance Program
                </p>
              </div>
              <button
                onClick={() => navigate("/copay-enroll")}
                className="flex-shrink-0 font-semibold text-sm py-2.5 px-5 rounded-lg border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
