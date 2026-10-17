import { describe, it, expect } from "vitest";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { isSticky, menuFor, menuPaths, routedPaths } from "@/engine/workflow/screens";
import { screenMapFor } from "@/workflows/screenMaps";
import { runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The CoAssist screen list drives both derivePatientRoute and the hamburger
 * menu (CLAUDE.md rule 13). These tests check the two stay in step.
 */
const COA_FLOWS = ["CoA_DTP", "CoA_Copay", "CoA_DME"] as const;
const hidden = new Set(COASSIST_SCREENS.hidden);

describe("CoAssist screen list", () => {
  for (const flowType of COA_FLOWS) {
    describe(flowType, () => {
      it("lists each screen in the menu once", () => {
        const paths = menuPaths(COASSIST_SCREENS, flowType);
        expect(paths.length > 0).toBe(true);
        expect(new Set(paths).size).toBe(paths.length);
      });

      it("shows every screen a rule can pick, except hidden ones", () => {
        const inMenu = new Set(menuPaths(COASSIST_SCREENS, flowType));
        const missing = routedPaths(COASSIST_SCREENS, flowType).filter((p) => !inMenu.has(p) && !hidden.has(p));
        expect(missing).toEqual([]);
      });

      it("shows every screen a scenario visits", () => {
        const inMenu = new Set(menuPaths(COASSIST_SCREENS, flowType));
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

      it("fills the program name into group titles at render time, not here", () => {
        const groups = menuFor(COASSIST_SCREENS, flowType).flatMap((e) => ("group" in e ? [e.group] : []));
        expect(groups).toContain("{program} order");
      });
    });
  }

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

  it("is found by the registry for every CoAssist scenario", () => {
    for (const flowType of COA_FLOWS) expect(screenMapFor(flowType) === COASSIST_SCREENS).toBe(true);
    expect(screenMapFor("Fax_QS_PA_Approved") === undefined).toBe(true);
  });

  it("has a catalog entry for every path a rule returns, for some scenario", () => {
    const catalog = new Set(COASSIST_SCREENS.screens.map((s) => s.path));
    const unknown = COASSIST_SCREENS.rules.map((r) => r.path).filter((p) => !catalog.has(p) && !hidden.has(p));
    expect(unknown).toEqual([]);
  });
});
