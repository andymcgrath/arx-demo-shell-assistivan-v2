import { useNavigate } from "@/lib/portalRouter";
import { ChevronLeft, Mic } from "lucide-react";
import { usePersonaState } from "@/engine/WorkflowProvider";

// iAssist_PAP (WF5) auto-submits AND auto-resolves BI/PA the moment ENROLL
// fires (see workflows/iAssistPap.ts) — independent of the patient's own
// pace through this very first SMS/OTP/consent beat. That means a PA can
// already be Denied (and even appealed) before the patient has tapped this
// message, so the generic "your prescription is ready to process" copy
// would be actively wrong by the time they open it. Every other flow either
// never resolves PA this early (WF1) or never denies it in its demo path
// (WF4), so this only ever branches for WF5 in practice.
function getMessageCopy(paStatus: string, appealStatus: string): string {
  if (paStatus === "denied") {
    // !== "none" rather than === "initiated": stays accurate once the CRM
    // agent resolves the appeal to "approved" (see workflows/iAssistPap.ts's
    // APPROVE_APPEAL) — an appeal was still filed on the patient's behalf
    // either way, this copy doesn't need to change based on the outcome.
    return appealStatus !== "none"
      ? "Update: your prior authorization wasn't approved, but we've already filed an appeal on your behalf. Tap here for next steps:"
      : "Update: your prior authorization needs additional review. Tap here for next steps:";
  }
  return "Welcome! Your prescription is ready to process. Complete next step here:";
}

export default function SMSMessage() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('patient');
  const messageCopy = getMessageCopy(workflowData.paStatus, workflowData.appealStatus);

  const handleTapMessage = () => {
    navigate("/phone-verification");
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
              {messageCopy}
            </p>
            <button
              onClick={handleTapMessage}
              className="text-blue-400 underline font-semibold hover:opacity-80 transition-opacity block mb-2"
            >
              https://go.iassist/g6w9
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
