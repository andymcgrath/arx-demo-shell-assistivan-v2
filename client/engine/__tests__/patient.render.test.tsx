// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { switchWorkflow, useActorStore } from "@/engine/actorSingleton";
import { WorkflowProvider } from "@/engine/WorkflowProvider";
import { useDemoStore } from "@/store/demoStore";
import PatientPortal from "@/portals/patient/index";
import { expectMatchesFixture, startFlow } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The patient portal as the patient sees it, in the default view. It mounts the real portal (portals/patient/index.tsx)
 * against the real machine and records the visible text of the screen the patient lands on, at the start, the middle,
 * and the end of each golden path. The machine tests cannot see JSX, so this is the leak guard for the patient view
 * (docs/plans/arx-demo-patient-refactor-plan.md): a skin step that changes what the default view shows is a fixture diff.
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");

type Scenario = (typeof SCENARIOS)[number];
type Actor = ReturnType<typeof startFlow>;

/** Text nodes the patient can read, one per line, whitespace collapsed. */
function visibleText(root: HTMLElement): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const lines: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const tag = node.parentElement?.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") continue;
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
  }
  return lines.join("\n");
}

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW });
  sessionStorage.clear();
  Element.prototype.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  (window as any).scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Replays a scenario to just after step k (-1 is the start). */
function replay(scenario: Scenario, k: number): Actor {
  const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
  for (const { type, ...payload } of scenario.steps.slice(0, k + 1)) actor.send({ type, ...payload } as any);
  return actor;
}

function mountPortal(actor: Actor, flowType: string) {
  useDemoStore.setState({ flowType } as any);
  // Some pages read the active flow from the singleton, so point it at this flow before the replayed actor takes over.
  switchWorkflow(flowType as any);
  useActorStore.getState().setActor(actor as any);
  return render(
    <WorkflowProvider>
      <PatientPortal />
    </WorkflowProvider>,
  );
}

describe("patient portal render, per scenario", () => {
  const recorded: Record<string, unknown> = {};

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: the patient screen at the start, middle, and end`, () => {
      const last = scenario.steps.length - 1;
      const picks = [...new Set([-1, Math.floor(scenario.steps.length / 2) - 1, last])].sort((a, b) => a - b);
      const points: Record<string, string> = {};
      for (const k of picks) {
        const actor = replay(scenario, k);
        const view = mountPortal(actor, scenario.flowType);
        const after = k < 0 ? "(start)" : `${k}: ${scenario.steps[k].type}`;
        points[`after ${after}`] = visibleText(view.container);
        cleanup();
        actor.stop();
      }
      recorded[scenario.name] = { flowType: scenario.flowType, points };
    });
  }

  it("matches the recorded fixture", () => {
    expect(Object.keys(recorded).length).toBe(SCENARIOS.length);
    expectMatchesFixture("ui/patientRender", recorded);
  });
});
