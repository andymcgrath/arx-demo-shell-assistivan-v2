import { describe, it, expect } from "vitest";
import { IASSIST_SCREENS } from "@/workflows/iassist/screens";
import { isSticky, menuFor, menuPaths, rulesFor, screenMapProblems } from "@/engine/workflow/screens";
import { expectMatchesFixture } from "./harness";

/**
 * The iAssist screen map, recorded per scenario. Same idea as coassist.screenmap.test.ts.
 *
 * The first matching route rule wins, so the order of the rules a scenario sees decides which screen a patient lands
 * on. Which rules each scenario gets must not change without a fixture diff, and `iassist.routes.test.ts` proves the
 * order still routes every reachable state the same way. This test records, for each scenario:
 *
 * - `route`: the route rules in the order they are tried, each as `id -> path`
 * - `menu`: the hamburger menu
 * - `sticky`: the screens the patient may sit on while the data has not caught up
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */
const FLOWS = ["iAssist_PA_Approved", "iAssist_PAP"] as const;

describe("iAssist screen map", () => {
  it("has no screen map problems, and every route rule has a unique id", () => {
    expect(screenMapProblems(IASSIST_SCREENS)).toEqual([]);
    const ids = IASSIST_SCREENS.rules.map((r) => r.id);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps each scenario's route order, menu, and sticky screens", () => {
    const scenarios: Record<string, unknown> = {};
    for (const flow of FLOWS) {
      const paths = [...new Set(menuPaths(IASSIST_SCREENS, flow))];
      scenarios[flow] = {
        route: rulesFor(IASSIST_SCREENS, flow).map((r) => `${r.id} -> ${r.path}`),
        menu: menuFor(IASSIST_SCREENS, flow),
        sticky: paths.filter((p) => isSticky(IASSIST_SCREENS, flow, p)),
      };
    }
    expectMatchesFixture("rules/iassist-screens", {
      fallback: IASSIST_SCREENS.fallback,
      hidden: IASSIST_SCREENS.hidden,
      scenarios,
    });
  });
});
