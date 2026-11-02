import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "@xstate/react";
import { useWorkflowActor } from "@/engine/WorkflowProvider";
import type { WorkflowData } from "@/engine/types";
import { eventFor, triggerRows, type TriggerRow } from "@/engine/workflow/triggers";
import { definitionFor } from "@/workflows/definitions";
import { stageMapFor } from "@/workflows/stageMaps";
import { defaultPayload } from "./triggerPayloads";

/**
 * The Trigger rows for the running case, and the way to send one. The Trigger panel and the phase rail's Next button both
 * use it, so an agent step is held open the same way from either: sending VIEW_STAGE, keeping the stage open until the
 * result lands (as the CRM keeps its tab open), then sending LEAVE_STAGE. Leaving the view closes any stage still open.
 */
export function useTriggerRows() {
  const actor = useWorkflowActor();
  const data = useSelector(actor, (s) => (s.context as { workflowData: WorkflowData }).workflowData);
  const [lastFired, setLastFired] = useState("");
  /** Stages this hook has open. */
  const viewing = useRef(new Set<string>());

  const rows = useMemo(() => {
    const def = definitionFor(data.flowType);
    return def ? triggerRows(def, data, stageMapFor(data.flowType), defaultPayload) : [];
  }, [data]);

  // Close a stage when its result has landed (the agent row is gone).
  useEffect(() => {
    for (const stage of [...viewing.current]) {
      if (!rows.some((r) => r.kind === "agent" && r.stage === stage)) {
        viewing.current.delete(stage);
        actor.send({ type: "LEAVE_STAGE", portal: "crm", stage } as any);
        setLastFired("");
      }
    }
  }, [rows, actor]);
  // Close every open stage when the view goes away, as closing the tab does.
  useEffect(
    () => () => {
      for (const stage of viewing.current) actor.send({ type: "LEAVE_STAGE", portal: "crm", stage } as any);
      viewing.current.clear();
    },
    [actor],
  );

  /** Sends a row. `chosen` overrides the default payload (a picked pharmacy, a date). */
  const fire = (row: TriggerRow, chosen: Record<string, unknown> = {}) => {
    const payload = { ...row.payload, ...defaultPayload(row.event, data), ...chosen };
    if (row.kind === "agent" && row.stage) viewing.current.add(row.stage);
    actor.send(eventFor({ ...row, payload }) as any);
    const wait = row.reveals?.afterMs ? `${Math.round(row.reveals.afterMs / 100) / 10}s` : "now";
    setLastFired(row.kind === "agent" ? `${row.label}: waiting ${wait}` : `Sent ${row.label}`);
  };

  return { data, rows, fire, lastFired };
}
