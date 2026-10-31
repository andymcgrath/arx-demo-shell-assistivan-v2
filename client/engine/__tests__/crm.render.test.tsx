// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { PortalRouter } from "@/lib/portalRouter";
import { useActorStore } from "@/engine/actorSingleton";
import { useDemoStore } from "@/store/demoStore";
import { buildCrmStages } from "@/portals/crm/stages/buildStages";
import Index from "@/portals/crm/pages/Index";
import { ctx, expectMatchesFixture, startFlow } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The CRM page as the agent sees it. It renders the real page (portals/crm/pages/Index.tsx, which the Client tab
 * re-exports) against the real machine, and records the visible text of the case home and of every stage tab at a few
 * points along each golden path. The machine tests cannot see JSX, so this is the net under the CRM refactor
 * (docs/plans/PROMPT_CRM_REFACTOR.md): a step that changes what the agent reads shows up as a fixture diff.
 *
 * It also checks the wiring the machine tests cannot: opening the BI or PA tab sends VIEW_STAGE, and the visible 3 second
 * wait before the result comes through the real effects, with fake timers.
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");
const REVEAL_MS = 3000;

type Scenario = (typeof SCENARIOS)[number];
type Actor = ReturnType<typeof startFlow>;

/** Text nodes the agent can read, one per line, whitespace collapsed. */
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

/** Mounts the page on `actor`. A CoAssist flow lands on the case list first, so this opens the case. */
function mount(actor: Actor, flowType: string) {
  useDemoStore.setState({ flowType } as any);
  useActorStore.getState().setActor(actor as any);
  const view = render(
    <PortalRouter>
      <Index />
    </PortalRouter>,
  );
  const row = view.container.querySelector("tr.cursor-pointer");
  if (row) fireEvent.click(row);
  return view;
}

/** Sends events one by one to `actor`, letting React settle between them. */
function send(actor: Actor, steps: Scenario["steps"]) {
  for (const { type, ...payload } of steps) actor.send({ type, ...payload } as any);
}

/** Replays a scenario to just after step k (-1 is the start). */
function replay(scenario: Scenario, k: number): Actor {
  const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
  send(actor, scenario.steps.slice(0, k + 1));
  return actor;
}

/** The step indexes worth looking at: the start, the first moment BI runs, the middle, and the end. */
function checkpoints(scenario: Scenario): number[] {
  const picks = new Set<number>([-1, Math.floor(scenario.steps.length / 2) - 1, scenario.steps.length - 1]);
  for (let k = -1; k < scenario.steps.length; k++) {
    const actor = replay(scenario, k);
    const running = ctx(actor).workflowData.biStatus === "running";
    actor.stop();
    if (running) {
      picks.add(k);
      break;
    }
  }
  return [...picks].sort((a, b) => a - b);
}

describe("CRM page render, per scenario", () => {
  const recorded: Record<string, unknown> = {};

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: the case home and every stage tab`, () => {
      const points: Record<string, unknown> = {};
      for (const k of checkpoints(scenario)) {
        const actor = replay(scenario, k);
        const stages = buildCrmStages(ctx(actor).workflowData);
        const after = k < 0 ? "(start)" : scenario.steps[k].type;
        const tabs: Record<string, string> = {};

        const home = mount(actor, scenario.flowType);
        const homeText = visibleText(home.container);
        cleanup();

        for (const stage of stages) {
          // A fresh page per stage, so the tab strip holds one tab and the text stays comparable.
          const view = mount(actor, scenario.flowType);
          const header = [...view.container.querySelectorAll("*")].find(
            (el) => el.children.length === 0 && el.textContent?.trim() === `${stage.name} - ${stage.id}`,
          );
          expect(header, `${scenario.name} after ${after}: no card for stage ${stage.id}`).toBeTruthy();
          fireEvent.click(header!);
          // Opening BI or PA starts the machine's 3 second timer. Hold it so the text is the opening view.
          tabs[stage.id] = visibleText(view.container);
          cleanup();
        }
        actor.stop();
        points[`after ${after}`] = { home: homeText, stages: tabs };
      }
      recorded[scenario.name] = { flowType: scenario.flowType, points };
    });
  }

  it("matches the recorded fixture", () => {
    expect(Object.keys(recorded).length).toBe(SCENARIOS.length);
    expectMatchesFixture("ui/crmRender", recorded);
  });
});

describe("CRM page wiring, per scenario", () => {
  let biSeen = 0;
  let paSeen = 0;

  /** The first point on the golden path where `at` holds, as a live actor, or null. */
  function replayUntil(scenario: Scenario, at: (d: ReturnType<typeof ctx>["workflowData"]) => boolean): Actor | null {
    for (let k = -1; k < scenario.steps.length; k++) {
      const actor = replay(scenario, k);
      if (at(ctx(actor).workflowData)) return actor;
      actor.stop();
    }
    return null;
  }

  /** Opens the stage whose id starts with `prefix` ("BI" opens BI-14273) from its card in the Stage Quick View. */
  function openStage(view: ReturnType<typeof render>, prefix: string) {
    const card = new RegExp(` - ${prefix}-\\d+$`);
    const header = [...view.container.querySelectorAll("*")].find(
      (el) => el.children.length === 0 && card.test(el.textContent?.trim() ?? ""),
    );
    expect(header, `no card for stage ${prefix}`).toBeTruthy();
    fireEvent.click(header!);
  }

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: opening BI shows Running for 3 seconds, then the result`, () => {
      const actor = replayUntil(scenario, (d) => d.biStatus === "running");
      if (!actor) return;
      biSeen++;
      const view = mount(actor, scenario.flowType);
      // Not opened yet: the timer has not started.
      vi.advanceTimersByTime(10 * REVEAL_MS);
      expect(ctx(actor).workflowData.biStatus).toBe("running");

      openStage(view, "BI");
      vi.advanceTimersByTime(REVEAL_MS - 1);
      expect(ctx(actor).workflowData.biStatus).toBe("running");
      vi.advanceTimersByTime(1);
      expect(ctx(actor).workflowData.biStatus).toBe("complete");
      actor.stop();
    });

    it(`${scenario.name}: opening PA decides it after 3 seconds`, () => {
      const actor = replayUntil(scenario, (d) => d.paStatus === "submitted");
      if (!actor) return;
      paSeen++;
      const view = mount(actor, scenario.flowType);
      vi.advanceTimersByTime(10 * REVEAL_MS);
      expect(ctx(actor).workflowData.paStatus).toBe("submitted");

      openStage(view, "PA");
      vi.advanceTimersByTime(REVEAL_MS - 1);
      expect(ctx(actor).workflowData.paStatus).toBe("submitted");
      vi.advanceTimersByTime(1);
      expect(["approved", "denied"]).toContain(ctx(actor).workflowData.paStatus);
      actor.stop();
    });
  }

  it("the check ran on real scenarios", () => {
    expect(biSeen).toBe(SCENARIOS.length);
    expect(paSeen).toBeGreaterThan(5);
  });
});
