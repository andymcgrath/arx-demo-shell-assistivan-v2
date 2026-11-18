import { propValueEquals } from "@/engine/workflow/props";
import { ENROLLMENT_CAPTURE_FULL } from "@/engine/workflow/components";
import { useRecipeModule } from "./useRecipeModule";

/**
 * True when the active scenario's enrollment block captures the signature and the insurance upload (`capture`). The pages
 * then tell the workflow about each step before consent confirms. UI reads the definition through this hook (CLAUDE.md rule 7).
 */
export function useEnrollmentCapture(): boolean {
  return propValueEquals(useRecipeModule("enrollment")?.props?.capture, ENROLLMENT_CAPTURE_FULL);
}
