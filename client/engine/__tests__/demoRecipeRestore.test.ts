import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A reload keeps the stored demo id but loses the in-memory recipe override. The first machine of the session must put the
 * demo's own blocks back, or a Bridge demo runs as plain Copay and the CRM draws a cash offer.
 */
const store = new Map<string, string>();

/** The test brand has no demo with its own blocks, so the brand's demo list is stubbed with one that has them. */
const WITH_BLOCKS = { id: "with-blocks", flow: "CoA_Copay", label: "x", recipe: { modules: [{ id: "enrollment" }, { id: "cash_offer", props: { variant: "bridge" } }, { id: "appeal" }, { id: "tracking" }] } };
const PLAIN = { id: "plain", flow: "CoA_Copay", label: "y" };

describe("demo recipe after a reload", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
    vi.doMock("@/brand", async (orig) => {
      const real = await orig<typeof import("@/brand")>();
      const demos = [PLAIN, WITH_BLOCKS];
      return { ...real, BRAND: { ...real.BRAND, demos }, findDemo: (id?: string) => demos.find((d) => d.id === id) };
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const reloadWith = async (demoId: string, flowType: string) => {
    store.set("arx-demo-shell", JSON.stringify({ state: { flowType, demoId }, version: 0 }));
    const override = await import("@/engine/workflow/recipeOverride");
    const singleton = await import("@/engine/actorSingleton");
    singleton.getWorkflowActor().stop();
    return override.recipeOverrideFor(flowType as any);
  };

  it("restores the stored demo's blocks when the first machine starts", async () => {
    const recipe = await reloadWith("with-blocks", "CoA_Copay");
    expect(recipe?.modules.map((m) => m.id)).toEqual(expect.arrayContaining(["appeal", "cash_offer", "tracking"]));
  });

  it("leaves no override for a demo with no blocks of its own", async () => {
    expect(await reloadWith("plain", "CoA_Copay")).toBeUndefined();
  });
});
