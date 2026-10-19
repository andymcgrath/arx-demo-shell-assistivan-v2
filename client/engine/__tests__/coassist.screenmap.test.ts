import { describe, it, expect } from "vitest";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { isSticky, menuFor, menuPaths, rulesFor } from "@/engine/workflow/screens";
import { expectMatchesFixture } from "./harness";

/**
 * The CoAssist screen map, recorded per scenario.
 *
 * The first matching route rule wins, so the order of the rules a scenario sees decides which screen a patient lands
 * on. Since 2.5b the rules live in module files and run slot by slot. Which rules each scenario gets must not change
 * without a fixture diff, and `coassist.routes.test.ts` proves the order still routes every reachable state the same
 * way. This test records, for each scenario:
 *
 * - `route`: the route rules in the order they are tried, each as `id -> path`
 * - `menu`: the hamburger menu
 * - `sticky`: the screens the patient may sit on while the data has not caught up
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */
const FLOWS = ["CoA_DTP", "CoA_Copay", "CoA_DME"] as const;

describe("CoAssist screen map", () => {
  it("gives every route rule a unique id", () => {
    const ids = COASSIST_SCREENS.rules.map((r) => r.id);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps each scenario's route order, menu, and sticky screens", () => {
    const scenarios: Record<string, unknown> = {};
    for (const flow of FLOWS) {
      const paths = [...new Set(menuPaths(COASSIST_SCREENS, flow))];
      scenarios[flow] = {
        route: rulesFor(COASSIST_SCREENS, flow).map((r) => `${r.id} -> ${r.path}`),
        menu: menuFor(COASSIST_SCREENS, flow),
        sticky: paths.filter((p) => isSticky(COASSIST_SCREENS, flow, p)),
      };
    }
    expectMatchesFixture("rules/coassist-screens", {
      fallback: COASSIST_SCREENS.fallback,
      hidden: COASSIST_SCREENS.hidden,
      scenarios,
    });
  });
});
