// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { switchWorkflow, useActorStore } from "@/engine/actorSingleton";
import { WorkflowProvider } from "@/engine/WorkflowProvider";
import { PortalRouter } from "@/lib/portalRouter";
import { skinFor } from "@/shell/skin";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { useDemoStore } from "@/store/demoStore";
import PatientPortal from "@/portals/patient/index";
import type { ViewId } from "@/brand/schema";
import { ctx, expectMatchesFixture, startFlow } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The patient skin, on screen. It walks every scenario's golden path and, at each step where the patient is on a
 * screen the skin changes, mounts the real portal in the patient view and records the visible text (fixture
 * `ui/patientRenderPatientView.json`, first sight of each screen per scenario).
 *
 * The text-message screens change only by a tap cue, so for those it also checks the patient view reads exactly
 * like the default view plus the cue. That is what keeps the skin's copy of those two pages from drifting.
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");
// The route list the portal derives. /phone-verification is not on it: the patient reaches it by tapping the text
// message, so the phone check is recorded on its own below.
const SKINNED = ["/sms-message", "/otp-verification", "/pa-approved-sms", "/pa-approved-otp"];
const SMS_ROUTES = ["/sms-message", "/pa-approved-sms"];
const CUE = "Tap the link above to continue";

function visibleText(root: HTMLElement): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const lines: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
  }
  return lines;
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

function portalText(actor: ReturnType<typeof startFlow>, flowType: string, view: ViewId): string[] {
  useDemoStore.setState({ flowType, view } as any);
  switchWorkflow(flowType as any);
  useActorStore.getState().setActor(actor as any);
  const mounted = render(
    <WorkflowProvider>
      <PatientPortal />
    </WorkflowProvider>,
  );
  const text = visibleText(mounted.container);
  cleanup();
  return text;
}

describe("patient skin render, per scenario", () => {
  const recorded: Record<string, unknown> = {};

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: the skinned screens`, () => {
      const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
      const seen: Record<string, string[]> = {};
      const check = () => {
        const route = derivePatientRoute(ctx(actor));
        if (!SKINNED.includes(route)) return;
        const patient = portalText(actor, scenario.flowType, "patient");
        if (!seen[route]) seen[route] = patient;
        if (SMS_ROUTES.includes(route)) {
          const full = portalText(actor, scenario.flowType, "full");
          expect(patient.filter((l) => l !== CUE), `${scenario.name} ${route}: patient view drifted from the default`).toEqual(full);
          expect(patient).toContain(CUE);
        }
      };
      check();
      for (const { type, ...payload } of scenario.steps) {
        actor.send({ type, ...payload } as any);
        check();
      }
      actor.stop();
      recorded[scenario.name] = { flowType: scenario.flowType, screens: seen };
    });
  }

  it("matches the recorded fixture, and the skin shows up in at least one scenario of each kind", () => {
    expect(Object.keys(recorded).length).toBe(SCENARIOS.length);
    const scenario = SCENARIOS.find((s) => s.flowType === "CoA_DTP")!;
    const actor = startFlow(scenario.flowType);
    useDemoStore.setState({ flowType: scenario.flowType, view: "patient" } as any);
    switchWorkflow(scenario.flowType as any);
    useActorStore.getState().setActor(actor as any);
    const Phone = skinFor("patient").PhoneVerification;
    const phone = render(
      <WorkflowProvider>
        <PortalRouter>
          <Phone />
        </PortalRouter>
      </WorkflowProvider>,
    );
    recorded["(phone check, patient view)"] = { flowType: scenario.flowType, screens: { "/phone-verification": visibleText(phone.container) } };
    cleanup();
    actor.stop();

    const routes = new Set(Object.values(recorded).flatMap((r: any) => Object.keys(r.screens)));
    for (const route of [...SKINNED, "/phone-verification"]) expect(routes.has(route), `no scenario reaches ${route}`).toBe(true);
    expectMatchesFixture("ui/patientRenderPatientView", recorded);
  });
});
