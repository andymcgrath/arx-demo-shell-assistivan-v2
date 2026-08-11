import type { MachineContext, PersonaId } from './types';
import { daysFromToday } from '@/lib/relativeDate';

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

  // ── PrES_PAP (WF5): its own capture flow, entirely separate from the
  // shared WF1/WF2/WF4 onboarding logic below ──────────────────────────
  // Self-attestation, patient info, and typed e-signature consent replace
  // the SMS/OTP-based onboarding every other flow uses (see presPap.ts's
  // header comment and the Pes*.tsx screens). Returns early so none of the
  // generic otpVerified-gated logic below ever runs for this flow — WF5's
  // real UI never shows /lock-screen, /sms-message, or /otp-verification,
  // even though PesAttestation.tsx fires those underlying events in one
  // bundled dispatch to drive the shared machine forward.
  if (flowType === 'PrES_PAP') {
    // Pre-enrollment: role selection, then self-attestation directly — no
    // CRM referral/SMS needed first, unlike every other flow. /pes-home and
    // /pes-attestation share this exact same condition (enrollmentStatus
    // 'none'); see DELIVERY_FLOW_PATHS in patient/index.tsx for how the
    // portal tolerates moving from one to the other without derivePatientRoute
    // bouncing the patient back to /pes-home.
    if (workflowData.enrollmentStatus === 'none') return '/pes-home';

    // Attested but not yet consented — PesPatientInfo -> PesConsent are a
    // single manual-navigate phase, gated as one unit here (same pattern
    // ConfirmDetails -> Consent -> Signature already uses elsewhere: only
    // the phase's entry screen is derived; the pages navigate() between
    // themselves without an intermediate actor dispatch in between).
    if (workflowData.consentStatus === 'pending') return '/pes-patient-info';

    // Consent confirmed — the provider's referral already covered
    // attestation, patient info, and consent, so from here the patient
    // portal has nothing active for the patient to do until the
    // Fulfillment Center's PAP "application update" SMS goes out. BI runs
    // automatically the moment consent confirms (CRM Index.tsx's generic
    // consentStatus-confirmed effect — not flow-specific) and completes
    // with biResult 'no_insurance' once a CRM agent opens the BI stage tab
    // (also generic — see isPapFlow there); none of that needs a
    // patient-facing screen, so the portal just parks on pes-home for the
    // whole wait instead of the shared /enrollment-complete screen every
    // other flow uses here.
    if (workflowData.consentStatus === 'confirmed' && !workflowData.papSmsSent) {
      return '/pes-home';
    }

    // Fulfillment Center sent the update — same SMS bubble WF2 uses
    // (mirrored here as PesPapUpdateSms.tsx via FulfilmentCenter.tsx's
    // already-generic isPapFlow handling), until the patient taps through.
    // WF5 has no separate code-verification screen the way WF2's
    // /pap-update-otp does — tapping the message goes straight back to
    // pes-home (see PesPapUpdateSms.tsx), where the "I am a Patient/
    // Caregiver" link now continues into income verification instead of
    // attestation (see pes-home's patient wrapper).
    if (!workflowData.papSmsVerified) return '/pes-pap-update-sms';

    // Tapped — parked on pes-home again until the patient clicks through
    // into income verification (PesIncomeConsent -> PesIncomeSubmission ->
    // PesPapTerms), same single-gate-per-phase pattern as every other
    // phase here. /pes-income-consent is in patient/index.tsx's
    // DELIVERY_FLOW_PATHS so that manual click isn't bounced back to
    // pes-home before incomeStatus actually changes.
    if (workflowData.incomeStatus !== 'verified') {
      return workflowData.incomeStatus === 'none' ? '/pes-home' : '/pes-income-submission';
    }

    // Income verified, PAP terms agreed → PAP active. Same address/date
    // beat WF2/CoA_DTP/iAssist use (PATIENT_SETS_ADDRESS/
    // PATIENT_SELECTS_SHIP_DATE, DeliveryAddress.tsx/DeliveryDate.tsx,
    // unchanged).
    if (workflowData.pharmacyStatus === 'none') {
      if (workflowData.dispatchStatus === 'none' || workflowData.dispatchStatus === 'pending_selection')
        return '/delivery-address';

      if (workflowData.patientShipDate === null) return '/delivery-date';

      // Address + date done — CRM handles Triage/dispatch from here, same
      // as WF2. PesConfirmation.tsx is WF5's own version of
      // PapEnrollmentComplete.tsx.
      return '/pes-confirmation';
    }

    if (workflowData.pharmacyStatus === 'processing' || workflowData.pharmacyStatus === 'ready')
      return '/order-tracker';

    if (workflowData.pharmacyStatus === 'shipped') return '/order-shipped';

    return '/medication-delivered';
  }

  // ── iAssist_PAP (WF5) fast-forward ────────────────────────────────────
  // This flow's BI/PA/Appeal race ahead of the patient's own SMS/OTP/consent
  // pace the moment ENROLL fires (see workflows/iAssistPap.ts) — a real,
  // reachable state is "appeal already filed or approved, patient portal
  // never opened yet, consentStatus still 'pending'". Without this, opening
  // the portal for the first time at that point would force the patient
  // through lock-screen/SMS/OTP/confirm-details before ever reaching the
  // denial/appeal screens CRM, iAssist, and Field already show — a jarring
  // interrupt with no real purpose, since there's nothing left for the
  // patient to actually consent to that hasn't already happened. Assume
  // consent so routing skips straight to the resolved state instead.
  const assumeConsentGiven =
    flowType === 'iAssist_PAP' &&
    workflowData.appealStatus !== 'none' &&
    workflowData.consentStatus === 'pending';

  // ── Phase gate: once otpVerified, NEVER return to pre-OTP screens ────
  const onboardingComplete = workflowData.otpVerified === true || assumeConsentGiven;

  // ── Pre-enrollment ──────────────────────────────────────────────────
  if (!onboardingComplete) {
    if (workflowData.enrollmentInviteSent && !workflowData.smsVerified)
      return '/sms-message';

    if (!workflowData.smsVerified) return '/lock-screen';

    if (!workflowData.otpVerified) return '/otp-verification';
  }

  // ── Onboarding (otpVerified = true, consent pending) ────────────────
  if (workflowData.consentStatus === 'pending' && !assumeConsentGiven)
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
  // PrES_PAP (WF5) has its own dedicated branch above and never reaches
  // here.
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
  // iAssist_PAP (WF5): its PA stays 'denied' forever (see iAssistPap.ts) —
  // once the appeal is approved (appealStatus flips via APPROVE_APPEAL in
  // crm/pages/Index.tsx), the patient should see the same approval
  // messaging/next-steps any other flow's approved PA gets, not keep
  // sitting on /pa-denied's "still working on it" copy. Checked before the
  // generic paStatus === 'denied' fallback right below, which would
  // otherwise catch this flow forever since paStatus itself never changes.
  // No SMS/OTP re-verify or pricing gate here (unlike iAssist_PA_Approved's
  // own post-approval branch above) — that scheduling chain was never part
  // of this flow's intended script (see iAssistPap.ts's header), dispatch
  // already unlocked the moment the appeal was filed.
  if (flowType === 'iAssist_PAP' && workflowData.appealStatus === 'approved') {
    // WF5 dispenses "Keanu to facility" — a site of care, not a pharmacy
    // shipment — so it never touches pharmacyStatus at all (that field stays
    // 'none' for this flow's whole post-appeal path; see crm/pages/Index.tsx's
    // SITES_OF_CARE/officeDispenseOptions and the Dispatch to Triage stage).
    // Once the patient has picked an infusion date, this is a terminal
    // screen — CRM handles dispatch to the site of care from here with no
    // further patient-facing screens (AppointmentConfirmation.tsx).
    if (workflowData.infusionDate !== null) return '/appointment-confirmation';

    // Not yet scheduled — patient picks a date on InfusionDate.tsx.
    return '/pa-approved';
  }

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

// ── Live work items ───────────────────────────────────────────────────────────
//
// "Missing Information" and "Prior Authorization Requested" are the same two
// tasks CRM's "Related Tasks" case tab and Field Portal's "My Tasks" both
// display for the active patient — one task, two locations. They used to be
// computed independently in each portal, and disagreed: CRM's Related Tasks
// tab closed "Missing Information" on biStatus === 'complete', while CRM's
// own live Enrollment Assistance stage card (EA-14272) and Field Portal both
// correctly close it on consentStatus === 'confirmed'. This is the one place
// that decides, so both portals show identical status for identical
// workflowData — task progression is driven by these stage transitions, not
// by each portal's own copy of the logic.
export interface LiveWorkItem {
  id: string;
  refId: string;
  status: 'Open' | 'Closed';
  // Every item was 'High' until the infusion-scheduled item below, which is
  // purely informational (nothing left to action) — 'Medium' distinguishes
  // it from the genuinely urgent items above.
  priority: 'High' | 'Medium';
  dueDate: string;
  assignedTo: string;
  description: string;
}

export interface LiveWorkItemInputs {
  enrollmentStatus: string;
  consentStatus: string;
  biStatus: string;
  paStatus: string;
  // iAssist_PAP (WF5) only — its paStatus stays 'denied' forever even after
  // a payer overturns that denial on appeal (see workflows/iAssistPap.ts),
  // so the PA task below needs this to know the PA is actually resolved.
  // Stays 'none' for every other flow, so it never affects them.
  appealStatus: string;
  // iAssist_PAP (WF5) only — drives the 'infusion-scheduled' live item
  // below. Null for every other flow.
  infusionDate: string | null;
  // Fax_PAP_Audit patients never have insurance (CRM's own BI stage always
  // resolves biResult to 'no_insurance' for this flow — see paStage's
  // `!isPapFlow` check in crm/pages/Index.tsx), so there's no real Prior
  // Authorization step to submit. Without this, biStatus still reaches
  // 'complete' the same way it does on every other flow, and the PA task
  // below would appear and sit "Open" forever, since paStatus never leaves
  // 'none' on this flow either.
  flowType: string;
}

export function getLiveWorkItems(input: LiveWorkItemInputs): LiveWorkItem[] {
  // Field doesn't work referrals that haven't been enrolled yet, and CRM has
  // nothing case-related to show either — neither task exists before this.
  if (input.enrollmentStatus !== 'enrolled') {
    return [];
  }

  const isPapFlow = input.flowType === 'Fax_PAP_Audit' || input.flowType === 'PrES_PAP';

  const items: LiveWorkItem[] = [
    {
      id: 'missing-information',
      refId: 'Missing Information',
      // Matches CRM's live EA-14272 (Enrollment Assistance) stage card, which
      // is the actual source of truth for "is enrollment done" — not biStatus.
      status: input.consentStatus === 'confirmed' ? 'Closed' : 'Open',
      priority: 'High',
      dueDate: daysFromToday(0),
      assignedTo: 'Sarah Mitchell',
      description: 'Gather missing patient information for enrollment',
    },
  ];

  // Appears once Benefits Investigation completes — that's the stage
  // transition that makes submitting a PA the next actionable thing to do,
  // matching CRM's existing trigger for this row (Field Portal previously
  // waited until paStatus !== 'none', i.e. after submission had already
  // happened, which is too late for this to function as a to-do). Excluded
  // entirely for Fax_PAP_Audit — see the flowType comment above.
  if (input.biStatus === 'complete' && !isPapFlow) {
    items.push({
      id: 'pa-submission-required',
      refId: 'Prior Authorization Requested',
      // appealStatus === 'approved' covers iAssist_PAP (WF5): its paStatus
      // never itself flips to 'approved' (see comment above), so without
      // this the task sat "Open" forever even after the payer overturned
      // the denial on appeal and every other portal had moved on.
      status: (input.paStatus === 'approved' || input.appealStatus === 'approved') ? 'Closed' : 'Open',
      priority: 'High',
      dueDate: daysFromToday(2),
      assignedTo: 'Sarah Mitchell',
      description: 'Submit Prior Authorization request to payer',
    });
  }

  // iAssist_PAP (WF5) only — appealStatus stays 'none' for every other flow
  // (see engine/types.ts), so this never appears elsewhere. Without a
  // dedicated task, the only place the appeal itself showed up was a
  // generic default-case "Status Update" email in getGeneratedEmails()
  // below linking to the live CASE — no task in Field Portal or CRM's
  // Related Tasks ever mentioned the appeal existed, filed or approved.
  if (input.appealStatus !== 'none') {
    items.push({
      id: 'appeal-review',
      refId: 'Appeal Filed with Payer',
      status: input.appealStatus === 'approved' ? 'Closed' : 'Open',
      priority: 'High',
      dueDate: daysFromToday(10),
      assignedTo: 'Sarah Mitchell',
      description: 'Monitor payer response to the Prior Authorization appeal',
    });
  }

  // iAssist_PAP (WF5) only — infusionDate stays null for every other flow
  // (see engine/types.ts). Purely informational once scheduled — there's
  // nothing further for Field Portal to action, unlike the Appeal task
  // above, so this opens Closed rather than sitting Open until something
  // else resolves it.
  if (input.infusionDate !== null) {
    items.push({
      id: 'infusion-scheduled',
      refId: 'Infusion Appointment Scheduled',
      status: 'Closed',
      priority: 'Medium',
      dueDate: new Date(input.infusionDate).toLocaleDateString(),
      assignedTo: 'Sarah Mitchell',
      description: 'Patient scheduled an infusion appointment at their site of care',
    });
  }

  return items;
}

// ── Generated emails ─────────────────────────────────────────────────────────
// Field Portal's email client doesn't maintain its own queue. Every email it
// shows is derived, on every render, from the actor's own event log (the same
// `events` array useDemoState() already exposes) plus the patient's current
// prescriber. That's why nothing here is stored anywhere: a status change
// that's never opened in Field Portal still generated its email the moment
// it happened, and the next status change adds the next one to the same
// list. Read state (which emails have been opened) is bookkeeping kept
// separately in fieldStore.ts, the same way comments are kept separate from
// the FieldItem list.
//
// This is an FRM's own inbox, not the patient's or prescriber's — every
// email here is an internal notification about activity on one of the
// FRM's patients, addressed to the FRM (`frmName`), not to the patient or
// HCP the activity is about. Each one links to the specific task or case in
// Field Portal it's reporting on (`linkedItemId`), so opening it and
// clicking through lands the FRM directly on that record's detail screen —
// the same ids field/index.tsx's own liveItems/liveCase already use, kept
// here as shared constants so the two can't drift apart.

/** Field Portal ids for this patient's two live tasks and their one live
 * case (see liveItems/liveCase in client/portals/field/index.tsx) — shared
 * here so a generated email's `linkedItemId` always resolves to a real row
 * in Field Portal's Task/Case detail view. */
export const LIVE_CASE_ID = 'LIVE-CASE-AS164543';
export const LIVE_MISSING_INFO_TASK_ID = 'LIVE-MISSING-INFORMATION';
export const LIVE_PA_TASK_ID = 'LIVE-PA-SUBMISSION-REQUIRED';
/** iAssist_PAP (WF5) only — see getLiveWorkItems' 'appeal-review' item above. */
export const LIVE_APPEAL_TASK_ID = 'LIVE-APPEAL-REVIEW';
/** iAssist_PAP (WF5) only — see getLiveWorkItems' 'infusion-scheduled' item above. */
export const LIVE_INFUSION_TASK_ID = 'LIVE-INFUSION-SCHEDULED';

/**
 * Keanu Dixon's one seeded Site of Care — shared raw facts (not a full
 * FieldSOC/Pharmacy record, since Field Portal's SOC shape and CRM's
 * Pharmacy/dispense shape differ) so field/index.tsx's liveSOCs entry and
 * crm/pages/Index.tsx's Office Dispense options describe the exact same
 * facility instead of two hand-typed copies that could quietly drift.
 * iAssist_PAP (WF5) only — this is where "Office Dispense" stops meaning a
 * specialty pharmacy and starts meaning the facility Keanu physically goes
 * to for his infusion.
 */
export const KEANU_SITE_OF_CARE_FACTS = {
  facilityName: 'Houston SOC',
  npi: '1699006677',
  contactName: 'Priya Sandhu',
  contactPhone: '(713) 555-3006',
  address: '800 Bagby St',
  city: 'Houston',
  state: 'Texas',
  zip: '77002',
};

/** Minimal event shape this function needs — matches useDemoState()'s
 * snake_case DemoEvent so callers can pass that array through unchanged. */
export interface GeneratedEmailSourceEvent {
  id: string;
  event_type: string;
  created_at: string;
}

export interface GeneratedEmail {
  id: string;
  eventType: string;
  subject: string;
  to: string;
  sentAt: string;
  bodyParagraphs: string[];
  /** The task or case (client/store/fieldStore.ts FieldItem id) this
   * notification is about — the client's "View Task" / "View Case" link
   * jumps straight to that record's detail screen in Field Portal. */
  linkedItemId?: string;
  linkedItemLabel?: string;
}

export interface GeneratedEmailInputs {
  events: GeneratedEmailSourceEvent[];
  patientName: string;
  prescriberName: string;
  frmName: string;
  biResult: 'coverage_found' | 'no_coverage' | 'no_insurance' | null;
  // iAssist_PAP (WF5) only — read directly off current workflow state
  // (like biResult above) rather than event.metadata, since createEvent()
  // never populates metadata (see workflows/iAssistPap.ts) — the event log
  // alone can't say WHICH date got picked, just that the event fired. Null
  // for every other flow.
  infusionDate: string | null;
}

// Identity-verification substeps and the welcome-banner dismissal aren't
// milestones an FRM would expect a separate notification about — they're
// folded into the enrollment/consent narrative instead of each generating
// their own noisy entry.
const NON_EMAIL_EVENT_TYPES = new Set([
  'DISMISS_WELCOME',
  'VERIFY_SMS',
  'VERIFY_OTP',
  'VERIFY_PAP_SMS',
  'VERIFY_PAP_OTP',
]);

function formatSentAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function friendlyEventLabel(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Maps the actor's event log into the exact set of notification emails
 * this FRM should have waiting. One entry in, one email out (aside from the
 * excluded types above) — nothing is summarized or batched, so the list
 * always matches the real event history exactly, including events that
 * happened while nobody was looking at the email client.
 */
export function getGeneratedEmails(input: GeneratedEmailInputs): GeneratedEmail[] {
  const { events, patientName, prescriberName, frmName, biResult, infusionDate } = input;
  const emails: GeneratedEmail[] = [];

  for (const event of events) {
    if (NON_EMAIL_EVENT_TYPES.has(event.event_type)) continue;

    const base = {
      id: event.id,
      eventType: event.event_type,
      to: frmName,
      sentAt: formatSentAt(event.created_at),
    };

    switch (event.event_type) {
      case 'ENROLL':
        emails.push({
          ...base,
          subject: `New Patient Enrolled - ${patientName}`,
          bodyParagraphs: [
            `${patientName} has been enrolled in the AssistRx Patient Support Program under ${prescriberName}.`,
            `Review the Missing Information task to confirm what enrollment steps are still outstanding.`,
          ],
          linkedItemId: LIVE_MISSING_INFO_TASK_ID,
          linkedItemLabel: 'View Task: Missing Information',
        });
        break;

      case 'INVITE':
        emails.push({
          ...base,
          subject: `Identity Verification Sent - ${patientName}`,
          bodyParagraphs: [
            `AssistRx sent an identity verification text to ${patientName} to continue enrollment.`,
            `No action is needed from you unless the patient reports an issue receiving it.`,
          ],
          linkedItemId: LIVE_MISSING_INFO_TASK_ID,
          linkedItemLabel: 'View Task: Missing Information',
        });
        break;

      case 'CONFIRM_CONSENT':
        emails.push({
          ...base,
          subject: `Consent Confirmed - ${patientName}`,
          bodyParagraphs: [
            `${patientName} confirmed enrollment consent.`,
            `The Missing Information task for this patient is now closed.`,
          ],
          linkedItemId: LIVE_MISSING_INFO_TASK_ID,
          linkedItemLabel: 'View Task: Missing Information',
        });
        break;

      case 'RUN_BI':
        emails.push({
          ...base,
          subject: `Benefits Investigation Started - ${patientName}`,
          bodyParagraphs: [
            `AssistRx started a benefits investigation for ${patientName} under ${prescriberName}.`,
            `An update will follow once the investigation completes.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'COMPLETE_BI':
        if (biResult === 'no_insurance') {
          emails.push({
            ...base,
            subject: `No Coverage Found - ${patientName}`,
            bodyParagraphs: [
              `Benefits investigation found no insurance coverage for ${patientName}.`,
              `The patient may qualify for AssistRx's Free Goods financial assistance program. No Prior Authorization task will open on this case.`,
            ],
            linkedItemId: LIVE_CASE_ID,
            linkedItemLabel: 'View Case',
          });
        } else {
          const nonFormulary = biResult === 'no_coverage';
          emails.push({
            ...base,
            subject: `Prior Authorization Needed - ${patientName}${nonFormulary ? ' (Non-Formulary)' : ''}`,
            bodyParagraphs: [
              nonFormulary
                ? `Benefits investigation found ${patientName}'s medication is not on the payer's standard formulary. ${prescriberName} needs to submit a prior authorization.`
                : `Benefits investigation confirmed ${prescriberName} needs to submit a prior authorization for ${patientName}.`,
              `The Prior Authorization task is now open on this patient's case.`,
            ],
            linkedItemId: LIVE_PA_TASK_ID,
            linkedItemLabel: 'View Task: Prior Authorization Requested',
          });
        }
        break;

      case 'SUBMIT_PA':
        emails.push({
          ...base,
          subject: `Prior Authorization Submitted - ${patientName}`,
          bodyParagraphs: [
            `A prior authorization request was submitted to the payer for ${patientName}.`,
            `AssistRx is monitoring for a decision and will notify you once the payer responds.`,
          ],
          linkedItemId: LIVE_PA_TASK_ID,
          linkedItemLabel: 'View Task: Prior Authorization Requested',
        });
        break;

      case 'APPROVE_PA':
        emails.push({
          ...base,
          subject: `Prior Authorization Approved - ${patientName}`,
          bodyParagraphs: [
            `The payer approved the prior authorization for ${patientName}. ${prescriberName} has also been notified.`,
            `The prescription now moves to fulfillment.`,
          ],
          linkedItemId: LIVE_PA_TASK_ID,
          linkedItemLabel: 'View Task: Prior Authorization Requested',
        });
        break;

      case 'DENY_PA':
        emails.push({
          ...base,
          subject: `Prior Authorization Denied - ${patientName}`,
          bodyParagraphs: [
            `The payer denied the prior authorization request for ${patientName}.`,
            `An appeal is recommended. Review the denial reason and coordinate next steps with ${prescriberName}.`,
          ],
          linkedItemId: LIVE_PA_TASK_ID,
          linkedItemLabel: 'View Task: Prior Authorization Requested',
        });
        break;

      case 'INITIATE_APPEAL':
        emails.push({
          ...base,
          subject: `Appeal Filed - ${patientName}`,
          bodyParagraphs: [
            `An appeal was filed with the payer on ${patientName}'s prior authorization denial.`,
            `Fulfillment has moved forward while the appeal is under review — AssistRx is monitoring for the payer's response.`,
          ],
          linkedItemId: LIVE_APPEAL_TASK_ID,
          linkedItemLabel: 'View Task: Appeal Filed with Payer',
        });
        break;

      case 'APPROVE_APPEAL':
        emails.push({
          ...base,
          subject: `Appeal Approved - ${patientName}`,
          bodyParagraphs: [
            `The payer approved the appeal and overturned the original prior authorization denial for ${patientName}.`,
            `No further action is needed on this appeal.`,
          ],
          linkedItemId: LIVE_APPEAL_TASK_ID,
          linkedItemLabel: 'View Task: Appeal Filed with Payer',
        });
        break;

      case 'PATIENT_SELECTS_INFUSION_DATE':
        emails.push({
          ...base,
          subject: `Infusion Appointment Scheduled - ${patientName}`,
          bodyParagraphs: [
            `${patientName} scheduled their infusion appointment${infusionDate ? ` for ${new Date(infusionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.`,
            `Site of Care: ${KEANU_SITE_OF_CARE_FACTS.facilityName}, ${KEANU_SITE_OF_CARE_FACTS.address}, ${KEANU_SITE_OF_CARE_FACTS.city}, ${KEANU_SITE_OF_CARE_FACTS.state} ${KEANU_SITE_OF_CARE_FACTS.zip} (${KEANU_SITE_OF_CARE_FACTS.contactPhone}).`,
            `No further action is needed — the patient has already received an appointment confirmation.`,
          ],
          linkedItemId: LIVE_INFUSION_TASK_ID,
          linkedItemLabel: 'View Task: Infusion Appointment Scheduled',
        });
        break;

      case 'READY_RX':
        emails.push({
          ...base,
          subject: `Prescription Ready for Fulfillment - ${patientName}`,
          bodyParagraphs: [
            `The specialty pharmacy verified and is preparing to fill the prescription for ${patientName}.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'FILL_RX':
        emails.push({
          ...base,
          subject: `Prescription Filled - ${patientName}`,
          bodyParagraphs: [
            `The specialty pharmacy filled the prescription for ${patientName}.`,
            `The order is ready for dispatch.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'SELECT_PHARMACY':
        emails.push({
          ...base,
          subject: `Specialty Pharmacy Selected - ${patientName}`,
          bodyParagraphs: [
            `AssistRx selected the specialty pharmacy that will fill the prescription for ${patientName}.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'SHIP_RX':
        emails.push({
          ...base,
          subject: `Medication Shipped - ${patientName}`,
          bodyParagraphs: [
            `${patientName}'s medication has shipped and is expected within 2-3 business days.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'DELIVER_RX':
        emails.push({
          ...base,
          subject: `Medication Delivered - ${patientName}`,
          bodyParagraphs: [
            `Delivery has been confirmed for ${patientName}'s medication.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'COMPLETE_PROVIDER_PA':
        emails.push({
          ...base,
          subject: `Provider Completed PA Form - ${patientName}`,
          bodyParagraphs: [
            `${prescriberName}'s office completed the prior authorization form for ${patientName}.`,
            `It has been submitted to the payer for review.`,
          ],
          linkedItemId: LIVE_PA_TASK_ID,
          linkedItemLabel: 'View Task: Prior Authorization Requested',
        });
        break;

      case 'SEND_PAP_SMS':
        emails.push({
          ...base,
          subject: `Financial Assistance Verification Sent - ${patientName}`,
          bodyParagraphs: [
            `AssistRx sent an identity verification text to ${patientName} for the Free Goods financial assistance program.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'VERIFY_INCOME':
        emails.push({
          ...base,
          subject: `Income Verification Submitted - ${patientName}`,
          bodyParagraphs: [
            `${patientName} submitted income verification for the financial assistance program review.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'PATIENT_SETS_ADDRESS':
        emails.push({
          ...base,
          subject: `Shipping Address Confirmed - ${patientName}`,
          bodyParagraphs: [
            `${patientName} confirmed the delivery address for their medication shipment.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'PATIENT_SELECTS_SHIP_DATE':
        emails.push({
          ...base,
          subject: `Preferred Ship Date Selected - ${patientName}`,
          bodyParagraphs: [
            `${patientName} selected a preferred ship date for their medication.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      case 'START_INCOME_QUALIFICATION':
        emails.push({
          ...base,
          subject: `Income Qualification Started - ${patientName}`,
          bodyParagraphs: [
            `${patientName} needs to submit proof of income to finish qualifying for the Free Goods financial assistance program.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      default:
        emails.push({
          ...base,
          subject: `Status Update: ${friendlyEventLabel(event.event_type)} - ${patientName}`,
          bodyParagraphs: [`${friendlyEventLabel(event.event_type)} occurred for ${patientName}.`],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
    }
  }

  // Newest first, matching an inbox — events already arrive sorted desc.
  return emails;
}
