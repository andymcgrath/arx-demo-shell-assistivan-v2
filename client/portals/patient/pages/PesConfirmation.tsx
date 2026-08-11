import { CheckCircle } from "lucide-react";
import { PROGRAM } from "@/config/branding";
import { useNavigate } from "@/lib/portalRouter";

/**
 * WF5 (PrES_PAP) terminal waiting screen — ported from
 * arx-pes-prototype-omniplan's Confirmation.tsx, replacing
 * PapEnrollmentComplete.tsx (WF2's equivalent) for this flow. Reached once
 * income verification, PAP terms, delivery address, and delivery date are
 * all done — CRM/Field handle pharmacy dispatch from here, same as WF2.
 *
 * No dispatch needed on "Got it" — enrollment is already fully complete by
 * the time this screen is reached; the button just returns Home.
 */
export default function PesConfirmation() {
  const navigate = useNavigate();
  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12 bg-arx-primary">
      <div className="text-center max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-white mt-6 mb-4 leading-snug">
          Enrollment Submitted
        </h1>

        <div className="rounded-2xl p-5 mb-6 flex flex-col items-center gap-2 bg-white/15 border border-white/35">
          <CheckCircle className="w-9 h-9 text-white" />
          <p className="text-lg font-semibold text-white/90 leading-7">
            You're enrolled in the {PROGRAM.name} Patient Assistance Program
          </p>
        </div>

        <p className="text-white/90 text-sm leading-relaxed mb-4">
          Thank you for completing your enrollment application. We can now begin processing your prescription.
        </p>
        <p className="text-white/90 text-sm leading-relaxed mb-8">
          No further action is needed at this time. We'll notify you as soon as there's an update.
        </p>

        <button
          onClick={() => navigate("/")}
          className="w-full bg-white text-arx-primary font-semibold py-4 rounded-lg hover:bg-arx-sky transition-colors"
        >
          Got it
        </button>
      </div>
    </main>
  );
}
