import { useRecipeModule } from "./useRecipeModule";

/**
 * True when the active scenario's recipe has the Bridge: the `cash_offer` block with the `bridge` variant. The patient gets a
 * free supply after a denied PA, enrolls in $0 copay, and confirms the delivery. UI reads the definition through this hook
 * and never checks `flowType ===` (CLAUDE.md rule 7).
 */
export function useBridge(): boolean {
  return useRecipeModule("cash_offer")?.props?.variant === "bridge";
}
