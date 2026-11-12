/**
 * Dispatch clearance: the one signal that says "the case may go to a pharmacy". `dispatchStatus` moves from "none"
 * to "pending_selection". Scheduling and the route rules read it. Nothing else decides it.
 *
 * Anything that clears a case can set it: PAP activation, a verified copay or self-pay payment, a PA approval.
 * Each block calls `clearDispatch` and knows nothing about the others (CLAUDE.md rule 5). A case already past
 * "none" keeps its status, so clearing twice is a no-op.
 */
import type { WorkflowData } from "@/engine/types";

export const clearDispatch = (d: Pick<WorkflowData, "dispatchStatus">): Pick<WorkflowData, "dispatchStatus"> => ({
  dispatchStatus: d.dispatchStatus === "none" ? "pending_selection" : d.dispatchStatus,
});

/** The case has been cleared to dispatch (or is already past it). */
export const dispatchCleared = (d: Pick<WorkflowData, "dispatchStatus">): boolean => d.dispatchStatus !== "none";
