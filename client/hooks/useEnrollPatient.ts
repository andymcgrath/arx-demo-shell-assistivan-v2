/**
 * useEnrollPatient — CRM bridge hook
 *
 * Drop-in replacement for arx-prototype-crm's useEnrollPatient.ts
 * Dispatches INVITE event to the workflow actor.
 * Loading state derives from workflowData.patientInvited.
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

  // Pending until the invite goes out. Read off the data: the workflow machines have a single state.
  const isPending = useSelector(actor, (snapshot) => !snapshot.context.workflowData.patientInvited);

  const mutate = useCallback(
    (_payload: EnrollPayload, options?: { onSuccess?: () => void }) => {
      const timer = setTimeout(() => {
        dispatch('REFERRAL_RECEIVED', { portal: 'crm' });
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
