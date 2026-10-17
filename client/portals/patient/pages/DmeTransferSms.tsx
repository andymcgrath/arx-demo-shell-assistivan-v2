import { ChevronLeft, Mic } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PROGRAM } from "@/config/branding";

// CoA_DME Scenario 2 only — both benefits covered (medical always wins).
// Mirrors PharmacyCoverageSms.tsx/CashOfferSms.tsx's exact shape (same
// second, later SMS milestone pattern — dmeTransferSmsSent/
// dmeTransferSmsVerified in engine/types.ts), except this one is sent as
// part of CRM's own NOTIFY_PROVIDER_TRANSFER action (see coaDme.ts's
// biComplete state) rather than automatically — transferring the case to
// an outside DME provider (Advanced Diabetes Supply) stays a deliberate
// CRM hand-off, unlike Scenario 1/3's fully automatic SMS. Single
// tap-through, no OTP step, straight into the terminal
// /dme-provider-transfer screen.
//
// /dme-transfer-sms is NOT in patient/index.tsx's DELIVERY_FLOW_PATHS —
// same reasoning as the other two SMS screens: derivePatientRoute
// (WorkflowEngine.ts) already targets this route directly once
// dmeProviderTransferStatus is "notified" and dmeTransferSmsVerified isn't
// yet, so StateDrivenNav landing here on its own is the correct, current
// behavior, not a stale bounce to guard against.
export default function DmeTransferSms() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  const handleTapMessage = () => {
    dispatch("VERIFY_DME_TRANSFER_SMS", { portal: "patient" });
    navigate("/dme-provider-transfer");
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
          <p className="text-xs text-gray-500 text-center">Today 2:47 PM</p>
        </div>
        {/* Incoming Message Bubble */}
        <div className="flex justify-start">
          <div className="bg-gray-700 text-white rounded-2xl rounded-tl-none px-4 py-2 max-w-xs text-sm leading-relaxed">
            <p className="mb-2">
              Good news — your {PROGRAM.name} sensor is covered under your medical benefit! Tap to see what's next:
            </p>
            <button
              onClick={handleTapMessage}
              className="text-blue-400 underline font-semibold hover:opacity-80 transition-opacity block mb-2"
            >
              https://go.iassist/d5m9
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
