// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * demoStore with a brand that enables both views and has one demo that pins `patient`. The real brand is inlined by
 * Vite at build time, so this swaps it for the store under test.
 */
vi.mock("@/brand", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/brand")>();
  const demos = [
    { id: "std", flow: "CoA_DTP", label: "Standard" },
    { id: "pat", flow: "CoA_DTP", label: "Patient's view", view: "patient" },
  ];
  return {
    ...real,
    BRAND: { ...real.BRAND, enabledViews: ["full", "patient"], demos },
    DEFAULT_DEMO: demos[0],
    DEFAULT_FLOW: "CoA_DTP",
    findDemo: (id: string) => demos.find((d) => d.id === id),
    isFlowEnabled: (flow: string) => flow === "CoA_DTP",
  };
});

const load = async () => (await import("@/store/demoStore")).useDemoStore;

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
});

describe("demoStore view", () => {
  it("starts on the first enabled view", async () => {
    expect((await load()).getState().view).toBe("full");
  });

  it("switches to an enabled view and ignores an unknown one", async () => {
    const store = await load();
    store.getState().setView("patient");
    expect(store.getState().view).toBe("patient");
    store.getState().setView("kiosk" as any);
    expect(store.getState().view).toBe("patient");
  });

  it("opens in a demo's pinned view and keeps the current view for a demo with no pin", async () => {
    const store = await load();
    store.getState().selectDemo({ id: "pat", flow: "CoA_DTP", label: "Patient's view", view: "patient" } as any);
    expect(store.getState().view).toBe("patient");
    store.getState().selectDemo({ id: "std", flow: "CoA_DTP", label: "Standard" } as any);
    expect(store.getState().view).toBe("patient");
  });

  it("keeps the current view on reset", async () => {
    const store = await load();
    store.getState().setView("patient");
    store.getState().resetDemo();
    expect(store.getState().view).toBe("patient");
  });

  it("restores a saved view, and a session saved before views existed takes the default", async () => {
    sessionStorage.setItem("arx-demo-shell", JSON.stringify({ state: { flowType: "CoA_DTP", demoId: "std", view: "patient" }, version: 0 }));
    expect((await load()).getState().view).toBe("patient");

    vi.resetModules();
    sessionStorage.setItem("arx-demo-shell", JSON.stringify({ state: { flowType: "CoA_DTP", demoId: "std" }, version: 0 }));
    expect((await load()).getState().view).toBe("full");
  });

  it("drops a saved view the brand does not enable", async () => {
    sessionStorage.setItem("arx-demo-shell", JSON.stringify({ state: { flowType: "CoA_DTP", demoId: "std", view: "kiosk" }, version: 0 }));
    expect((await load()).getState().view).toBe("full");
  });
});
