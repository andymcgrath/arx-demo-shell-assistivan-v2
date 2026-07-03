import { setup } from 'xstate'

export type IAssistStateName =
  | 'case_received'
  | 'provider_enrollment'
  | 'bi_check'
  | 'pa_submitted'
  | 'pa_approved'
  | 'scheduling'
  | 'dispensing'
  | 'delivered'

export type IAssistEventType =
  | 'CASE_OPENED'
  | 'ENROLLED'
  | 'BI_COMPLETE'
  | 'PA_SUBMITTED'
  | 'PA_APPROVED'
  | 'SCHEDULED'
  | 'DISPENSED'
  | 'DELIVERED'

export type IAssistEvent = { type: IAssistEventType }

export const iAssistMachine = setup({
  types: { events: {} as IAssistEvent },
  actions: {
    notifyProviderCaseOpen:   () => console.log('[Provider] New iAssist case opened'),
    createBITask:             () => console.log('[Field] BI investigation task created'),
    createPARequestProvider:  () => console.log('[Provider] PA request created — Status: Pending'),
    sendPAEmailToHCP:         () => console.log('[Provider] PA submission email sent to HCP'),
    updateProviderPAApproved: () => console.log('[Provider] PA Status: Approved'),
    sendSMSPatientApproved:   () => console.log('[Patient] SMS: PA Approved, schedule your visit'),
    closeBITask:              () => console.log('[Field] BI task closed'),
    closePATask:              () => console.log('[Field] PA task closed'),
  },
}).createMachine({
  id: 'iAssistPA',
  initial: 'case_received',
  states: {
    case_received:      { on: { CASE_OPENED:  { target: 'provider_enrollment', actions: ['notifyProviderCaseOpen'] } } },
    provider_enrollment:{ on: { ENROLLED:     { target: 'bi_check',            actions: ['createBITask'] } } },
    bi_check:           { on: { BI_COMPLETE:  { target: 'pa_submitted',         actions: ['createPARequestProvider', 'sendPAEmailToHCP', 'closeBITask'] } } },
    pa_submitted:       { on: { PA_SUBMITTED: { target: 'pa_approved',          actions: ['updateProviderPAApproved', 'sendSMSPatientApproved', 'closePATask'] } } },
    pa_approved:        { on: { PA_APPROVED:  'scheduling' } },
    scheduling:         { on: { SCHEDULED:    'dispensing' } },
    dispensing:         { on: { DISPENSED:    'delivered' } },
    delivered:          { type: 'final' },
  },
})
