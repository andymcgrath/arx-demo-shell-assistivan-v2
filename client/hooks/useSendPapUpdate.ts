/**
 * useSendPapUpdate — CRM bridge hook
 *
 * Fulfillment Center's WF2 (Fax_PAP_Audit) counterpart to useEnrollPatient.ts.
 * Dispatches SEND_PAP_SMS, which is what WorkflowEngine.ts's derivePatientRoute
 * gates /pap-update-sms on (see workflowMachine.ts's updatePapSmsSent). Mirrors
 * useEnrollPatient's mutate/isPending shape so FulfilmentCenter.tsx can treat
 * every catalog item the same way regardless of which event it ultimately
 * dispatches — this replaces the old bespoke "Send SMS to Patient" button
 * that used to live directly in the CRM's BI detail view.
 */
import { useCallback, useState } from "react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";

interface SendPapUpdatePayload {
  caseId: string;
  contactMethod: "phone" | "email";
}

export function useSendPapUpdate() {
  const dispatch = useWorkflowDispatch();
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    (_payload: SendPapUpdatePayload, options?: { onSuccess?: () => void }) => {
      // Dispatch immediately — papSmsSent has to actually be true by the
      // time FulfilmentCenter.tsx marks the order "placed" and shows the
      // success toast. Deferring this inside the setTimeout (matching
      // useEnrollPatient's cosmetic delay) left a ~600ms window where the
      // UI claimed success but WorkflowEngine.ts's derivePatientRoute
      // still saw papSmsSent === false, which could route the patient
      // portal to /enrollment-complete instead of /pap-update-sms if state
      // was read in that window (e.g. switching tabs right after clicking
      // Place Order). The setTimeout now only drives the loading spinner.
      dispatch('SEND_PAP_SMS', { portal: 'crm' });
      setIsPending(true);
      const timer = setTimeout(() => {
        setIsPending(false);
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
