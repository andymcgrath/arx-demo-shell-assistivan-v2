import { CheckCircle } from "lucide-react";
import { PROGRAM } from "@/portals/patient/config/branding";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";

export default function PapEnrollmentComplete() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12 bg-arx-hero">
      <div className="text-center max-w-sm mx-auto">
        <h1 className="text-2xl font-bold text-arx-on-hero mt-6 mb-4 leading-snug">
          Congratulations!
        </h1>

        <div className="rounded-2xl p-5 mb-6 flex flex-col items-center gap-2 bg-arx-on-hero/15 border border-arx-on-hero/35">
          <CheckCircle className="w-9 h-9 text-arx-on-hero" />
          <p className="text-2xl font-semibold text-arx-on-hero/90 leading-9">
            You are qualified for the {PROGRAM.name} Patient Assistance Program
          </p>
        </div>

        <p className="text-arx-on-hero/90 text-sm leading-relaxed mb-4">
          We can now begin processing your prescription. This usually takes less than 2 business days.
        </p>
        <p className="text-arx-on-hero/90 text-sm leading-relaxed mb-8">
          No further action is needed at this time. We'll notify you as soon as there's an update.
        </p>

        <button
          onClick={() => { dispatch('REFERRAL_RECEIVED', { portal: 'patient' }); navigate("/"); }}
          className="w-full bg-white text-arx-link font-semibold py-4 rounded-lg hover:bg-arx-sky transition-colors"
        >
          Got it
        </button>
      </div>
    </main>
  );
}
