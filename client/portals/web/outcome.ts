import type { WorkflowData } from "@/engine/types";

/**
 * What the client page's last step shows, read from the machine.
 * - `checking`: the gateway has not returned, or has returned and the next step has not started.
 * - `summary`: the PA is approved, so the coverage summary is ready in the Patient Experience.
 * - `referred`: BI found no coverage and the case went to the patient support program. No PA runs, so the page must not
 *   wait for one. The patient's next step is the transfer text.
 */
export type CoverageOutcome = "checking" | "summary" | "referred";

export function coverageOutcome(d: Pick<WorkflowData, "paStatus" | "papTransferStatus">): CoverageOutcome {
  if (d.paStatus === "approved") return "summary";
  if (d.papTransferStatus === "referred") return "referred";
  return "checking";
}
