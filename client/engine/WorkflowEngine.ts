import type { MachineContext, PersonaId } from './types';
import { daysFromToday } from '@/lib/relativeDate';
import { routeFor } from './workflow/screens';
import { screenMapFor } from '@/workflows/screenMaps';

export function getPersonaActions(state: MachineContext, persona: PersonaId): string[] {
  const { workflowData } = state;

  if (persona === 'crm') {
    return ['REFERRAL_RECEIVED', 'INVITE', 'RUN_BI', 'APPROVE_PA', 'FILL_RX'];
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

/**
 * The route the patient portal should show. Every workflow owns its screen order in
 * workflows/<name>/screens.ts (CLAUDE.md rule 13). This only looks it up.
 */
export function derivePatientRoute(state: MachineContext): string {
  const { workflowData } = state;
  const map = screenMapFor(workflowData.flowType);
  if (!map) throw new Error(`No screen list for ${workflowData.flowType}`);
  return routeFor(map, workflowData);
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
  // a payer overturns that denial on appeal (see workflows/iassist/rules.ts),
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
  // Orlando, not Houston — Keanu's home address (see PATIENT_SEED in
  // patientStore.ts) is 123 Main Street, Orlando, FL 32801. His site of
  // care needs to be somewhere he'd realistically drive to for an
  // infusion, not a facility 900+ miles away in a different state.
  facilityName: 'Orlando SOC',
  npi: '1699006677',
  contactName: 'Priya Sandhu',
  contactPhone: '(407) 555-3006',
  address: '1414 Kuhl Ave',
  city: 'Orlando',
  state: 'Florida',
  zip: '32806',
};

/**
 * Advanced Diabetes Supply's contact facts — CoA_Coverage only. Mirrors
 * KEANU_SITE_OF_CARE_FACTS's shape/style above: shared raw facts (not a full
 * Pharmacy/FieldSOC record, since this is a fulfillment hand-off to a
 * third-party DME provider, not a pharmacy dispatch or a site-of-care visit)
 * so DmeProviderTransfer.tsx and this file's own generated-email copy always
 * describe the exact same provider instead of two hand-typed copies that
 * could quietly drift.
 */
export const ADVANCED_DIABETES_SUPPLY_FACTS = {
  name: 'Advanced Diabetes Supply',
  contactPhone: '(858) 555-0148',
  address: '9339 Genesee Ave, Suite 300',
  city: 'San Diego',
  state: 'California',
  zip: '92121',
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
  // 'dme_covered' — CoA_Coverage only: BI confirmed the DME is covered under the
  // patient's commercial medical benefit (see workflows/coaDme.ts's
  // COMPLETE_BI).
  biResult: 'coverage_found' | 'no_coverage' | 'no_insurance' | 'dme_covered' | null;
  // iAssist_PAP (WF5) only — read directly off current workflow state
  // (like biResult above) rather than event.metadata, since createEvent()
  // never populates metadata (see workflows/iassist/rules.ts) — the event log
  // alone can't say WHICH date got picked, just that the event fired. Null
  // for every other flow.
  infusionDate: string | null;
  // CoA_Coverage only — biResult alone can't tell "coverage_found" (Scenario 1:
  // pharmacy covered, no PA) and "no_coverage" (Scenario 3: cash pay, no PA)
  // apart from the same two values used by every other flow (where they DO
  // imply a Prior Authorization step). The COMPLETE_BI email case below
  // checks this before falling back to the generic PA-needed copy.
  flowType?: string;
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
  // CoA_Coverage Scenario 3 only — same reasoning, mirrored for the cash-offer
  // SMS's own tap-through (CashOfferSms.tsx). SEND_CASH_OFFER_SMS still
  // falls through to the default case below.
  'VERIFY_CASH_OFFER_SMS',
  // CoA_Coverage Scenario 2 only — same reasoning, mirrored for the DME transfer
  // SMS's own tap-through (DmeTransferSms.tsx). NOTIFY_PROVIDER_TRANSFER
  // (the CRM action that sends it) still falls through to the default case
  // below, where its existing email case already lives.
  'VERIFY_DME_TRANSFER_SMS',
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
  const { events, patientName, prescriberName, frmName, biResult, infusionDate, flowType } = input;
  const isDmeFlow = flowType === 'CoA_Coverage';
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
      case 'REFERRAL_RECEIVED':
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
        if (biResult === 'dme_covered') {
          emails.push({
            ...base,
            subject: `Medical Benefit Coverage Confirmed - ${patientName}`,
            bodyParagraphs: [
              `Benefits investigation confirmed ${patientName}'s DME (CGM sensor) is covered under their commercial medical benefit.`,
              `The case is being transferred to an outside DME provider for fulfillment — no Prior Authorization is needed on this case.`,
            ],
            linkedItemId: LIVE_CASE_ID,
            linkedItemLabel: 'View Case',
          });
        } else if (isDmeFlow && biResult === 'coverage_found') {
          // CoA_Coverage Scenario 1 — pharmacy benefit covered, medical not. This
          // outcome now requires a real Prior Authorization, mirroring
          // CoA_DTP's own PA flow exactly (see workflows/coaDme.ts's header
          // comment and its SUBMIT_PA handlers) — it's submitted
          // automatically by CRM, not by the prescriber, so this email
          // doesn't open a Prior Authorization task the way the generic
          // non-DME branch below does. No pricing/dollar framing either —
          // once PA approves, it's a network pharmacy pick, not a
          // Retail-vs-Mail-Order choice.
          emails.push({
            ...base,
            subject: `Pharmacy Benefit Coverage Confirmed - ${patientName}`,
            bodyParagraphs: [
              `Benefits investigation confirmed ${patientName}'s DME (CGM sensor) is covered under their pharmacy benefit.`,
              `A Prior Authorization is being submitted automatically; once approved, the patient will be notified to pick a network pharmacy.`,
            ],
            linkedItemId: LIVE_CASE_ID,
            linkedItemLabel: 'View Case',
          });
        } else if (isDmeFlow && biResult === 'no_coverage') {
          // CoA_Coverage Scenario 3 — neither benefit covered. The generic
          // 'no_coverage' copy below assumes a non-formulary Prior
          // Authorization submission, which doesn't apply here either.
          emails.push({
            ...base,
            subject: `No Coverage Found - ${patientName}`,
            bodyParagraphs: [
              `Benefits investigation found no coverage for ${patientName}'s DME (CGM sensor) under either the pharmacy or medical benefit.`,
              `The patient has been offered a cash-pay option. No Prior Authorization task will open on this case.`,
            ],
            linkedItemId: LIVE_CASE_ID,
            linkedItemLabel: 'View Case',
          });
        } else if (biResult === 'no_insurance') {
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

      // CoA_Coverage only — CoAssist hands the case to Advanced Diabetes Supply,
      // the outside DME provider, once medical-benefit coverage is
      // confirmed. This flow's terminal event (see workflows/coaDme.ts).
      case 'NOTIFY_PROVIDER_TRANSFER':
        emails.push({
          ...base,
          subject: `DME Provider Transfer Notified - ${patientName}`,
          bodyParagraphs: [
            `${patientName}'s case has been transferred to ${ADVANCED_DIABETES_SUPPLY_FACTS.name} for fulfillment, now that medical-benefit coverage is confirmed.`,
            `${ADVANCED_DIABETES_SUPPLY_FACTS.name} will contact the patient directly to complete the order (${ADVANCED_DIABETES_SUPPLY_FACTS.contactPhone}). No further action is needed on this case.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
        break;

      // CoA_Coverage Scenario 3 only — the cash-offer SMS beat (see
      // engine/types.ts's cashOfferSmsSent). CoA_Coverage Scenario 1 no longer has
      // an equivalent automatic SMS of its own — it now submits a real PA
      // instead (see coaDme.ts's header comment and the COMPLETE_BI case
      // above), so there's no SEND_PHARMACY_SMS sibling here anymore.
      case 'SEND_CASH_OFFER_SMS':
        emails.push({
          ...base,
          subject: `Cash Pay Offer Notification Sent - ${patientName}`,
          bodyParagraphs: [
            `AssistRx sent ${patientName} a text letting them know no coverage was found under either benefit, but a cash-pay option is available for their DME (CGM sensor).`,
            `No action is needed from you unless the patient reports an issue receiving it.`,
          ],
          linkedItemId: LIVE_CASE_ID,
          linkedItemLabel: 'View Case',
        });
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
