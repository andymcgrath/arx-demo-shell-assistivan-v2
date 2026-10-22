import { CheckCircle, Phone } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";

// iAssist_Buy_And_Bill. The terminal screen: the PA is approved and the HCP administers the drug, so nothing ships to
// the patient. They hear that their prescriber knows, and that they should confirm the injection date with the office
// (or keep the appointment they already have).
export default function ApprovedContactPhysician() {
  return (
    <main className="flex-grow min-h-full flex items-center justify-center px-6 py-6 bg-arx-hero">
      <div className="text-center max-w-sm mx-auto">
        <h1 className="text-h3 text-arx-on-hero mt-0 mb-3">You're approved!</h1>

        <div className="rounded-2xl p-4 mb-4 flex flex-col items-center gap-1.5 bg-arx-on-hero/15 border border-arx-on-hero/35">
          <CheckCircle className="w-7 h-7 text-arx-on-hero" />
          <p className="text-h5 text-arx-on-hero">Your {PROGRAM.name} prior authorization is approved</p>
        </div>

        <p className="text-arx-on-hero/90 text-body leading-snug mb-3">
          Your prescriber has been informed. Your injection will be given at their office.
        </p>

        <div className="rounded-2xl p-4 mb-3 flex items-start gap-2 bg-arx-on-hero/15 border border-arx-on-hero/35 text-left">
          <Phone className="w-4 h-4 text-arx-on-hero flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-arx-on-hero/90">
            Please contact your prescriber's office to confirm your injection date. If you already have an appointment, keep it.
          </p>
        </div>

        <p className="text-arx-on-hero/90 text-body leading-snug">No further action is needed from you at this time. You will be notified of next steps.</p>
      </div>
    </main>
  );
}
