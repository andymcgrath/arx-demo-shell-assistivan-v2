import { describe, it } from "vitest";
import { getGeneratedEmails } from "@/engine/WorkflowEngine";
import type { FlowType } from "@/engine/types";
import { ctx, expectMatchesFixture, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/** One representative scenario per flow, used for undo and reset checks. */
const BY_FLOW = new Map<FlowType, (typeof SCENARIOS)[number]>();
for (const s of SCENARIOS) if (!BY_FLOW.has(s.flowType)) BY_FLOW.set(s.flowType, s);

describe("reset", () => {
  for (const [flowType, scenario] of BY_FLOW) {
    it(`${flowType} returns to its starting data`, () => {
      withFrozenClock(() => {
        const fresh = startFlow(flowType);
        const freshData = ctx(fresh).workflowData;

        const actor = startFlow(flowType);
        runSteps(actor, scenario.steps.slice(0, 5));
        actor.send({ type: "RESET" } as any);
        const after = ctx(actor);

        expectMatchesFixture(`reset/${flowType}`, {
          workflowDataEqualsFresh: JSON.stringify(after.workflowData) === JSON.stringify(freshData),
          flowTypeAfterReset: after.workflowData.flowType,
          eventCount: after.events.length,
          snapshotCount: after._snapshots.length,
        });
      });
    });
  }
});

describe("undo", () => {
  for (const [flowType, scenario] of BY_FLOW) {
    it(`${flowType} undo behavior`, () => {
      withFrozenClock(() => {
        const actor = startFlow(flowType);
        runSteps(actor, scenario.steps.slice(0, 4));
        const afterFour = JSON.stringify(ctx(actor).workflowData);
        runSteps(actor, scenario.steps.slice(4, 5));
        const afterFive = JSON.stringify(ctx(actor).workflowData);

        const supported = actor.getSnapshot().can({ type: "UNDO" } as any);
        actor.send({ type: "UNDO" } as any);
        const afterUndo = JSON.stringify(ctx(actor).workflowData);

        expectMatchesFixture(`undo/${flowType}`, {
          supported,
          fifthStepChangedData: afterFour !== afterFive,
          undoRestoredFourthStep: afterUndo === afterFour,
        });
      });
    });
  }
});

describe("field notification emails", () => {
  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      withFrozenClock(() => {
        const actor = startFlow(scenario.flowType);
        runSteps(actor, scenario.steps);
        const { events, workflowData } = ctx(actor);

        const emails = getGeneratedEmails({
          events: events.map((e) => ({ id: e.id, event_type: e.eventType, created_at: e.createdAt })),
          patientName: "Test Patient",
          prescriberName: "Dr. Test",
          frmName: "Test FRM",
          biResult: workflowData.biResult as any,
          infusionDate: (workflowData as any).infusionDate ?? null,
          flowType: workflowData.flowType,
        });

        expectMatchesFixture(
          `emails/${scenario.name}`,
          emails.map(({ id: _id, ...rest }) => rest),
        );
      });
    });
  }
});
