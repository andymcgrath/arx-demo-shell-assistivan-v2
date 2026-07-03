import type { IAssistStateName } from './iAssistMachine'

export type PortalName = 'CRM' | 'Patient' | 'Provider' | 'Field' | 'Workforce'

type LaneStateMap = Record<IAssistStateName, Record<PortalName, string>>

export const laneMap: LaneStateMap = {
  case_received:       { CRM: 'Case Opened',              Patient: 'Awaiting Enrollment',       Provider: 'New iAssist Case',            Field: 'New Case',              Workforce: 'No Active Cases'   },
  provider_enrollment: { CRM: 'Provider Enrollment',      Patient: 'Awaiting Provider Approval', Provider: 'Complete Enrollment',         Field: 'Awaiting Enrollment',   Workforce: '1 New Enrollment'  },
  bi_check:            { CRM: 'BI Running',                Patient: 'Enrolled',                  Provider: 'Reviewing BI Results',        Field: 'BI Task Open',          Workforce: 'BI Running'        },
  pa_submitted:        { CRM: 'PA Submitted — Monitoring', Patient: 'Enrolled',                  Provider: 'PA Submitted — Awaiting Payer', Field: 'PA Submitted',        Workforce: 'PA Pending'        },
  pa_approved:         { CRM: 'PA Approved',               Patient: 'PA Approved',               Provider: 'PA Approved',                 Field: 'PA Task Closed',        Workforce: 'PA Approved'       },
  scheduling:          { CRM: 'Scheduling Visit',          Patient: 'Schedule Your Visit',        Provider: 'Patient Scheduling',          Field: 'Scheduling',            Workforce: 'Scheduling'        },
  dispensing:          { CRM: 'Rx Processing',             Patient: 'Prescription In Progress',   Provider: 'Rx Processing',               Field: 'Rx Dispatched',         Workforce: 'Rx Processing'     },
  delivered:           { CRM: 'Case Complete',             Patient: 'Medication Delivered',       Provider: 'Case Closed',                 Field: 'Complete',              Workforce: 'Case Complete'     },
}

export function getLaneState(state: IAssistStateName, portal: PortalName): string {
  return laneMap[state]?.[portal] ?? '—'
}
