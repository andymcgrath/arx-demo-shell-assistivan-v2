import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { ChevronLeft, Mic } from "lucide-react";

/**
 * PA Approved SMS — CoA_DTP and iAssist_PA_Approved (WF4 replicates this
 * screen exactly, see WorkflowEngine.ts's derivePatientRoute and
 * iAssist.ts's updatePaApprovedSmsVerified). WF1 (Fax_QS_PA_Approved) never
 * routes here.
 *
 * A second "text message" beat, separate from the original enrollment SMS
 * (SMSMessage.tsx, untouched — this is a new dedicated screen so WF1's
 * onboarding text can't be affected by anything here). Sent once PA is
 * approved, letting the patient know it's time to schedule delivery.
 * Tapping the link dispatches VERIFY_PA_APPROVED_SMS and continues to a
 * second OTP check (PaApprovedOtp.tsx) before Benefit Pricing.
 */
export default function PaApprovedSms() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  const handleTapMessage = () => {
    dispatch("VERIFY_PA_APPROVED_SMS", { portal: "patient" });
    navigate("/pa-approved-otp");
  };

  return (
    <div className="h-full bg-black flex flex-col">
      {/* Header - Contact Info */}
      <div className="bg-black border-b border-gray-800 px-4 py-3 flex flex-col items-center gap-2">
        <div className="flex items-center w-full mb-2">
          <button onClick={() => navigate("/")} className="text-blue-400">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-white mx-auto flex items-center justify-center mb-2">
              <span className="text-blue-500 font-bold" style={{ fontSize: '22px' }}>AR</span>
            </div>
          </div>
          <div className="w-6" />
        </div>
        <div className="text-center">
          <h1 className="font-semibold text-white text-base">+1 (225) 514-0411</h1>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto space-y-4">
        <div className="flex flex-col">
          <p className="text-xs text-gray-400 text-center">Text Message · SMS</p>
          <p className="text-xs text-gray-500 text-center">Today 5:33 PM</p>
        </div>
        {/* Incoming Message Bubble */}
        <div className="flex justify-start">
          <div className="bg-gray-700 text-white rounded-2xl rounded-tl-none px-4 py-2 max-w-xs text-sm leading-relaxed">
            <p className="mb-2">
              Good news! Your Assistivan prior authorization was approved. Time to schedule delivery:
            </p>
            <button
              onClick={handleTapMessage}
              className="text-blue-400 underline font-semibold hover:opacity-80 transition-opacity block mb-2"
            >
              https://go.coassist/pa-approved
            </button>
            <p className="text-xs text-gray-300">
              Reply STOP to opt out, HELP for help. Msg&data rates may apply.
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center gap-2">
        <button className="text-gray-500 hover:text-gray-400 transition-colors text-2xl">+</button>
        <div className="flex-1 bg-gray-800 rounded-full px-4 py-2 flex items-center gap-2">
          <input
            type="text"
            placeholder="Text Message · SMS"
            disabled
            className="bg-transparent flex-1 text-sm outline-none placeholder-gray-600 text-gray-400"
          />
        </div>
        <button className="text-gray-500 hover:text-gray-400 transition-colors">
          <Mic size={20} />
        </button>
      </div>
    </div>
  );
}
