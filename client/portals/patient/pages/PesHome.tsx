import { useNavigate } from "@/lib/portalRouter";
import PesHome from "@/components/enrollment/PesHome";
import { PROGRAM } from "@/config/branding";
import { usePersonaState } from "@/engine/WorkflowProvider";

/**
 * WF5 (PrES_PAP) patient portal entry — thin wrapper around the shared
 * role-selection screen (client/components/enrollment/PesHome.tsx). Only
 * "Patient/Caregiver" is wired here; Provider/Pharmacist are inert in this
 * portal. See the "pres-home" step in client/portals/provider/index.tsx's
 * PresPapProviderExperience for the provider portal's own wrapper, which
 * wires "Healthcare Provider" instead.
 *
 * This screen is now reached at three different points in WF5 (see
 * WorkflowEngine.ts's PrES_PAP branch): before a referral exists, while a
 * provider's referral is waiting on BI/the Fulfillment Center, and again
 * right after the patient taps the "application update" SMS
 * (PesPapUpdateSms.tsx). "I am a Patient/Caregiver" has to pick a different
 * destination for each case instead of always going to attestation — a
 * provider referral already covers attestation/patient-info/consent on the
 * patient's behalf, so this only sends a *fresh* (self-attested) patient
 * there.
 */
export default function PesHomeScreen() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('patient');

  const referredByProvider = workflowData.enrollmentStatus !== 'none';
  const waitingOnFulfillment = referredByProvider && !workflowData.papSmsVerified;

  function handleSelectPatient() {
    if (!referredByProvider) {
      navigate("/pes-attestation");
      return;
    }
    navigate(workflowData.incomeStatus === 'none' ? "/pes-income-consent" : "/pes-income-submission");
  }

  return (
    <main className="flex-grow">
      <PesHome
        programName={PROGRAM.name}
        note={waitingOnFulfillment ? "We're reviewing your referral. We'll text you as soon as there's an update." : undefined}
        // Disabled (via an undefined handler, same as the inert Provider/
        // Pharmacist links) while waiting on BI/the Fulfillment Center —
        // there's nothing to continue into yet.
        onSelectPatient={waitingOnFulfillment ? undefined : handleSelectPatient}
      />
    </main>
  );
}
