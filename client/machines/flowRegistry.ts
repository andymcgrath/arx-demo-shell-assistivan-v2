/**
 * Flow Registry
 *
 * Each workflow registers one entry here. To add a new workflow:
 *   1. Create client/machines/myFlowMachine.ts
 *   2. Create client/store/myFlowLaneMap.ts
 *   3. Add an entry below — nothing else needs to change.
 *
 * Flows without a machine entry are handled by the legacy engine
 * (workflowMachine / actorSingleton) and are not affected by this registry.
 */

import type { AnyStateMachine } from 'xstate'
import type { FlowType } from '@/engine/types'
import { faxQsPaMachine } from './faxQsPaMachine'
import { laneMap as faxLaneMap } from '@/store/laneMap'
import { iAssistMachine } from './iAssistMachine'
import { laneMap as iAssistLaneMap } from '@/store/iAssistLaneMap'
import { coaDtpMachine } from './coaDtpMachine'
import { laneMap as coaDtpLaneMap, STEP_LABELS as COA_DTP_STEP_LABELS, STATE_TO_STEP as COA_DTP_STATE_TO_STEP } from '@/store/coaDtpLaneMap'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StepLabel {
  label: string
  /** State names that map to this visual step */
  states: string[]
}

export interface FlowRegistryEntry {
  machine: AnyStateMachine
  displayName: string
  stepLabels: StepLabel[]
  /** state name → 1-based visual step number */
  stateToStep: Record<string, number>
  /** state name → portal name → status label */
  laneMap: Record<string, Record<string, string>>
}

// ── Fax QS / PA Approved ──────────────────────────────────────────────────────

const FAX_QS_STEP_LABELS: StepLabel[] = [
  { label: 'Referral Received',        states: ['referral_received'] },
  { label: 'Patient Onboarding',       states: ['patient_onboarding'] },
  { label: 'Benefits Investigation',   states: ['bi_investigation'] },
  { label: 'Prior Authorization',      states: ['pa_submission', 'pa_pending'] },
  { label: 'PA Approved / Scheduling', states: ['patient_scheduling'] },
  { label: 'Pharmacy Dispatch',        states: ['pharmacy_dispatch'] },
  { label: 'Medication Tracking',      states: ['medication_tracking'] },
  { label: 'Delivered',                states: ['delivered'] },
]

const FAX_QS_STATE_TO_STEP: Record<string, number> = {
  referral_received:   1,
  patient_onboarding:  2,
  bi_investigation:    3,
  pa_submission:       4,
  pa_pending:          4,
  patient_scheduling:  5,
  pharmacy_dispatch:   6,
  medication_tracking: 7,
  delivered:           8,
}

// ── iAssist / PA Approved ─────────────────────────────────────────────────────

const IASSIST_PA_STEP_LABELS: StepLabel[] = [
  { label: 'Case Received',          states: ['case_received'] },
  { label: 'Provider Enrollment',    states: ['provider_enrollment'] },
  { label: 'Benefits Investigation', states: ['bi_check'] },
  { label: 'PA Submitted',           states: ['pa_submitted'] },
  { label: 'PA Approved',            states: ['pa_approved'] },
  { label: 'Scheduling',             states: ['scheduling'] },
  { label: 'Dispensing',             states: ['dispensing'] },
  { label: 'Delivered',              states: ['delivered'] },
]

const IASSIST_PA_STATE_TO_STEP: Record<string, number> = {
  case_received:       1,
  provider_enrollment: 2,
  bi_check:            3,
  pa_submitted:        4,
  pa_approved:         5,
  scheduling:          6,
  dispensing:          7,
  delivered:           8,
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const flowRegistry: Partial<Record<FlowType, FlowRegistryEntry>> = {
  Fax_QS_PA_Approved: {
    machine:     faxQsPaMachine,
    displayName: 'Fax QS / PA Approved',
    stepLabels:  FAX_QS_STEP_LABELS,
    stateToStep: FAX_QS_STATE_TO_STEP,
    laneMap:     faxLaneMap,
  },
  iAssist_PA_Approved: {
    machine:     iAssistMachine,
    displayName: 'iAssist / PA Approved',
    stepLabels:  IASSIST_PA_STEP_LABELS,
    stateToStep: IASSIST_PA_STATE_TO_STEP,
    laneMap:     iAssistLaneMap,
  },
  CoA_DTP: {
    machine:     coaDtpMachine,
    displayName: 'CoAssist Direct to Patient',
    stepLabels:  COA_DTP_STEP_LABELS,
    stateToStep: COA_DTP_STATE_TO_STEP,
    laneMap:     coaDtpLaneMap,
  },
}
