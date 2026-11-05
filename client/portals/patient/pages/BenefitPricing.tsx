import { useEffect } from "react";
import { useNavigate } from "@/lib/portalRouter";
import PricingCard, { PricingBanner } from "@/portals/patient/components/pricing/PricingCard";
import { pricingBanner } from "@/portals/patient/components/pricing/pricingBanner";
import { COPAY_POST_ENROLL_OPTIONS, COPAY_PRE_ENROLL_OPTIONS, PRICING_OPTIONS, type PricingKey } from "@/portals/patient/components/pricing/pricingOptions";
import { usePersonaState, useWorkflowActor, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { PROGRAM } from "@/portals/patient/config/branding";
import { scenarioFacts } from "@/workflows/scenarioFacts";

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

export default function BenefitPricing() {
  const { workflowData } = usePersonaState('patient');
  const navigate = useNavigate();
  const actor = useWorkflowActor();

  // A recipe or demo can pin the pricing pick (workflows/coassist/forks.ts). The rules apply it when the PA approval
  // is verified, or route to the offer screen for a pick the patient must confirm (self-pay). Either way there is
  // no menu to show. Go to the screen the data says comes next. This runs only for a pinned pick. Opening the
  // screen from the menu after a live pick still shows the menu.
  const pinned = !!workflowData.choices?.pricing;
  const target = pinned ? derivePatientRoute(actor.getSnapshot().context) : "/benefit-pricing";
  const skipMenu = pinned && target !== "/benefit-pricing";
  useEffect(() => {
    if (skipMenu) navigate(target, { replace: true });
  }, [skipMenu, target, navigate]);
  if (skipMenu) return null;

  // CoA_Copay is the only flow where Copay isn't a third mutually-exclusive
  // pricing tier alongside Retail/Mail — see this file's header comment.
  // Every other flow (CoA_DTP, iAssist_PA_Approved) keeps the original,
  // untouched rendering below.
  if (scenarioFacts(workflowData.flowType).hasCopayFork) {
    return <CopayBenefitPricing />;
  }

  // CoA_Coverage only reaches this screen for Scenario 1 (pharmacy covered,
  // medical not — see workflows/coassist/ and WorkflowEngine.ts's
  // derivePatientRoute) — its cash-pay scenario (Scenario 3) is a completely
  // separate branch triggered only when neither benefit is covered, never a
  // patient choice on this screen, so there's no self-pay/Copay option here.
  if (scenarioFacts(workflowData.flowType).isCoverageScenario) {
    return <DefaultBenefitPricing hideSelfPay />;
  }

  return <DefaultBenefitPricing />;
}

function DefaultBenefitPricing({ hideSelfPay = false }: { hideSelfPay?: boolean }) {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState("patient");

  const pricingOptions = hideSelfPay ? PRICING_OPTIONS.filter((o) => o.key !== "self_pay") : PRICING_OPTIONS;

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
        <div className="bg-arx-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <h1 className="text-xl font-bold text-arx-slate mb-1">Your price options</h1>
          </div>

          <div className="px-5 py-5 space-y-4">
            <PricingBanner copy={pricingBanner(workflowData, PROGRAM.drugDisplayName)} />

            {/* Retail, Mail Order, then Copay — stacked vertically */}
            <div className="flex flex-col gap-4">
              {pricingOptions.map((option) => (
                <PricingCard key={option.key} option={option} onSelect={() => handleSelect(option.key)} />
              ))}
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
function CopayBenefitPricing() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState("patient");
  const copayEnrolled = workflowData.copayEnrolled;

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
        <div className="bg-arx-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
            <h1 className="text-xl font-bold text-arx-slate mb-1">Your price options</h1>
          </div>

          <div className="px-5 py-5 space-y-4">
            <PricingBanner copy={pricingBanner(workflowData, PROGRAM.drugDisplayName)} />

            <div className="flex flex-col gap-4">
              {options.map((option) => (
                // Copay's card is the main CTA only while it is still on offer (pre-enroll, always first).
                // Once enrolled, Retail and Mail are both plain picks.
                <PricingCard key={option.key} option={option} primary={!copayEnrolled && option.key === "self_pay"} onSelect={() => handleSelect(option.key)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
