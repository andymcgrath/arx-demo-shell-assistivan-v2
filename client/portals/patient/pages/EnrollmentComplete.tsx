import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch, usePersonaState } from "@/engine/WorkflowProvider";
export default function EnrollmentComplete() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState('patient');

  // CoA_Copay (WF4) Mail Order path only — this screen is a one-time
  // "Thanks! Your details were received" stop right after the delivery
  // address is confirmed (see DeliveryAddress.tsx and patient/index.tsx's
  // DELIVERY_FLOW_PATHS). Every other flow that shares this screen is a
  // genuine wait-state where derivePatientRoute keeps recomputing
  // /enrollment-complete itself, so navigate("/") there is harmless — the
  // patient just gets bounced right back by StateDrivenNav. Mail Order is
  // different: WorkflowEngine.ts's derivePatientRoute already targets
  // /order-tracker the moment this screen shows, so "Got it" needs to go
  // there directly, mirroring Retail's tracker experience
  // (OrderTracker.tsx's RetailPharmacyTracker, broadened to also cover
  // pricingOption === 'mail_order').
  const isCopayMailOrder =
    workflowData.flowType === "CoA_Copay" && workflowData.pricingOption === "mail_order";

  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12 bg-arx-primary">
        <div className="text-center max-w-sm mx-auto">
          {/* Animated checkmark with radiating dashes */}
          <div className="relative flex items-center justify-center w-32 h-32 mx-auto mb-8">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <span
                key={deg}
                className="absolute w-5 h-0.5 rounded-full"
                style={{
                  transform: `rotate(${deg}deg) translateX(52px)`,
                  backgroundColor: "rgba(255,255,255,0.4)",
                }}
              />
            ))}
            <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-12 h-12"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4 leading-snug">
            Thanks!
            <br />
            Your details were received
          </h1>

          <p className="text-white/90 text-sm leading-relaxed mb-4">
            We can now begin processing your prescription. This usually takes less than 2 business days.
          </p>
          <p className="text-white/90 text-sm leading-relaxed mb-10">
            No further action is needed at this time. We'll notify you as soon as there's an update.
          </p>

          <button
            onClick={() => {
              dispatch('ENROLL', { portal: 'patient' });
              navigate(isCopayMailOrder ? "/order-tracker" : "/");
            }}
            className="w-full bg-white text-arx-primary font-semibold py-4 rounded-lg hover:bg-arx-sky transition-colors"
          >
            Got it
          </button>
        </div>
    </main>
  );
}
