import { describe, it, expect } from "vitest";
import { canAddItem } from "@/portals/crm/fulfilment/items";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { ctx, startFlow } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The Fulfilment Center's "Application Update" item is ready when the machine accepts SEND_PAP_SMS and the scenario is
 * a no-PA intake whose BI found no insurance. This replays every scenario and checks the item against the rule the page
 * used to write out by hand, at every step, so asking the machine changes nothing the agent sees.
 */
const ITEM = "pap-application-update";

describe("Fulfilment Center readiness comes from the machine", () => {
  let ready = 0;
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: the Application Update item matches the old rule at every step`, () => {
      const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
      const can = (e: { type: string }) => actor.getSnapshot().can(e as any);
      const check = () => {
        const d = ctx(actor).workflowData;
        const old = scenarioFacts(d.flowType).isNoPaIntake && d.biStatus === "complete" && d.biResult === "no_insurance" && !d.papSmsSent;
        const now = canAddItem(ITEM, "pending", d, can as any);
        expect(now, `${scenario.name} after ${d.biStatus}/${d.papSmsSent}`).toBe(old);
        if (now) ready++;
      };
      check();
      for (const { type, ...payload } of scenario.steps) {
        actor.send({ type, ...payload } as any);
        check();
      }
      actor.stop();
    });
  }

  it("the item was ready somewhere", () => {
    expect(ready).toBeGreaterThan(0);
  });
});
