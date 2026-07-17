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

    // Consent confirmed — waiting for BI to finish
    if (workflowData.consentStatus === 'confirmed' &&
        workflowData.biStatus !== 'complete')
      return '/enrollment-complete';

    // BI complete, but PA hasn't been submitted yet ("PA Required" — the
    // provider hasn't started it from CoaDashboard) or has been submitted
    // and is awaiting a decision — still waiting either way.
    if (workflowData.consentStatus === 'confirmed' &&
        workflowData.biStatus === 'complete' &&
        (workflowData.paStatus === 'none' || workflowData.paStatus === 'submitted'))
      return '/enrollment-complete';

    // PA approved — a new SMS/OTP re-verification beat (mirrors the initial
    // enrollment SMS/OTP), then Retail/Mail Order pricing. This replaces the
    // old single /pa-approved screen for CoA_DTP.
    if (workflowData.paStatus === 'approved' &&
        !workflowData.paApprovedSmsVerified)
      return '/pa-approved-sms';

    if (workflowData.paStatus === 'approved' &&
        workflowData.paApprovedSmsVerified &&
        !workflowData.paApprovedOtpVerified)
      return '/pa-approved-otp';

    if (workflowData.paStatus === 'approved' &&
        workflowData.paApprovedOtpVerified &&
        workflowData.pricingOption === null)
      return '/benefit-pricing';

    // Pricing chosen (Retail, Mail, or Copay enrollment) — needs address.
    // Copay enrollment only unlocks the reduced price; the actual charge
    // happens later at the payment step (after address + date, see
    // DeliveryDate.tsx / DeliveryPayment.tsx), same as Retail/Mail.
    if (workflowData.paStatus === 'approved' &&
        workflowData.pricingOption !== null &&
        workflowData.dispatchStatus === 'none')
      return '/delivery-address';

    // PA denied — cash offer available (kept for demo flexibility; CoA_DTP's
    // live flow always approves, see coaDtp.ts)
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

    // Ship date set — Copay/self-pay does NOT collect payment through this
    // flow either (enrollment at /copay-enroll only unlocked the reduced
    // price — confirmed correct after testing, see DeliveryDate.tsx's
    // skipPayment). So once a date is set, Copay/self-pay is ready to wait
    // for fill exactly like Retail/Mail, via the rule right below.

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

    // Stay on the tracker for the final "delivered" state too, rather than
    // handing off to the generic /medication-delivered home-dashboard screen
    // (guide/prescriptions/chat) that WF1 uses. OrderTracker.tsx already
    // renders a complete "delivered" state (all 5 steps checked, Delivered
    // dated) with no CoA-specific changes needed — see buildSteps() there.
    if (workflowData.pharmacyStatus === 'delivered')
      return '/order-tracker';

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

  // ── Fax_PAP_Audit (WF2/PAP): no traditional PA ──────────────────────
  // BI completing with no_insurance leads into an FA eIncome check instead
  // of PA submission — paStatus stays 'none' for this flow forever, so this
  // branch has to run before the generic paStatus-driven checks below.
  if (flowType === 'Fax_PAP_Audit') {
    // BI still running
    if (workflowData.biStatus !== 'complete') return '/enrollment-complete';

    // BI complete (no coverage found) — Fulfillment Center has to stage an
    // "application update" message, and the patient has to tap through
    // it and confirm a code, before they can start the income check.
    // Mirrors the initial enrollment SMS→OTP beat one-for-one.
    if (workflowData.incomeStatus !== 'verified') {
      if (!workflowData.papSmsSent) return '/enrollment-complete';
      if (!workflowData.papSmsVerified) return '/pap-update-sms';
      if (!workflowData.papOtpVerified) return '/pap-update-otp';
      // Code verified but the patient hasn't tapped "Enroll" yet — land on
      // Home, where PapNoInsuranceCard explains no coverage was found and
      // offers the Patient Assistance Program instead of dropping straight
      // into the eIncome form. incomeStatus flips 'none' -> 'pending' via
      // START_INCOME_QUALIFICATION (see workflowMachine.ts) when they tap
      // that card's CTA, which is what actually unlocks the next line.
      if (workflowData.incomeStatus === 'none') return '/';
      return '/income-qualification';
    }

    // Income verified → PAP active. Patient confirms delivery address + ship
    // date — mirrors CoA_DTP/iAssist's own address/date beat (same
    // DeliveryAddress.tsx/DeliveryDate.tsx screens, same
    // PATIENT_SETS_ADDRESS/PATIENT_SELECTS_SHIP_DATE events, see
    // workflowMachine.ts). Unlike CoA/iAssist, WF2's pharmacy still isn't
    // auto-assigned — CRM's Triage tab still picks one via SELECT_PHARMACY
    // — this only adds the patient-facing address/date step ahead of that.
    if (workflowData.pharmacyStatus === 'none') {
      if (workflowData.dispatchStatus === 'none' ||
          workflowData.dispatchStatus === 'pending_selection')
        return '/delivery-address';

      if (workflowData.patientShipDate === null)
        return '/delivery-date';

      // Address + date done — CRM handles Triage (pharmacy selection/
      // dispatch) and Pharmacy Status from here; PapEnrollmentComplete.tsx
      // tells the patient there's nothing further for them to do while
      // that's in progress.
      return '/pap-enrollment-complete';
    }

    if (workflowData.pharmacyStatus === 'processing' ||
        workflowData.pharmacyStatus === 'ready')
      return '/order-tracker';

    if (workflowData.pharmacyStatus === 'shipped') return '/order-shipped';

    return '/medication-delivered';
  }

  // ── Clinical workflow ────────────────────────────────────────────────
  if (workflowData.paStatus === 'denied') return '/pa-denied';

  if (workflowData.biStatus !== 'none' &&
      workflowData.paStatus !== 'approved')
    return '/';

  // ── iAssist post-PA-approval: replicates CoA_DTP's approved-path
  // scheduling chain exactly (SMS/OTP re-verify -> pricing -> address ->
  // ship date -> fill/ship/deliver). iAssist never denies PA (see
  // iAssist.ts), so unlike the isCoA branch above this never needs the
  // paDenied/cashOfferSent/paymentProcessed detour — only the self-pay
  // PATIENT_PAYS/VERIFY_PAYMENT beat (reached the same way CoA's
  // pricingSelected/addressSet/shipDateSelected states reach it). WF1
  // (Fax_QS_PA_Approved) is untouched — it keeps the generic /pa-approved
  // screen further below.
  if (flowType === 'iAssist_PA_Approved' && workflowData.paStatus === 'approved') {
    if (!workflowData.paApprovedSmsVerified) return '/pa-approved-sms';

    if (!workflowData.paApprovedOtpVerified) return '/pa-approved-otp';

    if (workflowData.pricingOption === null) return '/benefit-pricing';

    if (workflowData.dispatchStatus === 'none' ||
        workflowData.dispatchStatus === 'pending_selection')
      return '/delivery-address';

    if (workflowData.patientShipDate === null) return '/delivery-date';

    // Retail/Mail Order cost is handled at the pharmacy counter, same as
    // CoA — only self-pay collects payment through this screen.
    if (workflowData.pricingOption === 'self_pay' && !workflowData.paymentVerified)
      return '/delivery-payment';

    if (workflowData.pharmacyStatus === 'none') return '/enrollment-complete';

    if (workflowData.pharmacyStatus === 'processing' ||
        workflowData.pharmacyStatus === 'ready')
      return '/order-tracker';

    if (workflowData.pharmacyStatus === 'shipped') return '/order-shipped';

    // Stay on the tracker for "delivered" too, same as CoA — see the isCoA
    // branch's comment above for why.
    return '/order-tracker';
  }

  // ── Delivery flow ────────────────────────────────────────────────────
  // "Schedule delivery now" only while CRM hasn't assigned a dispatch
  // pharmacy yet. dispatchStatus moves to 'pending_selection' the instant
  // PA is approved (before anyone's chosen a pharmacy), so that still counts
  // as "not yet dispatched" here. Once CRM picks a pharmacy (dispatchStatus
  // 'selected'/'dispatched'), the patient's job here is done — move to
  // tracking and stay there, even though pharmacyStatus itself doesn't flip
  // to 'processing' until FILL_RX fires later. OrderTracker already renders
  // correctly with pharmacyStatus 'none' (step 1 shows "active" not "done").
  if (workflowData.paStatus === 'approved' &&
      workflowData.pharmacyStatus === 'none' &&
      (workflowData.dispatchStatus === 'none' ||
       workflowData.dispatchStatus === 'pending_selection'))
    return '/pa-approved';

  // ── Order tracking ───────────────────────────────────────────────────
  if (workflowData.pharmacyStatus === 'delivered')
    return '/medication-delivered';

  if (workflowData.pharmacyStatus === 'shipped')
    return '/order-shipped';

  if (workflowData.pharmacyStatus === 'processing' ||
      workflowData.pharmacyStatus === 'ready' ||
      workflowData.dispatchStatus === 'selected' ||
      workflowData.dispatchStatus === 'dispatched')
    return '/order-tracker';

  return '/lock-screen';
}

export function getUndoSnapshot(snapshots: MachineContext[]): MachineContext | null {
  if (snapshots.length < 2) {
    return null;
  }

  return snapshots[snapshots.length - 2];
}
