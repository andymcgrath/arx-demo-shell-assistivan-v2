import { describe, it, expect } from "vitest";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { IASSIST_SCREENS } from "@/workflows/iassist/screens";
import { isSticky, menuFor, menuPaths, routedPaths, type ScreenMap } from "@/engine/workflow/screens";
import { screenMapFor } from "@/workflows/screenMaps";
import { runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * A workflow's screen list drives both derivePatientRoute and the hamburger
 * menu (CLAUDE.md rule 13). These tests check the two stay in step, for every
 * workflow that has a screen list.
 */
const COA_FLOWS = ["CoA_DTP", "CoA_Copay", "CoA_DME"] as const;
const MAPS: { name: string; map: ScreenMap }[] = [
  { name: "CoAssist", map: COASSIST_SCREENS },
  { name: "iAssist", map: IASSIST_SCREENS },
];

for (const { name, map } of MAPS) describe(`${name} screen list`, () => {
  const hidden = new Set(map.hidden);
  for (const flowType of map.flows) {
    describe(flowType, () => {
      it("lists each screen in the menu once", () => {
        const paths = menuPaths(map, flowType);
        expect(paths.length > 0).toBe(true);
        expect(new Set(paths).size).toBe(paths.length);
      });

      it("shows every screen a rule can pick, except hidden ones", () => {
        const inMenu = new Set(menuPaths(map, flowType));
        const missing = routedPaths(map, flowType).filter((p) => !inMenu.has(p) && !hidden.has(p));
        expect(missing).toEqual([]);
      });

      it("shows every screen a scenario visits", () => {
        const inMenu = new Set(menuPaths(map, flowType));
        const visited = new Set<string>();
        withFrozenClock(() => {
          for (const scenario of SCENARIOS.filter((s) => s.flowType === flowType)) {
            const actor = startFlow(flowType);
            for (const record of runSteps(actor, scenario.steps)) visited.add(record.route);
            actor.stop();
          }
        });
        const missing = [...visited].filter((p) => !inMenu.has(p) && !hidden.has(p));
        expect(missing).toEqual([]);
      });

      it("keeps the program name out of group titles until render time", () => {
        const groups = menuFor(map, flowType).flatMap((e) => ("group" in e ? [e.group] : []));
        expect(groups).toContain("{program} order");
      });
    });
  }

  it("has a catalog entry for every path a rule returns", () => {
    const catalog = new Set(map.screens.map((s) => s.path));
    const unknown = map.rules.map((r) => r.path).filter((p) => !catalog.has(p) && !hidden.has(p));
    expect(unknown).toEqual([]);
  });

  it("is found by the registry for every scenario it serves", () => {
    for (const flowType of map.flows) expect(screenMapFor(flowType) === map).toBe(true);
  });
});

describe("CoAssist stay-put screens", () => {
  it("keeps the patient on tap-through and confirmation screens, and moves them off waiting screens", () => {
    for (const flowType of COA_FLOWS) {
      expect(isSticky(COASSIST_SCREENS, flowType, "/order-tracker")).toBe(true);
      expect(isSticky(COASSIST_SCREENS, flowType, "/phone-verification")).toBe(true);
      expect(isSticky(COASSIST_SCREENS, flowType, "/sms-message")).toBe(false);
      expect(isSticky(COASSIST_SCREENS, flowType, "/confirm-details")).toBe(false);
      expect(isSticky(COASSIST_SCREENS, flowType, "/lock-screen")).toBe(false);
    }
    // Scenario-specific: only DME has the network pharmacy screen.
    expect(isSticky(COASSIST_SCREENS, "CoA_DME", "/network-pharmacy-selection")).toBe(true);
    expect(isSticky(COASSIST_SCREENS, "CoA_DTP", "/network-pharmacy-selection")).toBe(false);
  });
});
