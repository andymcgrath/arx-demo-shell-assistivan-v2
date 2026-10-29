import { useRecipeModule } from "./useRecipeModule";

/**
 * True when the active scenario is the free drug (PAP) program: its recipe has `financial_assistance` with the `pap`
 * variant. The drug is HCP administered, so the patient sees "injection" and "appointment" instead of "infusion".
 */
export function useFreeDrug(): boolean {
  return useRecipeModule("financial_assistance")?.props?.variant === "pap";
}
