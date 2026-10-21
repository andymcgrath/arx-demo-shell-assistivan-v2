import { useActiveWorkflowId } from "@/engine/WorkflowProvider";
import type { ModuleId, ModuleSpec } from "@/engine/workflow/components";
import { ALL_SCENARIOS } from "@/workflows/scenarios";

/**
 * The module spec (with its props) the active scenario's recipe lists, or undefined when it does not list it.
 * UI reads the definition through this hook and never checks `flowType ===` (CLAUDE.md rule 7).
 */
export function useRecipeModule(id: ModuleId): ModuleSpec | undefined {
  const flowType = useActiveWorkflowId();
  return ALL_SCENARIOS.find((s) => s.flowType === flowType)?.recipe?.modules.find((m) => m.id === id);
}
