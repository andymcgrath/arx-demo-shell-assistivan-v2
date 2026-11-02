// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ViewId } from "@/brand/schema";

/**
 * The shell header in each view. With the real brand (no `enabledViews`) it must look as it did before views existed.
 * With a brand that enables both views, the patient view shows the patient portal alone, with no layout buttons,
 * and the toggle switches between them.
 */

let enabledViews: ViewId[] | undefined;

vi.mock("@/brand", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/brand")>();
  return { ...real, BRAND: new Proxy(real.BRAND, { get: (t, k) => (k === "enabledViews" ? enabledViews : (t as any)[k]) }) };
});

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW });
  vi.resetModules();
  sessionStorage.clear();
  Element.prototype.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  (window as any).scrollTo = () => {};
  (window as any).ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  enabledViews = undefined;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function mountShell(view?: ViewId) {
  // Imported after resetModules so the shell, the provider, and the stores share one copy of each.
  const { WorkflowProvider } = await import("@/engine/WorkflowProvider");
  const { default: DemoShell } = await import("@/shell/DemoShell");
  const { useDemoStore: store } = await import("@/store/demoStore");
  if (view) store.setState({ view });
  return render(
    <MemoryRouter initialEntries={["/hub"]}>
      <WorkflowProvider>
        <DemoShell />
      </WorkflowProvider>
    </MemoryRouter>,
  );
}

const tabLabels = (nav: HTMLElement) => within(nav).getAllByRole("button").map((b) => b.textContent?.trim());
const header = (c: HTMLElement) => c.querySelector("header") as HTMLElement;
const layoutButtons = (c: HTMLElement) => ["Single", "Split 2", "Split 3"].map((t) => c.querySelector(`button[title="${t}"]`));

// The first import loads every portal, which is slow.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

describe("shell header, brand without enabledViews", () => {
  it("shows every portal tab, the layout buttons, and no toggle", async () => {
    const { container } = await mountShell();
    const tabs = tabLabels(header(container).querySelector("nav") as HTMLElement);
    expect(tabs).toContain("HUB / CRM");
    expect(tabs).toContain("Patient");
    expect(tabs.length).toBeGreaterThan(2);
    expect(layoutButtons(container).every(Boolean)).toBe(true);
    expect(screen.queryByRole("group", { name: "View" })).toBeNull();
  });
});

describe("shell header, brand that enables both views", () => {
  beforeEach(() => {
    enabledViews = ["full", "patient"];
  });

  it("shows the toggle in the full view, with every tab", async () => {
    const { container } = await mountShell("full");
    expect(screen.getByRole("group", { name: "View" })).toBeTruthy();
    expect(tabLabels(header(container).querySelector("nav") as HTMLElement)).toContain("HUB / CRM");
    expect(layoutButtons(container).every(Boolean)).toBe(true);
  });

  it("shows the patient portal alone in the patient view, with no layout buttons", async () => {
    const { container } = await mountShell("patient");
    expect(tabLabels(header(container).querySelector("nav") as HTMLElement)).toEqual(["Patient"]);
    expect(layoutButtons(container).some(Boolean)).toBe(false);
    expect(screen.getByRole("group", { name: "View" })).toBeTruthy();
  });

  it("switches view with the toggle and keeps the machine's progress", async () => {
    const { container } = await mountShell("full");
    const { getWorkflowActor } = await import("@/engine/actorSingleton");
    const before = JSON.stringify((getWorkflowActor().getSnapshot().context as any).workflowData);
    fireEvent.click(within(screen.getByRole("group", { name: "View" })).getByText("Patient"));
    expect(tabLabels(header(container).querySelector("nav") as HTMLElement)).toEqual(["Patient"]);
    fireEvent.click(within(screen.getByRole("group", { name: "View" })).getByText("Full"));
    expect(tabLabels(header(container).querySelector("nav") as HTMLElement)).toContain("HUB / CRM");
    expect(JSON.stringify((getWorkflowActor().getSnapshot().context as any).workflowData)).toBe(before);
  });
});
