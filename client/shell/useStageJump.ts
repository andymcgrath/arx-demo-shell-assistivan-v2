import { useCallback } from "react";
import { getWorkflowActor } from "@/engine/actorSingleton";
import { useDemoStore } from "@/store/demoStore";
import { jumpEvents } from "./stageJump";

/**
 * Jumps the running case to a stage: resets it and replays the stage's ladder (shell/stageJump.ts). The header's jump menu and
 * the patient view's phase rail both use it. A reset bumps `resetNonce`, so the patient screen snaps to the right place.
 */
export function useStageJump() {
  const resetDemo = useDemoStore((s) => s.resetDemo);
  return useCallback(
    (stage: number) => {
      const before = (getWorkflowActor().getSnapshot().context as { workflowData: { flowType: any; choices?: Record<string, string> } }).workflowData;
      resetDemo();
      const actor = getWorkflowActor();
      actor.send({ type: "RESET" });
      for (const event of jumpEvents(before.flowType, stage, before.choices)) actor.send(event as any);
      // resetDemo() already wrote the right flow to 'arx-demo-shell'. Leave it, or a reload before the next write reverts the workflow.
      sessionStorage.removeItem("arx-patient-identity");
      sessionStorage.removeItem("arxWorkflow_v2");
      sessionStorage.removeItem("arx-prespap-application");
    },
    [resetDemo],
  );
}
