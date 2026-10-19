/**
 * Does a saved machine snapshot still agree with the branches a demo pins? A demo's `choices` fix the story. Within
 * a session they change only when the presenter picks another demo, which restarts the run. So a saved snapshot on a
 * different branch is stale (for example, saved before the demo pinned one) and must not be restored.
 */
export function snapshotHasChoices(snapshot: unknown, wanted: Record<string, string> | undefined): boolean {
  if (!wanted) return true;
  const have = (snapshot as { context?: { workflowData?: { choices?: Record<string, string> } } } | undefined)?.context?.workflowData?.choices ?? {};
  return Object.entries(wanted).every(([fork, exit]) => have[fork] === exit);
}
