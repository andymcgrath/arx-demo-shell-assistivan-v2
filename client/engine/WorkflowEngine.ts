import type { MachineContext, PersonaId } from './types';
import { daysFromToday, dateFromToday } from '@/lib/relativeDate';

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
  priority: 'High';
  dueDate: string;
  assignedTo: string;
  description: string;
}

export interface LiveWorkItemInputs {
  enrollmentStatus: string;
  consentStatus: string;
  biStatus: string;
  paStatus: string;
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

  const isPapFlow = input.flowType === 'Fax_PAP_Audit';

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
      status: input.paStatus === 'approved' ? 'Closed' : 'Open',
      priority: 'High',
      dueDate: daysFromToday(2),
      assignedTo: 'Sarah Mitchell',
      description: 'Submit Prior Authorization request to payer',
    });
  }

  return items;
}

// ── Generated emails ─────────────────────────────────────────────────────────
// Field Portal's Emails screen doesn't maintain its own queue. Every email it
// shows is derived, on every render, from the actor's own event log (the same
// `events` array useDemoState() already exposes) plus the patient's current
// prescriber. That's why nothing here is stored anywhere: a status change
// that's never opened in Field Portal still generated its email the moment
// it happened, and the next status change adds the next one to the same
// list. Read state (which emails have been opened) is bookkeeping kept
// separately in fieldStore.ts, the same way comments are kept separate from
// the FieldItem list.

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
  numberedSteps?: string[];
  noteText?: string;
  highlight?: string;
  closing?: string;
}

export interface GeneratedEmailInputs {
  events: GeneratedEmailSourceEvent[];
  patientName: string;
  prescriberName: string;
  biResult: 'coverage_found' | 'no_coverage' | 'no_insurance' | null;
}

// Identity-verification substeps and the welcome-banner dismissal aren't
// milestones a field rep or patient would expect a separate email about —
// they're folded into the enrollment/consent narrative instead of each
// generating their own noisy notification.
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
 * Maps the actor's event log into the exact set of emails Field Portal
 * should have ready. One entry in, one email out (aside from the excluded
 * types above) — nothing is summarized or batched, so the list always
 * matches the real event history exactly, including events that happened
 * while nobody was looking at the Emails screen.
 */
export function getGeneratedEmails(input: GeneratedEmailInputs): GeneratedEmail[] {
  const { events, patientName, prescriberName, biResult } = input;
  const emails: GeneratedEmail[] = [];

  for (const event of events) {
    if (NON_EMAIL_EVENT_TYPES.has(event.event_type)) continue;

    const base = {
      id: event.id,
      eventType: event.event_type,
      sentAt: formatSentAt(event.created_at),
    };

    switch (event.event_type) {
      case 'ENROLL':
        emails.push({
          ...base,
          subject: 'Welcome to the AssistRx Patient Support Program',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `Welcome to the AssistRx Patient Support Program. We received your enrollment and our team is reviewing your information now.`,
            `You'll get an email at each step. Benefits verification comes first, then prior authorization if your plan requires it, then shipment. Call AssistRx at 1-866-424-6935 with any questions.`,
          ],
        });
        break;

      case 'INVITE':
        emails.push({
          ...base,
          subject: 'Verify Your Identity to Continue Enrollment',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `AssistRx sent a text message to the mobile number on file to verify your identity and finish setting up your account.`,
            `Follow the link in that text to complete verification. Contact AssistRx at 1-866-424-6935 if you didn't receive it.`,
          ],
        });
        break;

      case 'CONFIRM_CONSENT':
        emails.push({
          ...base,
          subject: 'Enrollment Consent Confirmed',
          to: 'Field Team',
          bodyParagraphs: [
            `${patientName} confirmed enrollment consent.`,
            `The Missing Information task for this patient is now closed. No enrollment paperwork is outstanding.`,
          ],
        });
        break;

      case 'RUN_BI':
        emails.push({
          ...base,
          subject: 'Benefits Investigation Started',
          to: 'Field Team',
          bodyParagraphs: [
            `Benefits investigation has started for ${patientName}.`,
            `AssistRx is contacting the payer to confirm coverage. An update will follow once the investigation completes.`,
          ],
        });
        break;

      case 'COMPLETE_BI':
        if (biResult === 'no_insurance') {
          emails.push({
            ...base,
            subject: 'Financial Assistance Program - Next Steps',
            to: patientName,
            bodyParagraphs: [
              `Dear ${patientName},`,
              `Based on your benefits investigation, no insurance coverage was found for this medication. You may qualify for AssistRx's Free Goods financial assistance program.`,
              `Our team will follow up shortly with next steps to verify your income and complete enrollment in the program.`,
            ],
          });
        } else {
          const nonFormulary = biResult === 'no_coverage';
          emails.push({
            ...base,
            subject: nonFormulary
              ? 'Action Required - Prior Authorization Submittal (Non-Formulary)'
              : 'Action Required - Prior Authorization Submittal',
            to: prescriberName,
            bodyParagraphs: [
              `Dear ${prescriberName},`,
              nonFormulary
                ? `AssistRx has received your request to process a prior authorization for ${patientName}. The patient's insurer covers this drug class only with a prior authorization on file, since the medication isn't on their standard formulary.`
                : `AssistRx has received your request to process a prior authorization for ${patientName}. The patient's insurer requires a prior authorization (PA) submitted by their healthcare provider.`,
              `An electronic PA request form has been prepared for you by AssistRx. To complete and submit the PA, follow these steps:`,
            ],
            numberedSteps: [
              'Click HERE to be redirected to our PA request form, powered by AssistRx.',
              'Input your NPI and follow the instructions on the form to complete the submission.',
            ],
            noteText: '*Your NPI is required to protect against fraudulent activity and to ensure only active prescribers can submit PAs.',
            highlight: `This link expires on ${dateFromToday(5).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}.`,
            closing: 'If you are having any issues with this process or need to request a new link, please contact AssistRx at 1-866-424-6935.',
          });
        }
        break;

      case 'SUBMIT_PA':
        emails.push({
          ...base,
          subject: 'Prior Authorization Submitted - Pending Payer Review',
          to: 'Field Team',
          bodyParagraphs: [
            `A prior authorization request was submitted to the payer on behalf of ${patientName}.`,
            `AssistRx will monitor for a decision and notify the care team once the payer responds.`,
          ],
        });
        break;

      case 'APPROVE_PA':
        emails.push({
          ...base,
          subject: 'Good News! Your Prior Authorization Has Been Approved',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `Your insurer has approved the prior authorization for your medication. Your prescriber has also been notified.`,
            `Your prescription now moves to fulfillment. You'll get another email once it ships.`,
          ],
        });
        break;

      case 'DENY_PA':
        emails.push({
          ...base,
          subject: 'Action Required - Prior Authorization Denied',
          to: 'Field Team',
          bodyParagraphs: [
            `The payer denied the prior authorization request for ${patientName}.`,
            `An appeal is recommended. Review the denial reason and coordinate next steps with the prescriber.`,
          ],
        });
        break;

      case 'READY_RX':
        emails.push({
          ...base,
          subject: 'Prescription Ready for Fulfillment',
          to: 'Field Team',
          bodyParagraphs: [
            `The specialty pharmacy has verified and is preparing to fill the prescription for ${patientName}.`,
          ],
        });
        break;

      case 'FILL_RX':
        emails.push({
          ...base,
          subject: 'Prescription Filled - Ready for Dispatch',
          to: 'Field Team',
          bodyParagraphs: [
            `The specialty pharmacy filled the prescription for ${patientName}.`,
            `The order is ready for dispatch and will ship shortly.`,
          ],
        });
        break;

      case 'SELECT_PHARMACY':
        emails.push({
          ...base,
          subject: 'Your Specialty Pharmacy Has Been Selected',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `AssistRx has selected the specialty pharmacy that will fill your prescription and coordinate delivery.`,
          ],
        });
        break;

      case 'SHIP_RX':
        emails.push({
          ...base,
          subject: 'Your Medication Has Shipped',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `Your medication has shipped and is expected to arrive within 2-3 business days.`,
            `Your AssistRx care team will follow up once it's delivered to confirm you received it safely.`,
          ],
        });
        break;

      case 'DELIVER_RX':
        emails.push({
          ...base,
          subject: 'Delivery Confirmed - Medication Received',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `This confirms your medication has been delivered. Contact AssistRx at 1-866-424-6935 with any questions about your treatment.`,
          ],
        });
        break;

      case 'COMPLETE_PROVIDER_PA':
        emails.push({
          ...base,
          subject: 'Provider Completed Prior Authorization Form',
          to: 'Field Team',
          bodyParagraphs: [
            `${prescriberName}'s office completed the prior authorization form for ${patientName}.`,
            `The completed form has been submitted to the payer for review.`,
          ],
        });
        break;

      case 'SEND_PAP_SMS':
        emails.push({
          ...base,
          subject: 'Verify Your Identity - Financial Assistance Program',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `AssistRx sent a text message to verify your identity for the Free Goods financial assistance program.`,
          ],
        });
        break;

      case 'VERIFY_INCOME':
        emails.push({
          ...base,
          subject: 'Income Verification Submitted',
          to: 'Field Team',
          bodyParagraphs: [
            `${patientName} submitted income verification for the financial assistance program review.`,
          ],
        });
        break;

      case 'PATIENT_SETS_ADDRESS':
        emails.push({
          ...base,
          subject: 'Shipping Address Confirmed',
          to: 'Field Team',
          bodyParagraphs: [
            `${patientName} confirmed the delivery address for their medication shipment.`,
          ],
        });
        break;

      case 'PATIENT_SELECTS_SHIP_DATE':
        emails.push({
          ...base,
          subject: 'Preferred Ship Date Selected',
          to: 'Field Team',
          bodyParagraphs: [
            `${patientName} selected a preferred ship date for their medication.`,
          ],
        });
        break;

      case 'START_INCOME_QUALIFICATION':
        emails.push({
          ...base,
          subject: 'Next Step - Income Qualification for Financial Assistance',
          to: patientName,
          bodyParagraphs: [
            `Dear ${patientName},`,
            `To finish qualifying for the Free Goods financial assistance program, AssistRx needs proof of income.`,
            `A member of our team will reach out with instructions on how to submit this securely.`,
          ],
        });
        break;

      default:
        emails.push({
          ...base,
          subject: `Status Update: ${friendlyEventLabel(event.event_type)}`,
          to: 'Field Team',
          bodyParagraphs: [`${friendlyEventLabel(event.event_type)} occurred for ${patientName}.`],
        });
    }
  }

  // Newest first, matching an inbox — events already arrive sorted desc.
  return emails;
}
