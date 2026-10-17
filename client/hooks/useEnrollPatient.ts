/**
 * useEnrollPatient — CRM bridge hook
 *
 * Drop-in replacement for arx-prototype-crm's useEnrollPatient.ts
 * Dispatches INVITE event to the workflow actor.
 * isPending is true only while an order is in flight (the 600 ms before the invite goes out).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";

interface EnrollPayload {
  caseId: string;
  contactMethod: "phone" | "email";
}

export function useEnrollPatient() {
  const dispatch = useWorkflowDispatch();
  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const mutate = useCallback(
    (_payload: EnrollPayload, options?: { onSuccess?: () => void }) => {
      setIsPending(true);
      const timer = setTimeout(() => {
        dispatch('REFERRAL_RECEIVED', { portal: 'crm' });
        dispatch('INVITE', { portal: 'crm' });
        setIsPending(false);
        options?.onSuccess?.();
      }, 600);
      timerRef.current = timer;

      return () => { clearTimeout(timer); setIsPending(false); };
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
