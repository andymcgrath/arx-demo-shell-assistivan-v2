import { setup } from 'xstate'

// ── Types ──────────────────────────────────────────────────────────────────────

export type WorkflowStateName =
  | 'referral_received'
  | 'patient_onboarding'
  | 'bi_investigation'
  | 'pa_submission'
  | 'pa_pending'
  | 'patient_scheduling'
  | 'pharmacy_dispatch'
  | 'medication_tracking'
  | 'delivered'

export type WorkflowEventType =
  | 'PORTAL_LINK_SENT'
  | 'ONBOARDING_COMPLETE'
  | 'BI_COMPLETE'
  | 'PA_SUBMITTED'
  | 'PA_APPROVED'
  | 'PATIENT_SCHEDULED'
  | 'PHARMACY_SELECTED'
  | 'DISPATCHED'
  | 'DELIVERED'

export type WorkflowEvent = { type: WorkflowEventType }

// ── Machine ────────────────────────────────────────────────────────────────────

export const faxQsPaMachine = setup({
  types: {
    events: {} as WorkflowEvent,
  },
  actions: {
    // Provider dashboard
    createPARequestOnProviderDashboard: () =>
      console.log('[Provider] PA Request created — Status: Pending'),
    sendEmailToHCP: () =>
      console.log('[Provider] Email sent to HCP with PA submission link'),
    updateProviderDashboardApproved: () =>
      console.log('[Provider] PA Request — Status: Approved'),
    // Field portal tasks
    createPASubmittedTask: () =>
      console.log('[Field] PA Submitted Task created (automated)'),
    closePASubmittedTask: () =>
      console.log('[Field] PA Submitted Task closed (automated)'),
    createMissingInfoTask: () =>
      console.log('[Field] Missing Information Task created'),
    closeMissingInfoTask: () =>
      console.log('[Field] Missing Information Task closed (automated)'),
    // Patient notifications
    sendSMSToPatient: () =>
      console.log('[Patient] SMS sent: PA Approved — time to schedule'),
  },
}).createMachine({
  id: 'faxQsPA',
  initial: 'referral_received',
  states: {
    referral_received:  { on: { PORTAL_LINK_SENT:    'patient_onboarding' } },
    patient_onboarding: { on: { ONBOARDING_COMPLETE: 'bi_investigation' } },
    bi_investigation: {
      on: {
        BI_COMPLETE: {
          target: 'pa_submission',
          actions: ['createPARequestOnProviderDashboard', 'sendEmailToHCP'],
        },
      },
    },
    pa_submission: {
      on: {
        PA_SUBMITTED: {
          target: 'pa_pending',
          actions: ['createPASubmittedTask'],
        },
      },
    },
    pa_pending: {
      on: {
        PA_APPROVED: {
          target: 'patient_scheduling',
          actions: [
            'updateProviderDashboardApproved',
            'closePASubmittedTask',
            'sendSMSToPatient',
          ],
        },
      },
    },
    patient_scheduling: { on: { PATIENT_SCHEDULED: 'pharmacy_dispatch' } },
    pharmacy_dispatch: {
      entry: ['createMissingInfoTask'],
      on: {
        PHARMACY_SELECTED: { actions: ['closeMissingInfoTask'] },
        DISPATCHED:        { target: 'medication_tracking' },
      },
    },
    medication_tracking: { on: { DELIVERED: 'delivered' } },
    delivered: { type: 'final' },
  },
})
