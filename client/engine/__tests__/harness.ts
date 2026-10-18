/**
 * Headless workflow test harness.
 *
 * Drives the real XState machines with plain event lists. No React, no
 * browser, no sessionStorage. Tests assert on the contract that survives the
 * refactor: workflowData, emitted events, and derivePatientRoute(). They do
 * not assert on internal state names, because the workflow factory will
 * rename and reshape those.
 *
 * Record mode: `RECORD=1 pnpm test` rewrites the JSON fixtures instead of
 * comparing against them. Review the fixture diff in git before committing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { createActor, SimulatedClock } from "xstate";
import { workflowRegistry } from "@/engine/WorkflowRegistry";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import type { FlowType, MachineContext } from "@/engine/types";

// Date formatting in getGeneratedEmails reads the local time zone. Pin it so
// fixtures match on every machine.
process.env.TZ = "UTC";

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");

/** Every flow is registered under its own FlowType (see actorSingleton.ts). */
export const machineIdForFlow = (flowType: FlowType): string => flowType;

export { SimulatedClock };

export interface Step {
  type: string;
  /** Extra event fields, such as `result` on COMPLETE_BI. */
  [key: string]: unknown;
}

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z").getTime();

/** Runs fn with `new Date()` frozen, so timestamps and relative dates are stable. */
export function withFrozenClock<T>(fn: () => T): T {
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) super(FIXED_NOW);
      else super(...(args as [any]));
    }
    static now() {
      return FIXED_NOW;
    }
  }
  (globalThis as any).Date = FrozenDate;
  try {
    return fn();
  } finally {
    (globalThis as any).Date = RealDate;
  }
}

/**
 * Starts a flow. Pass `clock` to control delayed automations (the agent-driven
 * reveals). Advance it with `clock.increment(ms)`.
 */
export function startFlow(
  flowType: FlowType,
  options: { clock?: SimulatedClock; choices?: Record<string, string> } = {},
) {
  const machine = workflowRegistry.getWorkflow(machineIdForFlow(flowType));
  if (!machine) throw new Error(`No machine registered for ${flowType}`);
  // Same input actorSingleton passes, plus the fork choices a demo starts with.
  const actor = createActor(machine, {
    input: { flowType, ...(options.choices ? { choices: options.choices } : {}) },
    ...(options.clock ? { clock: options.clock } : {}),
  } as any);
  actor.start();
  return actor;
}

type Actor = ReturnType<typeof startFlow>;

export const ctx = (actor: Actor): MachineContext => actor.getSnapshot().context as MachineContext;

/** workflowData fields whose value differs between two contexts. */
function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed[key] = after[key];
  }
  return changed;
}

export interface StepRecord {
  event: string;
  payload?: Record<string, unknown>;
  /** false when the machine had no transition for the event in its current state. */
  accepted: boolean;
  route: string;
  changed: Record<string, unknown>;
  newEvents: { eventType: string; portal: string; workflowStep: number }[];
}

/** Sends each step in order and records what changed. */
export function runSteps(actor: Actor, steps: Step[]): StepRecord[] {
  const records: StepRecord[] = [];
  for (const step of steps) {
    const { type, ...payload } = step;
    const before = ctx(actor);
    const accepted = actor.getSnapshot().can({ type, ...payload } as any);
    actor.send({ type, ...payload } as any);
    const after = ctx(actor);
    records.push({
      event: type,
      ...(Object.keys(payload).length ? { payload } : {}),
      accepted,
      route: derivePatientRoute(after),
      changed: changedFields(before.workflowData as any, after.workflowData as any),
      newEvents: after.events.slice(before.events.length).map((e) => ({
        eventType: e.eventType,
        portal: e.portal,
        workflowStep: e.workflowStep,
      })),
    });
  }
  return records;
}

/** Compares `actual` with __fixtures__/<name>.json. RECORD=1 writes the fixture instead. */
export function expectMatchesFixture(name: string, actual: unknown) {
  const file = path.join(FIXTURE_DIR, `${name}.json`);
  const serialized = JSON.stringify(actual, null, 2) + "\n";
  if (process.env.RECORD) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, serialized);
    return;
  }
  if (!fs.existsSync(file)) {
    throw new Error(`Missing fixture ${name}.json. Run "RECORD=1 pnpm test" once, review it, and commit it.`);
  }
  expect(JSON.parse(serialized)).toEqual(JSON.parse(fs.readFileSync(file, "utf8")));
}
