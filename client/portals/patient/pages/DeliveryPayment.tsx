import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { usePatientCase } from "@/hooks/usePatientCase";
import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { PROGRAM } from "@/config/branding";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";

const LIST_PRICE = 575;
const DISCOUNT = 426;
const TOTAL = LIST_PRICE - DISCOUNT;

// Reflects whichever price the patient actually picked on Benefit Pricing
// (see BenefitPricing.tsx's PRICING_OPTIONS) — only self_pay routes here
// today, but this stays keyed by pricingOption so the right price always
// shows if that ever changes.
const COA_PRICE_BY_OPTION: Record<string, { price: number; cadence: string }> = {
  retail: { price: 50, cadence: "" },
  mail_order: { price: 100, cadence: "" },
  self_pay: { price: 25, cadence: "/month" },
};

export default function DeliveryPayment() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState('patient');
  const flowType = workflowData.flowType;
  const isCoA = flowType === "CoA_DTP";
  const { data: patient } = usePatientCase();

  useEffect(() => {
    if (flowType === "Fax_QS_PA_Approved") {
      navigate("/delivery-confirmation");
    }
  }, [flowType, navigate]);
  const firstName = patient.patientName.split(" ")[0];

  // Records the payment on the workflow (cashOfferStatus → "paid",
  // paymentVerified → true) so the CRM's Cash Offer stage and downstream
  // Dispense actions unlock correctly. No-op on flows whose machine doesn't
  // define these events (e.g. WF1's Fax_QS_PA_Approved, which redirects away
  // from this screen above before a patient could ever click Pay).
  function completePayment() {
    dispatch("PATIENT_PAYS", { portal: "patient" });
    dispatch("VERIFY_PAYMENT", { portal: "patient" });
    navigate("/delivery-confirmation");
  }

  // Copay enrollment (CoA_DTP) — this screen doubles as the Copay enrollment
  // step: one Enroll click finishes payment, confirms with a banner, then
  // hands off to delivery address entry after a beat so the confirmation is
  // visible. Uses a local banner instead of the app's global Radix Toaster —
  // that one renders via position:fixed, and inside the phone-mockup frame
  // (DemoShell's .i17pro__screen) that only reliably lands bottom-right at
  // sm+ viewport widths, so it was invisible in the narrow phone view. This
  // banner is scoped to the card itself so it's guaranteed visible.
  const [showSuccess, setShowSuccess] = useState(false);
  function enrollAndContinue() {
    dispatch("PATIENT_PAYS", { portal: "patient" });
    dispatch("VERIFY_PAYMENT", { portal: "patient" });
    setShowSuccess(true);
    setTimeout(() => navigate("/delivery-address"), 1000);
  }

  const [email, setEmail] = useState("");
  const [autoRefill, setAutoRefill] = useState(true);
  const [breakdown, setBreakdown] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  if (isCoA) {
    const pricing = COA_PRICE_BY_OPTION[workflowData.pricingOption ?? "self_pay"] ?? COA_PRICE_BY_OPTION.self_pay;
    return (
      <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-arx-sky">
                  <span className="text-xl font-bold text-arx-primary">Rx</span>
                </div>
              </div>
              <h1 className="text-xl font-bold text-center mb-1 text-arx-slate">Assistivan Copay Program</h1>
              <p className="text-sm text-center text-arx-body-copy">
                You're almost there, {firstName}. Enroll to complete your order.
              </p>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Medication name & dosage */}
              <div>
                <p className="font-bold text-base text-arx-primary">{PROGRAM.drugDisplayName}</p>
                <p className="text-sm mt-0.5 text-arx-body-copy">{PROGRAM.description}</p>
              </div>

              {/* Simplified price */}
              <div className="rounded-xl p-4 bg-arx-neutral-100 border border-arx-borders flex items-center justify-between">
                <span className="text-sm font-semibold text-arx-slate">Your price</span>
                <span className="text-2xl font-bold text-arx-primary">
                  ${pricing.price}
                  {pricing.cadence && <span className="text-sm font-semibold">{pricing.cadence}</span>}
                </span>
              </div>

              <ul className="space-y-1.5">
                {[
                  "No separate insurance approval required",
                  "Fills through the CoAssist Pharmacy",
                  "Cancel anytime",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-arx-body-copy">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-arx-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={enrollAndContinue}
                className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg hover:bg-arx-primary-dark transition-colors"
              >
                Enroll
              </button>
            </div>
          </div>
        </div>

        {showSuccess && (
          <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-arx-slate text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-4">
              <CheckCircle className="w-4 h-4 text-arx-primary flex-shrink-0" />
              <span>Success! You're enrolled in the Assistivan Copay Program.</span>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-arx-borders overflow-hidden">

            {/* Header band */}
            <div className="px-5 pt-5 pb-4 border-b border-arx-borders">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-arx-sky">
                  <span className="text-xl font-bold text-arx-primary">Rx</span>
                </div>
              </div>
              <h1 className="text-xl font-bold text-center mb-1 text-arx-slate">Payment Information</h1>
              <p className="text-sm text-center text-arx-body-copy">
                You're almost there, {firstName}. Please review and confirm the order.
              </p>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Drug name */}
              <div>
                <p className="font-bold text-base text-arx-primary">{PROGRAM.drugDisplayName}</p>
                <p className="text-sm mt-0.5 text-arx-body-copy">{PROGRAM.description}</p>
              </div>

              {/* Payment summary */}
              <div>
                <p className="font-bold text-sm mb-3 text-arx-slate">Payment summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-arx-body-copy">List Price</span>
                    <span className="text-arx-slate">${LIST_PRICE.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-arx-body-copy">Patient Access Program Discount</span>
                    <span className="text-arx-primary font-semibold">-${DISCOUNT.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-start pt-2 border-t border-arx-borders">
                    <div>
                      <p className="font-bold text-base text-arx-slate">Total due today</p>
                      <p className="text-sm mt-0.5 text-arx-body-copy">30-day supply</p>
                    </div>
                    <span className="font-bold text-base text-arx-slate">${TOTAL.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-arx-primary">You saved ${DISCOUNT}</span>
                  <button
                    onClick={() => setBreakdown(v => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-arx-primary hover:text-arx-primary-80 transition-colors"
                  >
                    {breakdown ? "hide" : "view"} full breakdown
                    {breakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {breakdown && (
                  <div className="mt-2 p-3 rounded-lg text-xs space-y-1 bg-arx-neutral-100 text-arx-body-copy">
                    <div className="flex justify-between">
                      <span>CoAssist Self-Pay (0.8 mg starter)</span>
                      <span>$149.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Patient Access Program Discount applied</span>
                      <span className="text-arx-primary">-$426.00</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Receipt email */}
              <div>
                <p className="text-sm font-semibold mb-2 text-arx-slate">We'll send your receipt here:</p>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-arx-borders text-arx-slate focus:border-arx-primary transition-colors"
                />
              </div>

              {/* Auto-refill */}
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="flex-shrink-0 mt-0.5">
                  <input type="checkbox" checked={autoRefill} onChange={e => setAutoRefill(e.target.checked)} className="sr-only" />
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: autoRefill ? "#007178" : "#fff",
                      border: `2px solid ${autoRefill ? "#007178" : "#E0E0E0"}`,
                    }}
                  >
                    {autoRefill && (
                      <svg viewBox="0 0 12 9" fill="none" className="w-3 h-3">
                        <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-arx-slate">Continue my prescription automatically</p>
                  <p className="text-xs mt-0.5 leading-relaxed text-arx-body-copy">
                    We'll process your prescription each month to avoid gaps in treatment. You'll receive a reminder 3 days before it's processed, and you can cancel anytime.
                  </p>
                </div>
              </label>

              {/* Apple Pay */}
              <button
                onClick={completePayment}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-white bg-black hover:bg-arx-slate transition-colors"
              >
                <svg viewBox="0 0 60 26" className="h-5 fill-white" aria-hidden="true">
                  <path d="M11.9 3.6c-.8 1-2 1.7-3.3 1.6-.2-1.3.5-2.7 1.2-3.5C10.6.7 12 0 13.1.1c.1 1.4-.4 2.7-1.2 3.5zm1.2 1.8c-1.8-.1-3.4 1-4.3 1-.9 0-2.2-1-3.7-.9C3.3 5.6 1.6 6.7.8 8.4c-1.7 3 .4 7.4 1.9 9.8.7 1.1 1.6 2.4 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.2-2.6 0 0-2.4-1-2.4-3.7 0-2.3 1.9-3.4 2-3.5-.9-1.5-2.5-1.7-2.7-1.7z" />
                  <text x="18" y="18" fontSize="14" fontFamily="-apple-system, sans-serif" fontWeight="600">Pay</text>
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-arx-borders" />
                <span className="text-xs text-arx-body-copy">Or pay another way</span>
                <div className="flex-1 h-px bg-arx-borders" />
              </div>

              {/* Pay with Card */}
              <div className="rounded-xl overflow-hidden border border-arx-borders">
                <button
                  onClick={() => setCardOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-arx-slate bg-white hover:bg-arx-background transition-colors"
                >
                  <span>Pay with Card</span>
                  {cardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {cardOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-arx-borders">
                    <input type="text" placeholder="Card number" className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-arx-borders text-arx-slate focus:border-arx-primary transition-colors" />
                    <div className="flex gap-3">
                      <input type="text" placeholder="MM / YY" className="flex-1 px-4 py-3 rounded-xl text-sm outline-none border border-arx-borders text-arx-slate focus:border-arx-primary transition-colors" />
                      <input type="text" placeholder="CVC" className="flex-1 px-4 py-3 rounded-xl text-sm outline-none border border-arx-borders text-arx-slate focus:border-arx-primary transition-colors" />
                    </div>
                    <button
                      onClick={completePayment}
                      className="w-full font-semibold py-3.5 rounded-lg border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
                    >
                      Pay ${TOTAL}
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-center leading-relaxed text-arx-body-copy">
                By clicking Pay, you agree to the{" "}
                <a href="#" className="underline text-arx-primary">Terms</a> and{" "}
                <a href="#" className="underline text-arx-primary">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
    </main>
  );
}
