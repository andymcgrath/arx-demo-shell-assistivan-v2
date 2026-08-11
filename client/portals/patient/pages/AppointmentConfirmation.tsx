import { Mic } from "lucide-react";
import { usePersonaState } from "@/engine/WorkflowProvider";

// iAssist_PAP (WF5) only — terminal screen for this flow, styled as a text
// message from the doctor's office confirming the infusion appointment
// (mirrors SMSMessage.tsx's bubble pattern). Nothing navigates away from
// here — derivePatientRoute (WorkflowEngine.ts) lands the patient here once
// infusionDate is set and keeps them here, since dispatch to the site of
// care ("Keanu to facility") happens entirely on the CRM side from this
// point on.

function formatDate(iso: string | null): string {
  if (!iso) return "your scheduled date";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function AppointmentConfirmation() {
  const { workflowData } = usePersonaState('patient');
  const dateStr = formatDate(workflowData.infusionDate);

  return (
    <div className="h-full bg-black flex flex-col">
      {/* Header - Contact Info */}
      <div className="bg-black border-b border-gray-800 px-4 py-3 flex flex-col items-center gap-2">
        <div className="flex items-center w-full mb-2">
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-white mx-auto flex items-center justify-center mb-2">
              <span className="text-blue-500 font-bold" style={{ fontSize: '20px' }}>Dr</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <h1 className="font-semibold text-white text-base">Dr. Sarah Chen's Office</h1>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto space-y-4">
        <div className="flex flex-col">
          <p className="text-xs text-gray-400 text-center">Text Message · SMS</p>
          <p className="text-xs text-gray-500 text-center">Today 9:14 AM</p>
        </div>
        {/* Incoming Message Bubble */}
        <div className="flex justify-start">
          <div className="bg-gray-700 text-white rounded-2xl rounded-tl-none px-4 py-2 max-w-xs text-sm leading-relaxed">
            <p className="mb-2">
              Hi Keanu, this is Dr. Chen's office. Your infusion appointment is confirmed for {dateStr} at our Houston site of care. We look forward to seeing you.
            </p>
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
