import { ClipboardList } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { usePatientStore } from "@/store/patientStore";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";

export default function WelcomeCard() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const patientName = usePatientStore((s) => s.patientName);
  const firstName = patientName.split(" ")[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold leading-snug text-arx-slate">
          Welcome, {firstName}! Let's get your medication ready.
        </h2>
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-arx-primary">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-arx-body-copy">
        <p>
          We assist patients and caregivers with capturing secure consent and authorization for
          medications prescribed by their doctors. This usually takes about 5 minutes.
        </p>
        <p>Once completed, we'll keep you updated every step of the way.</p>
      </div>

      <button
        onClick={() => {
          dispatch('DISMISS_WELCOME', { portal: 'patient' });
          navigate("/confirm-details");
        }}
        className="mt-5 w-full text-white font-semibold py-3.5 rounded-lg transition-colors bg-arx-primary hover:bg-arx-primary-dark"
      >
        Start now
      </button>
    </div>
  );
}
