import WelcomeCard from "@/components/home/WelcomeCard";
import InfoCard from "@/components/home/InfoCard";
import PrescriptionsSection from "@/components/home/PrescriptionsSection";
import SuggestedSection from "@/components/home/SuggestedSection";
import { usePersonaState } from "@/engine/WorkflowProvider";

export default function Index() {
  const { workflowData } = usePersonaState('patient');
  const welcomeDismissed = workflowData.welcomeDismissed;
  const enrollmentAcknowledged = workflowData.enrollmentAcknowledged;
  const flowType = workflowData.flowType;

  return (
    <main className="flex-grow">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-5">
          {/* Pendo Placeholder - Welcome Card */}
          <div className="hidden" data-pendo-id="home-welcome-card" title="Pendo: Welcome Card" />
          {!welcomeDismissed && !enrollmentAcknowledged && flowType !== 'CoA_DTP' && <WelcomeCard />}

          {/* Pendo Placeholder - Info Card */}
          <div className="hidden" data-pendo-id="home-info-card" title="Pendo: CoAssist Info Card" />
          <InfoCard />

          {/* Pendo Placeholder - Prescriptions */}
          <div className="hidden" data-pendo-id="home-prescriptions" title="Pendo: Prescriptions Section" />
          <PrescriptionsSection />

          {/* Pendo Placeholder - Suggested */}
          <div className="hidden" data-pendo-id="home-suggested" title="Pendo: Suggested for You Section" />
          <SuggestedSection />
        </div>
    </main>
  );
}
