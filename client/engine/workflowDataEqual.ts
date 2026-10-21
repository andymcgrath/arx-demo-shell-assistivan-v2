import type { WorkflowData } from "./types";

/**
 * True when two workflowData snapshots hold the same values. It compares the keys of both: some fields are optional and
 * absent from the starting data (`medbvStatus`, `copayClaims`, `appealRuleActive`), so a field that appears later must
 * count as a change. Comparing only the old object's keys would miss it and leave the UI stale.
 */
export function sameWorkflowData(a: WorkflowData, b: WorkflowData): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof WorkflowData>;
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
