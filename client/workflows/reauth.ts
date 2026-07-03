/**
 * Reauthorization Workflow Machine — XState v5
 *
 * Handles workflow for reauthorization requests:
 * - CRM review and provider notification
 * - Prior authorization resubmission and approval
 */

import { setup, assign } from "xstate";

export interface ReauthContext {
  flowType: "standard" | "PAP";
  crmStatus: "pending" | "notified" | "complete";
  priorAuthStatus: "idle" | "submitted" | "approved" | "denied";
  resubmissionReason: string;
  updatedAt: string;
  updatedBy: "CRM" | "Provider" | "System";
  _snapshots: ReauthContext[];
  _events: Array<{
    type: string;
    timestamp: string;
    actor: string;
    metadata?: Record<string, unknown>;
  }>;
}

export const reauthMachine = setup({
  types: {
    context: {} as ReauthContext,
    events: {} as
      | { type: "INITIATE_REAUTH"; reason: string }
      | { type: "NOTIFY_PROVIDER" }
      | { type: "SUBMIT_REAUTH_PA" }
      | { type: "APPROVE_REAUTH" }
      | { type: "DENY_REAUTH" },
  },
  guards: {
    isCrmReviewComplete: ({ context }) => context.crmStatus === "complete",
    isPriorAuthApproved: ({ context }) => context.priorAuthStatus === "approved",
  },
  actions: {
    recordReauthInitiation: assign(({ context, event }) => {
      if (event.type !== "INITIATE_REAUTH") return context;
      return {
        ...context,
        resubmissionReason: event.reason,
        updatedAt: new Date().toISOString(),
        updatedBy: "System",
        _events: [
          ...context._events,
          {
            type: "REAUTH_INITIATED",
            timestamp: new Date().toISOString(),
            actor: "System",
            metadata: { reason: event.reason },
          },
        ],
      };
    }),

    updateCrmNotified: assign(({ context }) => ({
      ...context,
      crmStatus: "notified",
      updatedAt: new Date().toISOString(),
      updatedBy: "CRM",
      _events: [
        ...context._events,
        {
          type: "PROVIDER_NOTIFIED",
          timestamp: new Date().toISOString(),
          actor: "CRM",
        },
      ],
    })),

    updateCrmComplete: assign(({ context }) => ({
      ...context,
      crmStatus: "complete",
      updatedAt: new Date().toISOString(),
      updatedBy: "CRM",
      _events: [
        ...context._events,
        {
          type: "CRM_REVIEW_COMPLETE",
          timestamp: new Date().toISOString(),
          actor: "CRM",
        },
      ],
    })),

    updatePASubmitted: assign(({ context }) => ({
      ...context,
      priorAuthStatus: "submitted",
      updatedAt: new Date().toISOString(),
      updatedBy: "Provider",
      _events: [
        ...context._events,
        {
          type: "REAUTH_PA_SUBMITTED",
          timestamp: new Date().toISOString(),
          actor: "Provider",
        },
      ],
    })),

    updatePAApproved: assign(({ context }) => ({
      ...context,
      priorAuthStatus: "approved",
      updatedAt: new Date().toISOString(),
      updatedBy: "System",
      _events: [
        ...context._events,
        {
          type: "REAUTH_PA_APPROVED",
          timestamp: new Date().toISOString(),
          actor: "System",
        },
      ],
    })),

    updatePADenied: assign(({ context }) => ({
      ...context,
      priorAuthStatus: "denied",
      updatedAt: new Date().toISOString(),
      updatedBy: "System",
      _events: [
        ...context._events,
        {
          type: "REAUTH_PA_DENIED",
          timestamp: new Date().toISOString(),
          actor: "System",
        },
      ],
    })),

    pushSnapshot: assign(({ context }) => ({
      ...context,
      _snapshots: [...context._snapshots, JSON.parse(JSON.stringify(context))],
    })),

    restoreLastSnapshot: assign(({ context }) => {
      if (context._snapshots.length === 0) return context;
      const lastSnapshot = context._snapshots[context._snapshots.length - 1];
      const remainingSnapshots = context._snapshots.slice(0, -1);
      return {
        ...lastSnapshot,
        _snapshots: remainingSnapshots,
      };
    }),

    resetContext: () => ({
      flowType: "standard",
      crmStatus: "pending",
      priorAuthStatus: "idle",
      resubmissionReason: "",
      updatedAt: new Date().toISOString(),
      updatedBy: "System",
      _snapshots: [],
      _events: [
        {
          type: "WORKFLOW_INIT",
          timestamp: new Date().toISOString(),
          actor: "System",
        },
      ],
    }),
  },
}).createMachine({
  id: "reauth",
  context: {
    flowType: "standard",
    crmStatus: "pending",
    priorAuthStatus: "idle",
    resubmissionReason: "",
    updatedAt: new Date().toISOString(),
    updatedBy: "System",
    _snapshots: [],
    _events: [
      {
        type: "WORKFLOW_INIT",
        timestamp: new Date().toISOString(),
        actor: "System",
      },
    ],
  },
  initial: "idle",
  states: {
    idle: {
      on: {
        INITIATE_REAUTH: {
          target: "reviewing",
          actions: ["recordReauthInitiation", "pushSnapshot"],
        },
      },
    },

    reviewing: {
      type: "parallel",
      states: {
        crmReview: {
          initial: "pending",
          states: {
            pending: {
              on: {
                NOTIFY_PROVIDER: {
                  target: "notified",
                  actions: ["updateCrmNotified", "pushSnapshot"],
                },
              },
            },
            notified: {
              after: {
                2000: {
                  target: "complete",
                  actions: ["updateCrmComplete"],
                },
              },
              on: {
                NOTIFY_PROVIDER: {
                  target: "complete",
                  actions: ["updateCrmComplete", "pushSnapshot"],
                },
              },
            },
            complete: {
              type: "final",
            },
          },
        },

        priorAuth: {
          initial: "idle",
          states: {
            idle: {
              on: {
                SUBMIT_REAUTH_PA: {
                  target: "submitted",
                  actions: ["updatePASubmitted", "pushSnapshot"],
                },
              },
            },
            submitted: {
              after: {
                3000: {
                  target: "approved",
                  actions: ["updatePAApproved"],
                },
              },
              on: {
                APPROVE_REAUTH: {
                  target: "approved",
                  actions: ["updatePAApproved", "pushSnapshot"],
                },
                DENY_REAUTH: {
                  target: "denied",
                  actions: ["updatePADenied", "pushSnapshot"],
                },
              },
            },
            approved: {
              type: "final",
            },
            denied: {
              type: "final",
            },
          },
        },
      },

      onDone: "complete",
    },

    complete: {
      type: "final",
    },
  },

  on: {
    UNDO: {
      actions: "restoreLastSnapshot",
    },
    RESET: {
      target: ".idle",
      actions: "resetContext",
    },
  },
});
