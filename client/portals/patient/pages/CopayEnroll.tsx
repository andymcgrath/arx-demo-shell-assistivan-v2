import { useEffect } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, CreditCard, ShoppingBag, CheckCircle, Sparkles } from "lucide-react";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";

export default function CopayEnroll() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState('patient');
  const flowType = workflowData.flowType;
  const isCoA = flowType === "CoA_DTP";
  const isIAssist = flowType === "iAssist_PA_Approved";

  useEffect(() => {
    if (flowType === "Fax_QS_PA_Approved") {
      navigate("/pa-approved");
    }
  }, [flowType, navigate]);

  // Enrolling only unlocks the reduced $25 price — it isn't payment. That
  // happens later at the actual payment step (after address + date, see
  // DeliveryDate.tsx / DeliveryPayment.tsx), same point Retail/Mail reach
  // it. This just records the choice and continues into the same
  // address/date flow those options use.
  function enrollInCopay() {
    dispatch("SELECT_SELF_PAY", { portal: "patient" });
    navigate("/delivery-address");
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
              onClick={enrollInCopay}
              className="w-full bg-arx-primary text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-arx-primary-dark transition-colors"
            >
              <span>Enroll</span>
              <ArrowRight className="w-4 h-4" />
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
