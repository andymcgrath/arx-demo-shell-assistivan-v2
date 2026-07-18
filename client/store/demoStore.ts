/**
 * demoStore — shell infrastructure only
 *
 * The XState actor (actorSingleton.ts / workflowMachine.ts) is the single
 * source of truth for all workflow state: enrollment, consent, PA, pharmacy,
 * events log, undo snapshots. Components read workflow state via
 * usePersonaState() or useSelector(actor, ...).
 *
 * This store holds only three things:
 *   flowType  — which workflow is active (drives which XState machine to use)
 *   enrollmentFormTabOpen — CRM UI tab state
 *   resetNonce — bumped on every resetDemo() call. Portals with their own
 *     internal navigation guards (e.g. the patient portal's StateDrivenNav)
 *     watch this to force-navigate back to the correct screen on reset, even
 *     when the guard would otherwise ignore a state-driven navigation.
 *
 * Persisted to sessionStorage so a page refresh restores the active flow.
 * On restore, DemoShell's mount effect calls switchWorkflow() to match the
 * actor to the persisted flowType.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { resetCurrentWorkflowActor } from "../engine/actorSingleton";

// ── Re-exports so existing portal imports keep working ────────────────────────

export type { DemoEvent } from '../engine/types';
export type { FlowType } from '../engine/types';

// ── Constants (used by Field portal) ─────────────────────────────────────────
//
// FIELD_TASKS, FIELD_CASES, and FIELD_HCPS used to live here, but they were
// disconnected from the Field Portal dashboard's own ad hoc data and from
// each other. They've been replaced by the unified, persisted dataset in
// client/store/fieldStore.ts. FIELD_PATIENTS stays here for now — the "My
// Patients" tab isn't part of that unification.

export interface FieldPatient {
  id: string;
  patient: string;
  arbId: string;
  dob: string;
  primaryPrescriber: string;
  primarySOC: string;
  territory: string;
  region: string;
  consentExpi: string;
  enrollmentDate: string;
}

export const FIELD_PATIENTS: FieldPatient[] = [
  {
    id: "AF-856097",
    patient: "EMILIONO BR...",
    arbId: "AF-856097",
    dob: "Sep 3, 1980",
    primaryPrescriber: "---",
    primarySOC: "---",
    territory: "---",
    region: "---",
    consentExpi: "09/05/24, 03:...",
    enrollmentDate: "09/05/24",
  },
  {
    id: "AF-165218",
    patient: "●●●●●●●●●●",
    arbId: "AF-165218",
    dob: "Sep 1, 1990",
    primaryPrescriber: "DR SMITH",
    primarySOC: "NYC SOC",
    territory: "NY METRO",
    region: "Northeast",
    consentExpi: "09/13/24, 12:...",
    enrollmentDate: "09/13/24",
  },
  {
    id: "AF-126641",
    patient: "●●●●●●●●●●",
    arbId: "AF-126641",
    dob: "Sep 2, 1990",
    primaryPrescriber: "DR THOMPSON",
    primarySOC: "Boston SOC",
    territory: "MA AREA",
    region: "Northeast",
    consentExpi: "---",
    enrollmentDate: "08/15/24",
  },
  {
    id: "AF-138020",
    patient: "●●●●●●●●●●",
    arbId: "AF-138020",
    dob: "Jun 15, 1975",
    primaryPrescriber: "JOHN MAJKUS",
    primarySOC: "NJ SOC",
    territory: "NJ AREA",
    region: "Mid-Atlantic",
    consentExpi: "10/20/24, 14:...",
    enrollmentDate: "10/20/24",
  },
  {
    id: "AF-145321",
    patient: "●●●●●●●●●●",
    arbId: "AF-145321",
    dob: "Mar 22, 1985",
    primaryPrescriber: "DR WILLIAMS",
    primarySOC: "Philadelphia SOC",
    territory: "PA METRO",
    region: "Mid-Atlantic",
    consentExpi: "11/05/24, 09:...",
    enrollmentDate: "11/05/24",
  },
  {
    id: "AF-152789",
    patient: "●●●●●●●●●●",
    arbId: "AF-152789",
    dob: "Dec 8, 1992",
    primaryPrescriber: "DR JOHNSON",
    primarySOC: "Hartford SOC",
    territory: "CT AREA",
    region: "Northeast",
    consentExpi: "12/18/24, 11:...",
    enrollmentDate: "12/18/24",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type Portal = "HUB" | "Patient" | "Provider" | "Field" | "Analytics" | "iAssist";

export interface Pharmacy {
  name: string;
  address: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
}

import type { FlowType } from '../engine/types';

export interface DemoState {
  flowType: FlowType;
  enrollmentFormTabOpen: boolean;
  /** Bumped on every resetDemo() call — see file header comment. */
  resetNonce: number;
}

export interface DemoActions {
  changeFlow: (flow: FlowType) => void;
  switchFlow: (newFlow: FlowType) => void;
  resetDemo: (flow?: FlowType) => void;
  closeEnrollmentFormTab: () => void;
  openEnrollmentFormTab: () => void;
}

export type DemoStore = DemoState & DemoActions;

export const SEED: DemoState = {
  flowType: "Fax_QS_PA_Approved",
  enrollmentFormTabOpen: false,
  resetNonce: 0,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...SEED,

      closeEnrollmentFormTab(): void {
        set({ enrollmentFormTabOpen: false });
      },

      openEnrollmentFormTab(): void {
        set({ enrollmentFormTabOpen: true });
      },

      changeFlow(flow): void {
        set({ flowType: flow });
      },

      switchFlow(newFlow): void {
        // Actor snapshot save/restore is handled by actorSingleton.switchWorkflow —
        // we only need to track the active flow name here for bootstrapping.
        set({ flowType: newFlow });
      },

      resetDemo(flow): void {
        const targetFlow = flow ?? get().flowType;
        set({ ...SEED, flowType: targetFlow, resetNonce: get().resetNonce + 1 });
        resetCurrentWorkflowActor();
      },
    }),
    {
      name: "arx-demo-shell",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
