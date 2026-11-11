/**
 * The patient's Back arrow steps the case back the way the presenter's Undo does. The machine restores the state from
 * before the last step, and the patient portal re-syncs to the screen that state belongs to. That keeps the case and the
 * screen together, so the screen the patient lands on can always move forward again.
 */
import { useCallback } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowActor } from "@/engine/WorkflowProvider";
import { useDemoStore } from "@/store/demoStore";

type Undoable = { getSnapshot: () => { context: { _snapshots?: unknown[] } }; send: (e: { type: string }) => void };

/** True when the machine has a step to undo. */
export const canUndoStep = (actor: Undoable): boolean => (actor.getSnapshot().context._snapshots?.length ?? 0) > 0;

/** Undoes the last step. Tells the patient portal to re-sync its screen, even from a sticky one. */
export function undoLastStep(actor: Undoable): void {
  actor.send({ type: "UNDO" });
  useDemoStore.getState().markUndo();
}

export function usePatientBack(): () => void {
  const actor = useWorkflowActor() as unknown as Undoable;
  const navigate = useNavigate();
  return useCallback(() => {
    // At the first step there is nothing to undo, so fall back to the screen before.
    if (canUndoStep(actor)) undoLastStep(actor);
    else navigate(-1);
  }, [actor, navigate]);
}
