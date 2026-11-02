/**
 * guidedNav.ts: what the patient view's Next button does, so a client driving the demo alone knows what to do.
 *
 * The next stage's ladder says what moves the case there. If one of those events is something the Trigger rows offer
 * (an agent opens a stage, another app sends an event), Next sends it. If the next thing is the patient's own tap, Next
 * waits and says which screen to use on the phone. Pure: rows and data in, a decision out.
 */
import type { FlowType, WorkflowData } from "@/engine/types";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { isFireable, type TriggerRow } from "@/engine/workflow/triggers";
import { screenMapFor } from "@/workflows/screenMaps";
import { jumpEvents, stageList } from "./stageJump";
import { firstUnfinishedStage, isFinished, PROGRESS_NAMES, progress } from "./stageAt";

export type NextStep =
  /** Send this row. */
  | { kind: "fire"; row: TriggerRow }
  /** The patient does the next thing, on the phone. */
  | { kind: "patient"; hint: string }
  /** The machine does the next thing on its own, after its delay. */
  | { kind: "wait"; row: TriggerRow; hint: string }
  /** The last stage is where the case is. */
  | { kind: "done" };

/** The events a stage adds to the one before it, in ladder order. Ladders build on the stage before. */
function addedEvents(flowType: FlowType, stage: number, choices: Record<string, string> | undefined): string[] {
  const before = stage > 1 ? jumpEvents(flowType, stage - 1, choices).length : 0;
  return jumpEvents(flowType, stage, choices)
    .slice(before)
    .map((e) => e.type);
}

/** The label of the screen the patient is on, from the workflow's screen list. Undefined when it has none. */
function screenLabel(flowType: FlowType, data: WorkflowData, route: string): string | undefined {
  return screenMapFor(flowType)?.screens.find((s) => s.path === route)?.label;
}

export function nextStep(flowType: FlowType, data: WorkflowData, rows: TriggerRow[], route = derivePatientRoute({ workflowData: data } as any)): NextStep {
  const choices = data.choices;
  // The first stage with work left. Working in the ladder's order is what keeps the story right: the patient consents
  // before the PA is decided, because that is how every ladder (and the presenter's jump menu) plays it.
  const todo = firstUnfinishedStage(flowType, choices, data);
  const onLast = todo === null || todo >= stageList(flowType, choices).length;
  const wanted = todo === null ? [] : addedEvents(flowType, todo, choices);
  // A step that moves the case on: an agent step always does, a manual step does when it sets a field that is further along.
  // A claim can be filed again and again. Filing another is not moving on.
  const have = progress(data);
  const advances = (row: TriggerRow) =>
    row.kind === "agent" ||
    (!!row.patch && progress({ ...data, ...row.patch }).some((n, i) => n > have[i] && PROGRESS_NAMES[i] !== "copayClaims"));
  const position = (row: TriggerRow): number => {
    const names = [row.event, row.reveals?.event, ...(row.starts ?? [])].filter((n): n is string => !!n);
    const hits = names.map((n) => wanted.indexOf(n)).filter((i) => i >= 0);
    return hits.length ? Math.min(...hits) : Infinity;
  };
  const row = rows
    .filter(isFireable)
    .map((r) => ({ r, at: position(r) }))
    .filter((x) => x.at !== Infinity)
    .sort((a, b) => a.at - b.at)[0]?.r;
  if (row) return { kind: "fire", row };

  // The list can end before the story does (a transfer, then the fulfilment steps). On the last stage, send what still moves the case on.
  if (onLast) {
    const rest = rows.filter(isFireable).find(advances);
    if (rest) return { kind: "fire", row: rest };
  }
  if (isFinished(flowType, choices, data)) {
    // Nothing left to press, but the machine has a step lined up (the pharmacy fills the order after its delay). Say so, not "done".
    const coming = rows.find((r) => r.kind === "system");
    return coming ? { kind: "wait", row: coming, hint: `Working on it: ${coming.label}` } : { kind: "done" };
  }

  const label = screenLabel(flowType, data, route);
  return { kind: "patient", hint: label ? `Continue on the phone: ${label}` : "Continue on the phone" };
}
