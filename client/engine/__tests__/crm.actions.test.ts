import { describe, it, expect } from "vitest";
import { buildCrmStages } from "@/portals/crm/stages/buildStages";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { CASE_HOME, CRM_ACTION_EVENTS, crmActions, type CrmCan } from "@/portals/crm/stages/actions";
import { forksForFlow } from "@/workflows/forks";
import { choiceProblems, forksForScenario } from "@/engine/workflow/forks";
import { ctx, expectMatchesFixture, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The CRM's buttons and badges (portals/crm/stages/actions.ts), per scenario, after every event of the golden path.
 * `enabled` is the machine's own answer, so these tests check the other direction: an enabled button does something when
 * clicked, a disabled one does nothing, and the Check Status button needs no outcome from the page.
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */
type Scenario = (typeof SCENARIOS)[number];

const replay = (scenario: Scenario, k: number) => {
  const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
  runSteps(actor, scenario.steps.slice(0, k + 1));
  return actor;
};
const canOf = (actor: ReturnType<typeof startFlow>): CrmCan => (e) => actor.getSnapshot().can(e as any);

describe("CRM actions along the golden paths", () => {
  const recorded: Record<string, unknown> = {};
  const enabledSomewhere = new Set<string>();

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: an enabled button does something and a disabled one does nothing`, () => {
      withFrozenClock(() => {
        // Only the entries where the set of actions or an `enabled` flag changed, like crm.stages.test.
        let last = "";
        const entries: unknown[] = [];
        for (let k = -1; k < scenario.steps.length; k++) {
          const actor = replay(scenario, k);
          const d = ctx(actor).workflowData;
          const places = [...buildCrmStages(d).map((st) => st.id), CASE_HOME];
          const shown = places.flatMap((id) => crmActions(d, id, canOf(actor)).map((a) => ({ stage: id, a })));
          const key = JSON.stringify(shown.map(({ stage, a }) => [stage, a.id, a.enabled]));
          if (key !== last) {
            last = key;
            entries.push({ after: k < 0 ? "(start)" : scenario.steps[k].type, actions: shown.map(({ stage, a }) => ({ stage, id: a.id, label: a.label, kind: a.kind, enabled: a.enabled })) });
          }
          for (const { a } of shown) {
            if (!a.event) continue;
            // Click it on a fresh copy of this moment.
            const copy = replay(scenario, k);
            const before = JSON.stringify(ctx(copy).workflowData);
            copy.send(a.event as any);
            const changed = JSON.stringify(ctx(copy).workflowData) !== before;
            expect({ at: k, action: a.id, enabled: a.enabled, changed }).toEqual({ at: k, action: a.id, enabled: a.enabled, changed: a.enabled });
            if (a.enabled) enabledSomewhere.add(a.event.type);
            copy.stop();
          }
          actor.stop();
        }
        recorded[scenario.name] = { flowType: scenario.flowType, entries };
      });
    });

    it(`${scenario.name}: Check Status alone reaches the outcome the scenario picks`, () => {
      // HCP enrollment has no CRM and runs no BI, so there is no Check Status button.
      if (scenarioFacts(scenario.flowType).isHcpEnrollment) return;
      withFrozenClock(() => {
        const forks = forksForFlow(scenario.flowType);
        const biFork = forksForScenario(forks, scenario.flowType).find((f) => f.id === "bi");
        // A scenario with a `bi` fork lets each of its valid exits decide the outcome. One without takes it from its own content.
        const exits = biFork
          ? biFork.exits.filter((x) => choiceProblems(forks, scenario.flowType, { bi: x.id }).length === 0)
          : [null];
        expect(exits.length).toBeGreaterThan(0);
        const finished = replay(scenario, scenario.steps.length - 1);
        const goldenResult = ctx(finished).workflowData.biResult;
        finished.stop();

        for (const exit of exits) {
          const choices = { ...scenario.choices, ...(exit ? { bi: exit.id } : {}) };
          let pressed = false;
          for (let k = -1; k < scenario.steps.length && !pressed; k++) {
            const actor = startFlow(scenario.flowType, { choices });
            runSteps(actor, scenario.steps.slice(0, k + 1));
            if (ctx(actor).workflowData.biStatus === "running") {
              const [button] = crmActions(ctx(actor).workflowData, "BI-14273", canOf(actor));
              expect(button?.label).toBe("Check Status");
              actor.send(button.event as any);
              const d = ctx(actor).workflowData;
              expect(d.biStatus).toBe("complete");
              if (exit) expect(d).toMatchObject(exit.data);
              else expect(d.biResult).toBe(goldenResult);
              pressed = true;
            }
            actor.stop();
          }
          expect(pressed, `${scenario.name}: BI never ran (${exit?.id ?? "no fork"})`).toBe(true);
        }
      });
    });
  }

  it("every button's event is enabled somewhere along the golden paths", () => {
    expect([...enabledSomewhere].sort()).toEqual([...CRM_ACTION_EVENTS].sort());
  });

  it("matches the recorded fixture", () => {
    expect(Object.keys(recorded).length).toBe(SCENARIOS.length);
    expectMatchesFixture("ui/crmActions", recorded);
  });
});
