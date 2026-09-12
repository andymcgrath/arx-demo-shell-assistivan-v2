import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, CreditCard, ShoppingBag, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { usePatientToastStore } from "@/store/patientToastStore";

export default function CopayEnroll() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState('patient');
  const showPatientToast = usePatientToastStore((s) => s.show);
  const flowType = workflowData.flowType;
  const isCoA = flowType === "CoA_DTP" || flowType === "CoA_Copay";
  const isIAssist = flowType === "iAssist_PA_Approved";
  const isCopayWorkflow = flowType === "CoA_Copay";
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (flowType === "Fax_QS_PA_Approved") {
      navigate("/pa-approved");
    }
  }, [flowType, navigate]);

  // Enrolling only unlocks the reduced price — it isn't payment. That
  // happens later at the actual payment step (after address + date, see
  // DeliveryDate.tsx / DeliveryPayment.tsx), same point Retail/Mail reach
  // it. This just records the choice.
  //
  // CoA_Copay (WF4) is the one exception, in two ways:
  //  1. Enrolling doesn't pick a pharmacy at all (see coaCopay.ts's new
  //     copayEnrolled state) — the patient still has to choose Retail or
  //     Mail Order as the fulfillment channel, so it routes back to
  //     /benefit-pricing instead of straight to /delivery-address.
  //  2. It simulates a verification check first — same technique as
  //     IncomeQualification.tsx/PapIncomeVerification.tsx/
  //     PesIncomeSubmission.tsx: a disabled, spinning button behind a
  //     setTimeout — then confirms with a toast before navigating back.
  //     The toast goes through patientToastStore rather than sonner's
  //     `toast()` — see that store's docblock for why: sonner's toast queue
  //     is shared app-wide, so it can't be scoped to just the iPhone frame.
  // CoA_DTP/iAssist are unaffected either way — still an instant dispatch +
  // navigate straight into the same address/date flow Retail/Mail use.
  function enrollInCopay() {
    if (!isCopayWorkflow) {
      dispatch("SELECT_SELF_PAY", { portal: "patient" });
      navigate("/delivery-address");
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      dispatch("SELECT_SELF_PAY", { portal: "patient" });
      setIsVerifying(false);
      showPatientToast("You're enrolled in the Assistivan Copay Program");
      navigate("/benefit-pricing");
    }, 1800);
  }

  if (isCoA || isIAssist) {
    return (
      <main className="flex-grow pt-5 pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 bg-arx-sky">
                <Sparkles className="w-5 h-5 text-arx-primary" />
              </div>
              <div>
                <p className="font-bold text-xl text-arx-slate">Assistivan Copay Program</p>
                <p className="text-2xl font-bold mt-0.5 text-arx-primary">
                  As low as $25<span className="text-sm font-semibold">/month</span>
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-5">
              {[
                "No separate insurance approval required",
                // CoA_Copay no longer fills through a dedicated CoAssist
                // Pharmacy (see coaCopay.ts's copayEnrolled state) — the
                // patient picks Retail or Mail Order right after enrolling.
                // CoA_DTP/iAssist are unaffected — they keep the original line.
                isCopayWorkflow ? "Fill through Retail or Mail Order — you'll choose next" : "Fills through the CoAssist Pharmacy",
                "Cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-arx-body-copy">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-arx-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={enrollInCopay}
              disabled={isVerifying}
              className={`w-full text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                isVerifying ? "bg-arx-primary cursor-not-allowed opacity-90" : "bg-arx-primary hover:bg-arx-primary-dark"
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying enrollment…</span>
                </>
              ) : (
                <>
                  <span>Enroll</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[10px] mt-3 leading-relaxed text-arx-body-copy">
              Government insurance beneficiaries (Medicare, Medicaid, VA, TRICARE) are not eligible for the Assistivan Copay Program. Terms and conditions apply.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow pt-5 pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <h2 className="text-xl font-bold mb-1 text-arx-slate">Your savings options</h2>
            <p className="text-sm mb-5 text-arx-body-copy">
              Choose the option that works best for you to reduce your out-of-pocket cost for Assistivan.
            </p>

            {/* Option 1: Savings Card */}
            <div className="rounded-xl p-4 mb-4 bg-arx-neutral-100 border border-arx-borders">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 bg-arx-sky">
                  <CreditCard className="w-5 h-5 text-arx-primary" />
                </div>
                <div>
                  <p className="font-bold text-base text-arx-slate">Assistivan Savings Card</p>
                  <p className="text-2xl font-bold mt-0.5 text-arx-primary">
                    As low as $25<span className="text-sm font-semibold">/month</span>
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 mb-4">
                {[
                  "Requires commercial drug insurance that covers Assistivan",
                  "Valid for 1-month, 2-month, or 3-month fills",
                  "Free to enroll — no additional fees",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-arx-body-copy">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-arx-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-arx-primary text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-arx-primary-dark transition-colors">
                <span>Enroll in Savings Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Option 2: CoAssist Self-Pay */}
            <div className="rounded-xl p-4 bg-arx-neutral-100 border border-arx-borders">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 bg-arx-sky">
                  <ShoppingBag className="w-5 h-5 text-arx-primary" />
                </div>
                <div>
                  <p className="font-bold text-base text-arx-slate">CoAssist Self-Pay</p>
                  <p className="text-2xl font-bold mt-0.5 text-arx-primary">
                    From $149<span className="text-sm font-semibold">/month</span>
                  </p>
                </div>
              </div>

              {/* Dose pricing table */}
              <div className="mb-4 rounded-lg overflow-hidden border border-arx-borders">
                {[
                  { dose: "0.8 mg (starter)", price: "$149/mo" },
                  { dose: "2.5 mg", price: "$199/mo" },
                  { dose: "5.5 mg – 17.2 mg", price: "$299/mo" },
                ].map((row, i, arr) => (
                  <div
                    key={row.dose}
                    className={`flex items-center justify-between px-3 py-2.5 text-sm ${i % 2 === 0 ? "bg-white" : "bg-arx-neutral-100"} ${i < arr.length - 1 ? "border-b border-arx-borders" : ""}`}
                  >
                    <span className="text-arx-body-copy">{row.dose}</span>
                    <span className="font-semibold text-arx-slate">{row.price}</span>
                  </div>
                ))}
              </div>

              <ul className="space-y-1.5 mb-4">
                {[
                  "No insurance required — pay directly",
                  "Delivered discreetly to your home",
                  "Refill within 45 days to maintain pricing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-arx-body-copy">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-arx-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/delivery-address")}
                className="w-full font-semibold py-3 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
              >
                <span>Order via CoAssist</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] mt-3 leading-relaxed text-arx-body-copy">
              Government insurance beneficiaries (Medicare, Medicaid, VA, TRICARE) are not eligible for the Assistivan Savings Card. Terms and conditions apply.
            </p>
          </div>

        </div>
    </main>
  );
}
