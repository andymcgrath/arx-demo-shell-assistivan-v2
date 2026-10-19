import { CheckCircle } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
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
    <main className="flex-grow flex items-center justify-center px-6 py-12 bg-arx-hero">
      <div className="text-center max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-arx-on-hero mt-6 mb-4 leading-snug">
          Enrollment Submitted
        </h1>

        <div className="rounded-2xl p-5 mb-6 flex flex-col items-center gap-2 bg-arx-on-hero/15 border border-arx-on-hero/35">
          <CheckCircle className="w-9 h-9 text-arx-on-hero" />
          <p className="text-lg font-semibold text-arx-on-hero/90 leading-7">
            You're enrolled in the {PROGRAM.name} Patient Assistance Program
          </p>
        </div>

        <p className="text-arx-on-hero/90 text-sm leading-relaxed mb-4">
          Thank you for completing your enrollment application. We can now begin processing your prescription.
        </p>
        <p className="text-arx-on-hero/90 text-sm leading-relaxed mb-8">
          No further action is needed at this time. We'll notify you as soon as there's an update.
        </p>

        <button
          onClick={() => navigate("/")}
          className="w-full bg-white text-arx-link font-semibold py-4 rounded-lg hover:bg-arx-sky transition-colors"
        >
          Got it
        </button>
      </div>
    </main>
  );
}
