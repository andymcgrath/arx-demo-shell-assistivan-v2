/**
 * useDemoState — drop-in bridge (now XState-backed)
 *
 * This file has the SAME export signature as the Supabase useDemoState.ts
 * used in arx-connect-analytics, arx-prototype-bi-jascayd, arx-prototype-crm, etc.
 *
 * Portal code imports this hook unchanged. The state and actions now come from
 * the XState actor (via usePersonaState and useWorkflowDispatch).
 * All portals always see the same data from the synchronized state machines.
 *
 * Usage (identical to the Supabase version):
 *   const { state, events, loading, actions } = useDemoState('Analytics')
 */
import { type DemoState as StoreDemoState, type DemoEvent as StoreDemoEvent, type Portal } from "@/store/demoStore";
import type { FlowType } from "@/store/demoStore";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import type { WorkflowData } from "@/engine/types";

// ── Re-export types so portals can import them from this file ─────────────────

export type { FlowType, Portal };

/** snake_case shape — matches the Supabase DemoState columns exactly */
export interface DemoState {
  id: string;
  flow_type: FlowType;
  enrollment_status: "pending" | "enrolled";
  consent_status: "pending" | "confirmed" | "declined";
  bi_status: "none" | "running" | "complete";
  bi_result: "coverage_found" | "no_coverage" | "no_insurance" | null;
  pa_status: "none" | "submitted" | "approved" | "denied";
  // iAssist_PAP (WF5) only — see engine/types.ts's WorkflowData.appealStatus.
  // Stays "none" for every other flow.
  appeal_status: "none" | "initiated" | "approved";
  qs_status: "none" | "active" | "discontinued";
  pap_status: "none" | "active" | "audit_pending" | "discontinued";
  pharmacy_status: "none" | "processing" | "ready" | "shipped" | "delivered";
  workflow_step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  updated_at: string;
  updated_by: Portal | "system" | null;
}

/** snake_case shape — matches the Supabase demo_events columns exactly */
export interface DemoEvent {
  id: string;
  event_type: string;
  portal: string;
  flow_type: FlowType;
  workflow_step: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ── Mapper: WorkflowData (XState) → snake_case wire format ─────────────────────────

function toSnakeCaseShape(w: WorkflowData): DemoState {
  return {
    id:                (w as any).id || "demo",
    flow_type:         w.flowType,
    enrollment_status: w.enrollmentStatus as "pending" | "enrolled",
    consent_status:    w.consentStatus,
    bi_status:         w.biStatus as any,
    bi_result:         (w as any).biResult ?? null,
    pa_status:         w.paStatus,
    appeal_status:     w.appealStatus,
    qs_status:         (w as any).qsStatus ?? "none",
    pap_status:        (w as any).papStatus ?? "none",
    pharmacy_status:   w.pharmacyStatus,
    workflow_step:     ((w as any).workflowStep ?? 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    updated_at:        (w as any).updatedAt ?? new Date().toISOString(),
    updated_by:        (w as any).updatedBy ?? "System",
  };
}

function eventToSnake(e: StoreDemoEvent): DemoEvent {
  return {
    id:            e.id,
    event_type:    e.eventType,
    portal:        e.portal,
    flow_type:     e.flowType,
    workflow_step: e.workflowStep,
    metadata:      e.metadata,
    created_at:    e.createdAt,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDemoState(portal: Portal) {
  const workflowState = usePersonaState(portal as any);
  const dispatch = useWorkflowDispatch();

  const state: DemoState = toSnakeCaseShape(workflowState.workflowData);
  const events: DemoEvent[] = [...workflowState.events]
    .map((e: any) => eventToSnake(e))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  const actions = {
    enrollPatient:  () => dispatch('ENROLL', { portal }),
    runBI:          () => dispatch('RUN_BI', { portal }),
    completeBI:     (result: DemoState["bi_result"]) => dispatch('COMPLETE_BI', { portal, result }),
    submitPA:       (metadata?: Record<string, unknown>) => dispatch('SUBMIT_PA', { portal, metadata }),
    approvePA:      () => dispatch('APPROVE_PA', { portal }),
    denyPA:         () => dispatch('DENY_PA', { portal }),
    fillRx:         () => dispatch('FILL_RX', { portal }),
    shipRx:         () => dispatch('SHIP_RX', { portal }),
    deliverRx:      () => dispatch('DELIVER_RX', { portal }),
    changeFlow:     (flow: FlowType) => dispatch('CHANGE_FLOW', { portal, flow }),
    resetDemo:      () => dispatch('RESET_DEMO', { portal }),
  };

  return {
    state,
    events,
    loading: false,  // XState actor is synchronous — never loading
    actions,
  };
}
