import { setup } from 'xstate'

// ── Types ──────────────────────────────────────────────────────────────────────

export type WorkflowStateName =
  | 'erx_received'
  | 'patient_onboarding'
  | 'bi_investigation'
  | 'pa_submission'
  | 'pa_pending'
  | 'patient_scheduling'
  | 'pharmacy_dispatch'
  | 'rx_shipped'
  | 'delivered'

export type WorkflowEventType =
  | 'PORTAL_LINK_SENT'
  | 'ONBOARDING_COMPLETE'
  | 'BI_COMPLETE'
  | 'PA_SUBMITTED'
  | 'PA_APPROVED'
  | 'PATIENT_SCHEDULED'
  | 'MARK_AS_RECEIVED'
  | 'MARK_AS_SHIPPED'
  | 'DELIVERED'

export type WorkflowEvent = { type: WorkflowEventType }

// ── Machine ────────────────────────────────────────────────────────────────────

export const coaDtpMachine = setup({
  types: {
    events: {} as WorkflowEvent,
  },
  actions: {
    // System / CRM
    sendPortalSMSToPatient: () =>
      console.log('[Patient] SMS auto-sent: Click link to Patient Portal'),
    // Field portal tasks
    createMissingInfoTask: () =>
      console.log('[Field] Missing Information Task created'),
    closeMissingInfoTask: () =>
      console.log('[Field] Missing Information Task closed (automated)'),
    createPASubmittedTask: () =>
      console.log('[Field] PA Submitted Task created (automated)'),
    closePASubmittedTask: () =>
      console.log('[Field] PA Submitted Task closed (automated)'),
    // Provider portal
    createPARequestOnProviderDashboard: () =>
      console.log('[Provider] PA Request created — Status: Pending'),
    sendEmailToHCP: () =>
      console.log('[Provider] Email sent to HCP with PA submission link'),
    updateProviderDashboardApproved: () =>
      console.log('[Provider] PA Request — Status: Approved'),
    // Patient notifications
    sendSMSPAApprovedToPatient: () =>
      console.log('[Patient] SMS sent: PA Approved — time to schedule'),
    // Pharmacy
    markReceivedAtPharmacy: () =>
      console.log('[CRM] Pharmacy Status: Received at CoAssist Pharmacy'),
  },
}).createMachine({
  id: 'coaDTP',
  initial: 'erx_received',
  states: {
    erx_received: {
      entry: ['createMissingInfoTask', 'sendPortalSMSToPatient'],
      on: {
        PORTAL_LINK_SENT: 'patient_onboarding',
      },
    },
    patient_onboarding: {
      on: {
        ONBOARDING_COMPLETE: {
          target: 'bi_investigation',
          actions: ['closeMissingInfoTask'],
        },
      },
    },
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
            'sendSMSPAApprovedToPatient',
          ],
        },
      },
    },
    patient_scheduling: { on: { PATIENT_SCHEDULED: 'pharmacy_dispatch' } },
    pharmacy_dispatch: {
      on: {
        MARK_AS_RECEIVED: { actions: ['markReceivedAtPharmacy'] },
        MARK_AS_SHIPPED:  { target: 'rx_shipped' },
      },
    },
    rx_shipped:  { on: { DELIVERED: 'delivered' } },
    delivered:   { type: 'final' },
  },
})
