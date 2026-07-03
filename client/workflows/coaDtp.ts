import { setup, assign } from "xstate";
import type { MachineContext, WorkflowData } from "@/engine/types";

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: "CoA_DTP",
  enrollmentStatus: "none",
  smsVerified: false,
  otpVerified: false,
  enrollmentInviteSent: false,
  enrollmentAcknowledged: false,
  welcomeDismissed: false,
  consentStatus: "pending",
  paStatus: "none",
  biStatus: "none",
  biResult: null,
  pharmacyStatus: "none",
  dispatchStatus: "none",
  qsStatus: "none",
  papStatus: "none",
  selectedPharmacy: null,
  providerPACompleted: false,
  paSubmittedAt: null,
  paApprovedAt: null,
  cashOfferStatus: "none",
  paymentVerified: false,
  patientShipDate: null,
}

const initialContext: MachineContext = {
  workflowData: { ...INITIAL_WORKFLOW_DATA },
  events: [],
  _snapshots: [],
};

export const coaDtpMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as
      | { type: "ENROLL" }
      | { type: "VERIFY_SMS" }
      | { type: "VERIFY_OTP" }
      | { type: "CONFIRM_CONSENT" }
      | { type: "RUN_BI" }
      | { type: "COMPLETE_BI" }
      | { type: "SUBMIT_PA" }
      | { type: "DENY_PA" }
      | { type: "SEND_CASH_OFFER" }
      | { type: "PATIENT_PAYS" }
      | { type: "VERIFY_PAYMENT" }
      | { type: "PATIENT_SETS_ADDRESS" }
      | { type: "PATIENT_SELECTS_SHIP_DATE" }
      | { type: "KICK_OFF_FILL" }
      | { type: "FILL_RX" }
      | { type: "SHIP_RX" }
      | { type: "DELIVER_RX" }
      | { type: "RESET" },
  },
}).createMachine({
  id: "coaDtp",
  context: initialContext,
  initial: "idle",
  on: {
    RESET: {
      target: ".idle",
      actions: assign(() => ({
        workflowData: { ...INITIAL_WORKFLOW_DATA },
        events: [],
        _snapshots: [],
      })),
    },
  },
  states: {
    idle: {
      on: {
        ENROLL: {
          target: "enrolled",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, enrollmentStatus: "enrolled", enrollmentInviteSent: true }) }),
        },
      },
    },
    enrolled: {
      on: {
        VERIFY_SMS: {
          target: "smsVerified",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, smsVerified: true }) }),
        },
      },
    },
    smsVerified: {
      on: {
        VERIFY_OTP: {
          target: "otpVerified",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, otpVerified: true }) }),
        },
      },
    },
    otpVerified: {
      on: {
        CONFIRM_CONSENT: {
          target: "consentConfirmed",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, consentStatus: "confirmed" }) }),
        },
      },
    },
    consentConfirmed: {
      on: {
        RUN_BI: {
          target: "biRunning",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "running" }) }),
        },
      },
    },
    biRunning: {
      on: {
        COMPLETE_BI: {
          target: "biComplete",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "complete" }) }),
        },
      },
    },
    biComplete: {
      on: {
        SUBMIT_PA: {
          target: "paSubmitted",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "submitted", paSubmittedAt: new Date().toISOString() }) }),
        },
      },
    },
    paSubmitted: {
      on: {
        DENY_PA: {
          target: "paDenied",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "denied" }) }),
        },
      },
    },
    paDenied: {
      on: {
        SEND_CASH_OFFER: {
          target: "cashOfferSent",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, cashOfferStatus: "sent" }) }),
        },
      },
    },
    cashOfferSent: {
      on: {
        PATIENT_PAYS: {
          target: "paymentProcessed",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, cashOfferStatus: "paid" }) }),
        },
      },
    },
    paymentProcessed: {
      on: {
        VERIFY_PAYMENT: {
          target: "paymentVerified",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, paymentVerified: true }) }),
        },
      },
    },
    paymentVerified: {
      on: {
        PATIENT_SETS_ADDRESS: {
          target: "addressSet",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, dispatchStatus: "selected" }) }),
        },
      },
    },
    addressSet: {
      on: {
        PATIENT_SELECTS_SHIP_DATE: {
          target: "shipDateSelected",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, patientShipDate: new Date().toISOString() }) }),
        },
      },
    },
    shipDateSelected: {
      on: {
        KICK_OFF_FILL: {
          target: "rxProcessing",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "processing" }) }),
        },
      },
    },
    rxProcessing: {
      on: {
        FILL_RX: {
          target: "rxReady",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "ready" }) }),
        },
      },
    },
    rxReady: {
      on: {
        SHIP_RX: {
          target: "rxShipped",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "shipped" }) }),
        },
      },
    },
    rxShipped: {
      on: {
        DELIVER_RX: {
          target: "rxDelivered",
          actions: assign({ workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "delivered" }) }),
        },
      },
    },
    rxDelivered: {},
  },
});
