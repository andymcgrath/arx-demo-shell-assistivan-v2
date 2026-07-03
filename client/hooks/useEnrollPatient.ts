/**
 * useEnrollPatient — CRM bridge hook
 *
 * Drop-in replacement for arx-prototype-crm's useEnrollPatient.ts
 * Dispatches INVITE event to the workflow actor.
 * Loading state derives from XState actor enrollment parallel state.
 */
import { useCallback } from "react";
import { useSelector } from "@xstate/react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { getWorkflowActor } from "@/engine/actorSingleton";

interface EnrollPayload {
  caseId: string;
  contactMethod: "phone" | "email";
}

export function useEnrollPatient() {
  const dispatch = useWorkflowDispatch();
  const actor = getWorkflowActor();

  const isPending = useSelector(actor, (snapshot) => {
    const enrollState = snapshot.children.enrollment?.getSnapshot();
    return enrollState?.status === "active" && enrollState?.value !== "invited";
  });

  const mutate = useCallback(
    (_payload: EnrollPayload, options?: { onSuccess?: () => void }) => {
      const timer = setTimeout(() => {
        dispatch('ENROLL', { portal: 'crm' });
        dispatch('INVITE', { portal: 'crm' });
        options?.onSuccess?.();
      }, 600);

      return () => clearTimeout(timer);
    },
    [dispatch]
  );

  return {
    mutate,
    isPending,
    isSuccess: false,
    isError: false,
  };
}
