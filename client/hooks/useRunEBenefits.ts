/**
 * useRunEBenefits — CRM bridge hook
 *
 * Drop-in replacement for arx-prototype-crm's useRunEBenefits.ts
 * Dispatches RUN_BI event to the workflow actor. Completion is
 * handled externally (tab-click detection in Index.tsx) so the UI
 * shows the "Running" state before auto-completing.
 *
 * isPending derives from XState actor benefitsInquiry state:
 * true when submitted and not yet complete.
 */
import { useCallback, useEffect, useRef } from "react";
import { useSelector } from "@xstate/react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { getWorkflowActor } from "@/engine/actorSingleton";

export function useRunEBenefits() {
  const dispatch = useWorkflowDispatch();
  const onSuccessRef = useRef<(() => void) | null>(null);
  const actor = getWorkflowActor();

  const isPending = useSelector(actor, (snapshot) => {
    const biState = snapshot.children.benefitsInquiry?.getSnapshot();
    return biState?.status === "active" && biState?.value !== "complete";
  });

  const mutate = useCallback(
    (_caseId: string, options?: { onSuccess?: () => void; onError?: () => void }) => {
      onSuccessRef.current = options?.onSuccess ?? null;
      dispatch('RUN_BI', { portal: 'crm' });
    },
    [dispatch]
  );

  useEffect(() => {
    if (isPending === false && onSuccessRef.current) {
      onSuccessRef.current();
      onSuccessRef.current = null;
    }
  }, [isPending]);

  return {
    mutate,
    isPending,
    isSuccess: false,
    isError: false,
  };
}
