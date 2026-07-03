import type { MachineContext, PersonaId } from './types';

export function getPersonaActions(state: MachineContext, persona: PersonaId): string[] {
  const { workflowData } = state;

  if (persona === 'crm') {
    return ['ENROLL', 'INVITE', 'RUN_BI', 'APPROVE_PA', 'FILL_RX'];
  }

  if (persona === 'patient') {
    const actions: string[] = [];

    if (
      workflowData.enrollmentStatus === 'pending' ||
      workflowData.enrollmentStatus === 'invited'
    ) {
      if (!workflowData.smsVerified) {
        actions.push('VERIFY_SMS');
      } else if (!workflowData.otpVerified) {
        actions.push('VERIFY_OTP');
      } else if (workflowData.consentStatus === 'pending') {
        actions.push('CONFIRM_CONSENT');
      }
    }

    if (workflowData.paStatus === 'approved') {
      actions.push('SELECT_PHARMACY');
    }

    return actions;
  }

  if (persona === 'provider') {
    if (workflowData.biStatus === 'complete' && workflowData.paStatus === 'none') {
      return ['SUBMIT_PA'];
    }
    return [];
  }

  if (persona === 'analytics') {
    return [];
  }

  return [];
}

export function getPersonaBadge(
  state: MachineContext,
  persona: PersonaId
): string | null {
  const { workflowData } = state;

  if (persona === 'crm') {
    if (workflowData.paStatus === 'submitted') return 'Awaiting PA';
    if (workflowData.enrollmentStatus === 'none') return 'Action required';
    return null;
  }

  if (persona === 'patient') {
    if (workflowData.enrollmentStatus === 'pending') return 'Action required';
    if (workflowData.enrollmentStatus === 'invited' && !workflowData.smsVerified) {
      return 'Verify SMS';
    }
    if (workflowData.smsVerified && !workflowData.otpVerified) {
      return 'Verify OTP';
    }
    if (workflowData.consentStatus === 'pending') return 'Action required';
    if (workflowData.paStatus === 'approved') return 'Select pharmacy';
    return null;
  }

  if (persona === 'provider') {
    if (workflowData.biStatus === 'complete' && workflowData.paStatus === 'none') {
      return 'Action required';
    }
    return null;
  }

  if (persona === 'analytics') {
    return null;
  }

  return null;
}

export function derivePatientRoute(state: MachineContext): string {
  const { workflowData } = state;

  const flowType = workflowData.flowType;
  const isCoA = flowType === 'CoA_DTP';

  if (isCoA) {
    // Pre-enrollment: patient hasn't received SMS yet
    if (workflowData.enrollmentStatus === 'none')
      return '/lock-screen';

    // SMS received — patient needs to tap link
    if (workflowData.enrollmentInviteSent && !workflowData.smsVerified)
      return '/sms-message';

    // SMS verified — patient needs OTP
    if (workflowData.smsVerified && !workflowData.otpVerified)
      return '/otp-verification';

    // OTP verified — patient needs to complete consent
    if (workflowData.otpVerified && workflowData.consentStatus === 'pending')
      return '/confirm-details';

    // Consent confirmed — waiting for BI/PA to process
    if (workflowData.consentStatus === 'confirmed' &&
        workflowData.biStatus !== 'complete')
      return '/enrollment-complete';

    // BI complete, PA submitted — still waiting
    if (workflowData.consentStatus === 'confirmed' &&
        workflowData.biStatus === 'complete' &&
        workflowData.paStatus === 'submitted')
      return '/enrollment-complete';

    // PA denied — cash offer available
    if (workflowData.paStatus === 'denied' &&
        workflowData.cashOfferStatus === 'none')
      return '/pa-denied';

    // Cash offer sent — patient needs to pay
    if (workflowData.cashOfferStatus === 'sent' &&
        !workflowData.paymentVerified)
      return '/delivery-payment';

    // Payment done — needs address
    if (workflowData.cashOfferStatus === 'paid' &&
        workflowData.dispatchStatus === 'none')
      return '/delivery-address';

    // Address set — needs ship date
    if (workflowData.dispatchStatus === 'selected' &&
        workflowData.patientShipDate === null)
      return '/delivery-date';

    // All patient self-service done — waiting for fill
    if (workflowData.patientShipDate !== null &&
        workflowData.pharmacyStatus === 'none')
      return '/enrollment-complete';

    // Order tracking
    if (workflowData.pharmacyStatus === 'processing' ||
        workflowData.pharmacyStatus === 'ready')
      return '/order-tracker';

    if (workflowData.pharmacyStatus === 'shipped')
      return '/order-shipped';

    if (workflowData.pharmacyStatus === 'delivered')
      return '/medication-delivered';

    return '/lock-screen';
  }

  // ── Phase gate: once otpVerified, NEVER return to pre-OTP screens ────
  const onboardingComplete = workflowData.otpVerified === true;

  // ── Pre-enrollment ──────────────────────────────────────────────────
  if (!onboardingComplete) {
    if (workflowData.enrollmentInviteSent && !workflowData.smsVerified)
      return '/sms-message';

    if (!workflowData.smsVerified) return '/lock-screen';

    if (!workflowData.otpVerified) return '/otp-verification';
  }

  // ── Onboarding (otpVerified = true, consent pending) ────────────────
  if (workflowData.consentStatus === 'pending')
    return '/confirm-details';

  // ── Post-consent waiting state ───────────────────────────────────────
  // Patient waits at home screen while BI and PA process.
  // Index.tsx hides WelcomeCard when enrollmentAcknowledged,
  // showing the passive waiting view automatically.
  if (workflowData.consentStatus === 'confirmed' &&
      workflowData.biStatus === 'none')
    return '/enrollment-complete';

  // ── Clinical workflow ────────────────────────────────────────────────
  if (workflowData.paStatus === 'denied') return '/pa-denied';

  if (workflowData.biStatus !== 'none' &&
      workflowData.paStatus !== 'approved')
    return '/';

  // ── Delivery flow ────────────────────────────────────────────────────
  if (workflowData.paStatus === 'approved' &&
      workflowData.pharmacyStatus === 'none')
    return '/pa-approved';

  // ── Order tracking ───────────────────────────────────────────────────
  if (workflowData.pharmacyStatus === 'delivered')
    return '/medication-delivered';

  if (workflowData.pharmacyStatus === 'shipped')
    return '/order-shipped';

  if (workflowData.pharmacyStatus === 'processing' ||
      workflowData.pharmacyStatus === 'ready')
    return '/order-tracker';

  return '/lock-screen';
}

export function getUndoSnapshot(snapshots: MachineContext[]): MachineContext | null {
  if (snapshots.length < 2) {
    return null;
  }

  return snapshots[snapshots.length - 2];
}
