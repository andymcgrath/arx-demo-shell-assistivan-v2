import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { PROGRAM } from "@/config/branding";
import { ChevronLeft, Mic } from "lucide-react";

/**
 * WF5 (PrES_PAP) "application update" SMS — patient-portal equivalent of
 * Fax_PAP_Audit's PapUpdateSms.tsx (WF2), reproduced here as its own file
 * rather than shared/reused, matching this flow's existing isolation
 * convention (see presPap.ts's header comment: changes to WF5 can never
 * affect WF1-4, and vice versa). Staged by the CRM's Fulfillment Center once
 * BI comes back no_insurance for this flow — FulfilmentCenter.tsx's
 * isPapFlow handling already covers PrES_PAP generically, no changes needed
 * there — and gated by WorkflowEngine.ts's PrES_PAP branch the same way WF2
 * gates /pap-update-sms.
 *
 * WF5 normally renders as a plain web page, not inside the iPhone-mockup
 * frame every other flow uses (see DemoShell.tsx's Panel component) — this
 * one screen is the deliberate exception: DemoShell.tsx's
 * showPesPapUpdateSmsPhone flips WF5 back into the real phone frame for
 * exactly the papSmsSent/!papSmsVerified window this screen covers, so this
 * component fills that frame's content area the same full-bleed way
 * PapUpdateSms.tsx does for WF2, rather than a card on a web page. It's also
 * excluded from Header/Footer in patient/index.tsx's showHeaderFooter, same
 * as every other phone-mockup screen.
 *
 * One real behavioral difference from WF2's version: WF5 has no separate
 * code-verification screen, so tapping the message dispatches
 * VERIFY_PAP_SMS and goes straight back to /pes-home instead of
 * /pap-update-otp — see pes-home's own patient wrapper for how it then
 * routes into income verification instead of attestation.
 */
export default function PesPapUpdateSms() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  function handleTapMessage() {
    dispatch("VERIFY_PAP_SMS", { portal: "patient" });
    navigate("/pes-home");
  }

  return (
    <div className="h-full bg-black flex flex-col">
      {/* Header - Contact Info */}
      <div className="bg-black border-b border-gray-800 px-4 py-3 flex flex-col items-center gap-2">
        <div className="flex items-center w-full mb-2">
          <button onClick={() => navigate("/pes-home")} className="text-blue-400" aria-label="Back">
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
              There's an update on your {PROGRAM.name} Patient Assistance Program application. Tap to continue:
            </p>
            <button
              type="button"
              onClick={handleTapMessage}
              className="text-blue-400 underline font-semibold hover:opacity-80 transition-opacity block mb-2"
            >
              https://go.iassist/pap-update
            </button>
            <p className="text-xs text-gray-300">
              Reply STOP to opt out, HELP for help. Msg&amp;data rates may apply.
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
