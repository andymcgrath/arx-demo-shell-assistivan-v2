import type { WorkflowStateName } from '@/machines/coaDtpMachine'

export type PortalName = 'CRM' | 'Patient' | 'Provider' | 'Field' | 'Workforce'

type LaneStateMap = Record<WorkflowStateName, Record<PortalName, string>>

export const STEP_LABELS: { label: string; states: string[] }[] = [
  { label: 'eRx Received',             states: ['erx_received'] },
  { label: 'Patient Onboarding',        states: ['patient_onboarding'] },
  { label: 'Benefits Investigation',    states: ['bi_investigation'] },
  { label: 'Prior Authorization',       states: ['pa_submission', 'pa_pending'] },
  { label: 'PA Approved / Scheduling',  states: ['patient_scheduling'] },
  { label: 'Pharmacy Dispatch',         states: ['pharmacy_dispatch'] },
  { label: 'Rx Shipped',                states: ['rx_shipped'] },
  { label: 'Delivered',                 states: ['delivered'] },
]

export const STATE_TO_STEP: Record<string, number> = Object.fromEntries(
  STEP_LABELS.flatMap((step, i) => step.states.map(s => [s, i + 1]))
)

export const laneMap: LaneStateMap = {
  erx_received: {
    CRM:       'New Case — Awaiting Patient Response',
    Patient:   'Awaiting Portal Invite',
    Provider:  'eRx Received',
    Field:     'Missing Information Task Open',
    Workforce: 'No Active Cases',
  },
  patient_onboarding: {
    CRM:       'Enrollment In Progress',
    Patient:   'Completing Enrollment',
    Provider:  'Awaiting Patient Enrollment',
    Field:     'Patient Invited',
    Workforce: '1 New Enrollment',
  },
  bi_investigation: {
    CRM:       'BI Running',
    Patient:   'Enrolled',
    Provider:  'Reviewing BI Results',
    Field:     'Missing Info Task Closed',
    Workforce: 'BI Running',
  },
  pa_submission: {
    CRM:       'PA Request Created',
    Patient:   'Enrolled',
    Provider:  'Completing PA Questionnaire',
    Field:     'PA Submitted Task Open',
    Workforce: 'PA Request Open',
  },
  pa_pending: {
    CRM:       'Monitoring PA',
    Patient:   'Enrolled',
    Provider:  'PA Submitted — Awaiting Payer',
    Field:     'PA Submitted Task Open',
    Workforce: 'PA Pending — Payer Review',
  },
  patient_scheduling: {
    CRM:       'PA Approved',
    Patient:   'Scheduling — PA Approved',
    Provider:  'PA Approved',
    Field:     'PA Task Closed',
    Workforce: 'PA Approved',
  },
  pharmacy_dispatch: {
    CRM:       'Dispatch to CoAssist Pharmacy',
    Patient:   'Tracking: Preparing Medication',
    Provider:  'Rx Processing',
    Field:     'Dispatching',
    Workforce: 'Dispatch Pending',
  },
  rx_shipped: {
    CRM:       'Rx In Transit',
    Patient:   'Tracking: In Transit',
    Provider:  'Rx Shipped',
    Field:     'Shipped',
    Workforce: 'Rx In Transit',
  },
  delivered: {
    CRM:       'Case Complete',
    Patient:   'Medication Delivered',
    Provider:  'Case Closed',
    Field:     'Complete',
    Workforce: 'Case Complete',
  },
}

export function getLaneState(state: WorkflowStateName, portal: PortalName): string {
  return laneMap[state]?.[portal] ?? '—'
}
