import { ArrowRight, Store } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import type { Pharmacy } from "@/engine/types";

/**
 * Network Pharmacy Selection — CoA_DME Scenario 1 only (pharmacy covered,
 * medical not).
 *
 * Reached from PharmacyCoverageSms.tsx once the patient taps through the
 * pharmacy-coverage SMS. Copies PharmacySelection.tsx's visual pattern (card
 * list, address/phone per pharmacy) and its 6-pharmacy RETAIL_PHARMACIES
 * list verbatim — but this is its own file rather than reusing that one:
 * PharmacySelection.tsx's header comment scopes it to "CoA_Copay (WF4) only"
 * and its price-display copy (a $ amount + cadence) is Copay-specific.
 * Nothing here shows a price at all — confirmed design decision: "we are not
 * paying in this scenario, so jumping to pharmacy selection fits well." No
 * Retail-vs-Mail-Order choice either (there's only one list to pick from),
 * and no Copay Program upsell.
 *
 * Selecting a card dispatches SELECT_PHARMACY, which (from coaDme.ts's
 * pharmacySmsVerified state) both assigns the pharmacy AND sets
 * pricingOption to "retail" in one action — joining pricingSelected so this
 * outcome gets CoA_Copay's Retail treatment from here on. Then navigates to
 * the confirmation screen (PharmacySelectionConfirmation.tsx), NOT directly
 * to /order-tracker — that screen's own "Got it" button makes that jump.
 *
 * /network-pharmacy-selection is listed in patient/index.tsx's
 * DELIVERY_FLOW_PATHS — pricingOption is still null while this screen is
 * showing (the SELECT_PHARMACY dispatch hasn't fired yet), so without that
 * entry StateDrivenNav's derivePatientRoute would bounce the patient right
 * back here anyway (harmless), but the entry is needed for the confirmation
 * screen one hop later, which pricingOption alone can't distinguish from
 * "already on the tracker." Same tolerance /pharmacy-selection already
 * relies on for the same reason.
 */

// Addresses are all near Keanu Dixon's home address (123 Main Street,
// Orlando, FL 32801 — see PATIENT_SEED in patientStore.ts), same convention
// coaDtp.ts's SELF_PAY_PHARMACY and WorkflowEngine.ts's
// KEANU_SITE_OF_CARE_FACTS use for anything meant to be "somewhere Keanu
// would realistically drive to." Copied verbatim from
// PharmacySelection.tsx's own RETAIL_PHARMACIES (see this file's header
// comment for why it's copied rather than shared).
const RETAIL_PHARMACIES: Pharmacy[] = [
  { name: "CVS Pharmacy #3795", address: "210 N Orange Ave", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-0142" },
  { name: "Walgreens #6021", address: "1900 E Colonial Dr", city: "Orlando", state: "FL", zip: "32803", phone: "(407) 555-0187" },
  { name: "Walmart Pharmacy #4488", address: "4315 S Orange Blossom Trail", city: "Orlando", state: "FL", zip: "32839", phone: "(407) 555-0221" },
  { name: "Rite Aid #2210", address: "1801 Edgewater Dr", city: "Orlando", state: "FL", zip: "32804", phone: "(407) 555-0134" },
  { name: "Publix Pharmacy #710", address: "2170 S Orange Ave", city: "Orlando", state: "FL", zip: "32806", phone: "(407) 555-0298" },
  { name: "Costco Pharmacy #1123", address: "5100 S Kirkman Rd", city: "Orlando", state: "FL", zip: "32819", phone: "(407) 555-0356" },
];

export { RETAIL_PHARMACIES };

export default function NetworkPharmacySelection() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  function selectPharmacy(pharmacy: Pharmacy) {
    dispatch("SELECT_PHARMACY", { portal: "patient", pharmacy });
    navigate("/pharmacy-selection-confirmation");
  }

  return (
    <main className="flex-grow pt-5 pb-8">
      <div className="max-w-2xl mx-auto px-4 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <h1 className="text-xl font-bold text-arx-slate mb-1">Choose Your Pharmacy</h1>
            <p className="text-sm text-arx-body-copy">
              Pick a nearby pharmacy in our network to fill your prescription.
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
