import type { WorkflowStateName } from '@/machines/faxQsPaMachine'

export type PortalName = 'CRM' | 'Patient' | 'Provider' | 'Field' | 'Workforce'

type LaneStateMap = Record<WorkflowStateName, Record<PortalName, string>>

export const laneMap: LaneStateMap = {
  referral_received:   { CRM: 'Case Opened — Awaiting Enrollment', Patient: 'Awaiting Portal Invite',     Provider: 'Referral Received',             Field: 'New Case',                 Workforce: 'No Active Cases' },
  patient_onboarding:  { CRM: 'Enrollment In Progress',            Patient: 'Completing Enrollment',       Provider: 'Awaiting Patient Enrollment',   Field: 'Patient Invited',          Workforce: '1 New Enrollment' },
  bi_investigation:    { CRM: 'BI Running',                        Patient: 'Enrolled',                    Provider: 'Reviewing BI Results',          Field: 'BI Initiated',             Workforce: 'BI Running' },
  pa_submission:       { CRM: 'PA Request Created',                Patient: 'Enrolled',                    Provider: 'Completing PA Questionnaire',   Field: 'PA Submitted Task Open',   Workforce: 'PA Request Open' },
  pa_pending:          { CRM: 'Monitoring PA — View Fax',          Patient: 'Enrolled',                    Provider: 'PA Submitted — Awaiting Payer', Field: 'PA Submitted Task Open',   Workforce: 'PA Pending — Payer Review' },
  patient_scheduling:  { CRM: 'PA Approved',                       Patient: 'Scheduling — PA Approved',    Provider: 'PA Approved',                   Field: 'PA Task Closed',           Workforce: 'PA Approved' },
  pharmacy_dispatch:   { CRM: 'Dispatch to Triage',                Patient: 'Selecting Pharmacy',          Provider: 'PA Approved',                   Field: 'Missing Info Task Open',   Workforce: 'Dispatch Pending' },
  medication_tracking: { CRM: 'Rx In Progress',                    Patient: 'Tracking Order',              Provider: 'Rx Processing',                 Field: 'Dispatched — Task Closed', Workforce: 'Rx Processing' },
  delivered:           { CRM: 'Case Complete',                      Patient: 'Medication Delivered',        Provider: 'Case Closed',                   Field: 'Complete',                 Workforce: 'Case Complete' },
}

export function getLaneState(state: WorkflowStateName, portal: PortalName): string {
  return laneMap[state]?.[portal] ?? '—'
}
