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

export const PATIENTS: Record<string, string> = {
  "EI-56342": "Keanu Dixon",
  "EI-56343": "Sarah Miller",
  "EI-56344": "James Wilson",
  "EI-56345": "Maria Garcia",
  "EI-56346": "David Chen",
};

export const FIELD_AGENTS: Record<string, string> = {
  "Sarah Mitchell": "SM-001",
  "James Chen": "JC-002",
  "Maria Rodriguez": "MR-003",
  "Jessica Anderson": "JA-004",
  "Robert Thompson": "RT-005",
  "David Martinez": "DM-006",
};

export interface FieldTask {
  id: string;
  subject: string;
  prescriber: string;
  patient: string;
  patientId: string;
  status: string;
  subStatus: string;
  dueDate: string;
  territory: string;
  assignedTo: string;
  createdAt: string;
}

export interface FieldCase {
  id: string;
  caseNumber: string;
  status: string;
  serviceType: string;
  patient: string;
  patientId: string;
  prescriber: string;
  territory: string;
  frmContact: string;
  createdAt: string;
}

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

export interface FieldHCP {
  id: string;
  physician: string;
  npi: string;
  preferredContact: string;
  officePhone: string;
  officeFax: string;
  officeEmail: string;
  zip: string;
}

export const FIELD_TASKS: FieldTask[] = [
  {
    id: "TASK-001",
    subject: "FRM Email N...",
    prescriber: "JOHN MAJKUS",
    patient: "●●●●●●●●●●",
    patientId: "AF-138020",
    status: "Open",
    subStatus: "No follow up needed",
    dueDate: "Mar 31, 2025",
    territory: "NY METRO ...",
    assignedTo: "Jean Claude",
    createdAt: "03/28/25, 12:...",
  },
  {
    id: "TASK-002",
    subject: "Patient Call",
    prescriber: "MISTER HEALTH",
    patient: "●●●●●●●●●●",
    patientId: "AF-128947",
    status: "Open",
    subStatus: "Pending Response",
    dueDate: "Apr 01, 2025",
    territory: "NJ AREA",
    assignedTo: "Sarah Mitchell",
    createdAt: "03/29/25, 14:...",
  },
  {
    id: "TASK-003",
    subject: "Prior Auth Follow",
    prescriber: "JOHN FRANCONI",
    patient: "●●●●●●●●●●",
    patientId: "AF-145623",
    status: "In Progress",
    subStatus: "Awaiting Insurance",
    dueDate: "Apr 05, 2025",
    territory: "PA METRO",
    assignedTo: "Maria Rodriguez",
    createdAt: "03/28/25, 09:...",
  },
  {
    id: "TASK-004",
    subject: "Enrollment Verification",
    prescriber: "DR SMITH",
    patient: "●●●●●●●●●●",
    patientId: "AF-132105",
    status: "Open",
    subStatus: "No follow up scheduled",
    dueDate: "Apr 02, 2025",
    territory: "NY METRO",
    assignedTo: "James Chen",
    createdAt: "03/27/25, 11:...",
  },
  {
    id: "TASK-005",
    subject: "Refill Request",
    prescriber: "DR THOMPSON",
    patient: "●●●●●●●●●●",
    patientId: "AF-139876",
    status: "Pending",
    subStatus: "Waiting for Payer",
    dueDate: "Mar 30, 2025",
    territory: "CT AREA",
    assignedTo: "Jean Claude",
    createdAt: "03/28/25, 15:...",
  },
  {
    id: "TASK-006",
    subject: "Document Request",
    prescriber: "DR WILLIAMS",
    patient: "●●●●●●●●●●",
    patientId: "AF-141234",
    status: "Open",
    subStatus: "Missing Documentation",
    dueDate: "Apr 03, 2025",
    territory: "MA AREA",
    assignedTo: "Jessica Anderson",
    createdAt: "03/29/25, 10:...",
  },
];

export const FIELD_CASES: FieldCase[] = [
  {
    id: "00001287",
    caseNumber: "00001287",
    status: "Initiated",
    serviceType: "Onboarding",
    patient: "●●●●●●●●●●",
    patientId: "AF-138020",
    prescriber: "JOHN FRANCONI",
    territory: "NY METRO S...",
    frmContact: "---",
    createdAt: "03/26/25, 09:...",
  },
  {
    id: "00001288",
    caseNumber: "00001288",
    status: "In Progress",
    serviceType: "Prior Auth",
    patient: "●●●●●●●●●●",
    patientId: "AF-145321",
    prescriber: "DR SMITH",
    territory: "NJ AREA",
    frmContact: "Jean Claude",
    createdAt: "03/27/25, 14:...",
  },
  {
    id: "00001289",
    caseNumber: "00001289",
    status: "Closed",
    serviceType: "Enrollment",
    patient: "●●●●●●●●●●",
    patientId: "AF-132456",
    prescriber: "DR THOMPSON",
    territory: "PA METRO",
    frmContact: "Sarah Mitchell",
    createdAt: "03/25/25, 11:...",
  },
  {
    id: "00001290",
    caseNumber: "00001290",
    status: "Initiated",
    serviceType: "Refill Coordination",
    patient: "●●●●●●●●●●",
    patientId: "AF-138947",
    prescriber: "DR WILLIAMS",
    territory: "CT AREA",
    frmContact: "---",
    createdAt: "03/26/25, 16:...",
  },
  {
    id: "00001291",
    caseNumber: "00001291",
    status: "In Progress",
    serviceType: "Financial Assistance",
    patient: "●●●●●●●●●●",
    patientId: "AF-141256",
    prescriber: "JOHN MAJKUS",
    territory: "MA AREA",
    frmContact: "James Chen",
    createdAt: "03/28/25, 09:...",
  },
  {
    id: "00001292",
    caseNumber: "00001292",
    status: "Pending Review",
    serviceType: "Appeals",
    patient: "●●●●●●●●●●",
    patientId: "AF-143789",
    prescriber: "DR JOHNSON",
    territory: "NY METRO",
    frmContact: "Jessica Anderson",
    createdAt: "03/29/25, 13:...",
  },
];

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

export const FIELD_HCPS: FieldHCP[] = [
  {
    id: "NPI-001",
    physician: "Teslar",
    npi: "421421412",
    preferredContact: "Email",
    officePhone: "---",
    officeFax: "---",
    officeEmail: "---",
    zip: "---",
  },
  {
    id: "NPI-002",
    physician: "Mister Health Care ...",
    npi: "1234567890",
    preferredContact: "Phone",
    officePhone: "---",
    officeFax: "---",
    officeEmail: "---",
    zip: "---",
  },
  {
    id: "NPI-003",
    physician: "JOHN FRANCONI",
    npi: "1003002635",
    preferredContact: "Email",
    officePhone: "---",
    officeFax: "---",
    officeEmail: "---",
    zip: "07002",
  },
  {
    id: "NPI-004",
    physician: "DR SMITH",
    npi: "1234567899",
    preferredContact: "Phone",
    officePhone: "(212) 555-0100",
    officeFax: "(212) 555-0101",
    officeEmail: "drsmith@medical.com",
    zip: "10001",
  },
  {
    id: "NPI-005",
    physician: "DR THOMPSON",
    npi: "1234567898",
    preferredContact: "Email",
    officePhone: "(617) 555-0200",
    officeFax: "(617) 555-0201",
    officeEmail: "dthompson@medical.com",
    zip: "02108",
  },
  {
    id: "NPI-006",
    physician: "DR WILLIAMS",
    npi: "1234567897",
    preferredContact: "Email",
    officePhone: "(215) 555-0300",
    officeFax: "(215) 555-0301",
    officeEmail: "dwilliams@medical.com",
    zip: "19103",
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
