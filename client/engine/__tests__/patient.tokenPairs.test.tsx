// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { switchWorkflow, useActorStore } from "@/engine/actorSingleton";
import { WorkflowProvider } from "@/engine/WorkflowProvider";
import { useDemoStore } from "@/store/demoStore";
import PatientPortal from "@/portals/patient/index";
import { startFlow } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The patient portal as rendered, one screen per step of every golden path. Two rules hold on every screen, so the
 * brand's colors cannot differ from one screen to the next (tokensOnly.test.ts checks the source, this checks the result):
 *
 * 1. Text on a brand fill uses that fill's own text token. `bg-arx-action` goes with `text-arx-on-action`, and
 *    `bg-arx-primary` with `text-arx-on-primary`. No literal white or near-black.
 * 2. An inline style sets a color only through a brand token (`hsl(var(--arx-...))`), `transparent`, or `currentColor`.
 *
 * It reads classes and styles, not pixels. A jsdom page has no stylesheet, so this cannot see what a token resolves to.
 */

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");

type Actor = ReturnType<typeof startFlow>;

const FILL_TEXT: [fill: RegExp, text: RegExp, name: string][] = [
  [/(^|\s)bg-arx-action(\s|$)/, /(^|\s)text-arx-on-action(\/\d+)?(\s|$)/, "text-arx-on-action"],
  [/(^|\s)bg-arx-primary(\s|$)/, /(^|\s)text-arx-on-primary(\/\d+)?(\s|$)/, "text-arx-on-primary"],
];
// A text color class: a token or a raw color. Sizes and alignment (text-sm, text-center) are not colors.
const TEXT_COLOR = /(^|\s)(?:[a-z-]+:)*text-(?:arx-[a-z0-9-]+|white|black|gray|slate|[a-z]+-\d{2,3})(\/\d+)?(\s|$)/;
const COLOR_PROPS = ["color", "background-color", "background", "border-color", "border", "fill", "stroke"];
const TOKEN_OK = /var\(--arx-[a-z0-9-]+\)|transparent|currentcolor|inherit|none/i;
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\((?!var\()|\b(white|black)\b/i;

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

function replay(scenario: (typeof SCENARIOS)[number], k: number): Actor {
  const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
  for (const { type, ...payload } of scenario.steps.slice(0, k + 1)) actor.send({ type, ...payload } as any);
  return actor;
}

function mountPortal(actor: Actor, flowType: string) {
  useDemoStore.setState({ flowType } as any);
  switchWorkflow(flowType as any);
  useActorStore.getState().setActor(actor as any);
  return render(
    <WorkflowProvider>
      <PatientPortal />
    </WorkflowProvider>,
  );
}

const classOf = (el: Element) => el.getAttribute("class") ?? "";

/** Each text node under a brand fill must take its text color from the fill's token, found on the node's own chain below the fill. */
function pairProblems(root: HTMLElement): string[] {
  const problems: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!(node.textContent ?? "").trim()) continue;
    for (let el = node.parentElement, below: Element | null = null; el; below = el, el = el.parentElement) {
      const cls = classOf(el);
      const pair = FILL_TEXT.find(([fill]) => fill.test(cls));
      if (!pair) continue;
      // The nearest text color class from the text up to and including the fill.
      let source: Element | null = node.parentElement;
      let color = "";
      for (; source; source = source.parentElement) {
        const m = classOf(source).match(TEXT_COLOR);
        if (m) {
          color = classOf(source);
          break;
        }
        if (source === el) break;
      }
      if (!pair[1].test(color)) {
        problems.push(`"${(node.textContent ?? "").trim().slice(0, 30)}" on ${pair[2].replace("text", "bg").replace("-on", "")} needs ${pair[2]}; chain has "${color.match(TEXT_COLOR)?.[0].trim() ?? "none"}"`);
      }
      break;
    }
  }
  return problems;
}

function styleProblems(root: HTMLElement): string[] {
  const problems: string[] = [];
  for (const el of root.querySelectorAll("[style]")) {
    const style = (el as HTMLElement).style;
    for (const prop of COLOR_PROPS) {
      const value = style.getPropertyValue(prop);
      if (value && COLOR_LITERAL.test(value) && !TOKEN_OK.test(value)) problems.push(`${el.tagName.toLowerCase()} style ${prop}: ${value}`);
    }
  }
  return problems;
}

describe("patient screens, rendered", () => {
  const seen = new Set<string>();

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: brand fills carry their own text color and styles use tokens`, () => {
      const problems = new Set<string>();
      for (let k = -1; k < scenario.steps.length; k++) {
        const actor = replay(scenario, k);
        const view = mountPortal(actor, scenario.flowType);
        seen.add(view.container.innerHTML.length + ":" + view.container.textContent);
        for (const p of [...pairProblems(view.container), ...styleProblems(view.container)]) problems.add(p);
        cleanup();
        actor.stop();
      }
      expect([...problems]).toEqual([]);
    });
  }

  it("rendered many different screens", () => {
    expect(seen.size).toBeGreaterThan(20);
  });
});
