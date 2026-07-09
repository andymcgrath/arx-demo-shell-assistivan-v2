import WelcomeCard from "@/components/home/WelcomeCard";
import InfoCard from "@/components/home/InfoCard";
import PrescriptionsSection from "@/components/home/PrescriptionsSection";
import SuggestedSection from "@/components/home/SuggestedSection";
import { usePersonaState } from "@/engine/WorkflowProvider";

export default function Index() {
  const { workflowData } = usePersonaState('patient');
  const welcomeDismissed = workflowData.welcomeDismissed;
  const enrollmentAcknowledged = workflowData.enrollmentAcknowledged;
  // Gate on enrollmentStatus (not flowType) so this doesn't need a
  // per-flow exclusion list. Once a case has actually started (CRM/iAssist
  // dispatches ENROLL — enrollmentStatus flips to 'enrolled' immediately,
  // ahead of the patient ever touching SMS/OTP/consent), the Welcome Card
  // no longer applies even if the patient later lands back on Home before
  // welcomeDismissed/enrollmentAcknowledged catch up (e.g. iAssist's
  // ENROLL-triggered auto BI-complete/PA-submit can advance the case to a
  // state where derivePatientRoute sends the patient back to "/" before
  // they've dismissed Welcome or finished consent — this previously showed
  // a stale Welcome Card here for CoA_DTP too, worked around with a
  // flowType check; this condition covers that case generally instead).
  const caseStarted = workflowData.enrollmentStatus !== 'none';

  return (
    <main className="flex-grow">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-5">
          {/* Pendo Placeholder - Welcome Card */}
          <div className="hidden" data-pendo-id="home-welcome-card" title="Pendo: Welcome Card" />
          {!welcomeDismissed && !enrollmentAcknowledged && !caseStarted && <WelcomeCard />}

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
