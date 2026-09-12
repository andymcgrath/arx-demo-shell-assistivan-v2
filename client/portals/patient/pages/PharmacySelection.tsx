import { ArrowLeft, ArrowRight, Store } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PROGRAM } from "@/config/branding";
import type { Pharmacy } from "@/engine/types";

/**
 * Pharmacy Selection — CoA_Copay (WF4) only.
 *
 * Reached from BenefitPricing.tsx's CopayBenefitPricing when the patient
 * picks "Retail Pharmacy" (both pre- and post-enrollment) — see that file's
 * choosePricing(). Mail Order is unaffected: it still dispatches
 * SELECT_PRICING_OPTION and goes straight to /delivery-address, the same as
 * every other flow. Retail alone gets this extra step so the patient can
 * pick a real pharmacy chain instead of always landing on the same fixed
 * "CVS Pharmacy #3795". CoA_DTP/iAssist keep that fixed-pharmacy Retail card
 * untouched — this page is CoA_Copay-only, matching every other Copay-specific
 * change in this file's history.
 *
 * Selecting a card dispatches two events in sequence, reusing existing
 * machine plumbing rather than adding a new one:
 *   1. SELECT_PRICING_OPTION (option: "retail") — same event Mail Order
 *      already uses; transitions the machine into pricingSelected and sets
 *      a placeholder selectedPharmacy (see coaCopay.ts).
 *   2. SELECT_PHARMACY (pharmacy) — already exists in coaCopay.ts's
 *      pricingSelected state (originally added so CRM staff can override the
 *      auto-assigned pharmacy); it just overwrites selectedPharmacy without
 *      changing state, which is exactly what's needed here to swap the
 *      placeholder for the patient's actual pick.
 *
 * /pharmacy-selection is listed in patient/index.tsx's DELIVERY_FLOW_PATHS —
 * pricingOption is still null while this screen is showing (dispatch #1
 * above hasn't fired yet), so without that entry StateDrivenNav's
 * derivePatientRoute would bounce the patient straight back to
 * /benefit-pricing the instant they land here. Same tolerance /copay-enroll
 * already relies on for the same reason.
 */

// Addresses are all near Keanu Dixon's home address (123 Main Street,
// Orlando, FL 32801 — see PATIENT_SEED in patientStore.ts), same convention
// coaDtp.ts's SELF_PAY_PHARMACY and WorkflowEngine.ts's
// KEANU_SITE_OF_CARE_FACTS already use for anything meant to be "somewhere
// Keanu would realistically drive to." Kroger has no Florida locations, so
// it's swapped for Publix — Florida's dominant grocery/pharmacy chain —
// rather than listing a chain that couldn't exist in this market.
const RETAIL_PHARMACIES: Pharmacy[] = [
  { name: "CVS Pharmacy #3795", address: "210 N Orange Ave", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-0142" },
  { name: "Walgreens #6021", address: "1900 E Colonial Dr", city: "Orlando", state: "FL", zip: "32803", phone: "(407) 555-0187" },
  { name: "Walmart Pharmacy #4488", address: "4315 S Orange Blossom Trail", city: "Orlando", state: "FL", zip: "32839", phone: "(407) 555-0221" },
  { name: "Rite Aid #2210", address: "1801 Edgewater Dr", city: "Orlando", state: "FL", zip: "32804", phone: "(407) 555-0134" },
  { name: "Publix Pharmacy #710", address: "2170 S Orange Ave", city: "Orlando", state: "FL", zip: "32806", phone: "(407) 555-0298" },
  { name: "Costco Pharmacy #1123", address: "5100 S Kirkman Rd", city: "Orlando", state: "FL", zip: "32819", phone: "(407) 555-0356" },
];

export default function PharmacySelection() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState('patient');

  // Mirrors the Retail card's own price on whichever Benefit Pricing view
  // sent the patient here — $25/month once enrolled in Copay, $50 flat
  // (30-day supply) otherwise. See BenefitPricing.tsx's COPAY_POST_ENROLL_OPTIONS
  // / COPAY_PRE_ENROLL_OPTIONS for the source of truth these numbers mirror.
  const copayEnrolled = workflowData.copayEnrolled;
  const price = copayEnrolled ? 25 : 50;
  const cadence = copayEnrolled ? "/month" : undefined;

  function selectPharmacy(pharmacy: Pharmacy) {
    dispatch("SELECT_PRICING_OPTION", { portal: "patient", option: "retail" });
    dispatch("SELECT_PHARMACY", { portal: "patient", pharmacy });
    // No delivery address or ship date for Retail — that's the filling
    // pharmacy's business, not something AssistRx collects (see
    // WorkflowEngine.ts's derivePatientRoute, which now skips straight to
    // /order-tracker for this path too). Straight to the tracker instead of
    // /delivery-address, which every other pricing pick still uses.
    navigate("/order-tracker");
  }

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-2xl mx-auto px-4 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <button
              onClick={() => navigate("/benefit-pricing")}
              className="flex items-center gap-1 text-xs font-semibold text-arx-body-copy hover:text-arx-primary transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Benefit Pricing</span>
            </button>
            <h1 className="text-xl font-bold text-arx-slate mb-1">Choose Your Retail Pharmacy</h1>
            <p className="text-sm text-arx-body-copy">
              Pick a nearby pharmacy to fill {PROGRAM.drugDisplayName} at ${price}
              {cadence ?? "/30-day supply"}.
            </p>
          </div>

          <div className="px-5 py-5">
            <div className="flex flex-col gap-3">
              {RETAIL_PHARMACIES.map((pharmacy) => (
                <button
                  key={pharmacy.name}
                  onClick={() => selectPharmacy(pharmacy)}
                  className="relative text-left rounded-xl p-4 border-2 border-arx-borders hover:border-arx-primary hover:bg-arx-sky/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center bg-arx-sky flex-shrink-0">
                      <Store className="w-4 h-4 text-arx-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-arx-slate">{pharmacy.name}</p>
                      <p className="text-xs text-arx-body-copy mt-0.5">
                        {pharmacy.address}, {pharmacy.city}, {pharmacy.state} {pharmacy.zip}
                      </p>
                      <p className="text-xs text-arx-body-copy">{pharmacy.phone}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-arx-primary">
                    <span>Select</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
