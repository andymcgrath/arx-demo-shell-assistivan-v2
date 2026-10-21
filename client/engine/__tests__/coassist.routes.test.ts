import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { createActor, SimulatedClock } from "xstate";
import type { FlowType } from "@/engine/types";
import { forksForScenario } from "@/engine/workflow/forks";
import { routeFor, rulesFor, screenMapProblems } from "@/engine/workflow/screens";
import { coassistMachine } from "@/workflows/coassist";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";

/**
 * Route equivalence, proven by behavior.
 *
 * The first matching route rule wins. Moving the route rules into module slots (docs/plans/PLAN_STEP2.md, 2.5) may reorder
 * rules that can never match together, so the recorded order is not the proof. This is: for each scenario, walk many
 * event sequences through the real machine, and at every state compare the route the screen map gives with a
 * reference that tries the rules in the order frozen in __fixtures__/rules/coassist-route-order.json (the order
 * before the move). Any state where they disagree is a patient landing on the wrong screen.
 *
 * Each walk picks only events the machine accepts, so it gets deep. Fork pins are random per walk. The walk is
 * seeded, so a failure replays.
 */
const FLOWS = ["CoA_DTP", "CoA_Copay", "CoA_Coverage"] as const;
const WALKS = 150;
const STEPS = 90;
const REVEAL_MS = 3000;

const PHARMACY = { name: "Test Pharmacy", address: "1 Main St", city: "Orlando", state: "FL", zip: "32801", phone: "(555) 555-0100" };
const COVERAGE = [
  { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" },
  { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered" },
  { pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" },
];

/** Every event the CoAssist machine reacts to, with the payload variants worth trying. */
const EVENTS: { type: string; [k: string]: unknown }[] = [
  ...[
    "REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "RUN_BI", "SUBMIT_PA", "APPROVE_PA", "DENY_PA",
    "VERIFY_PA_APPROVED_SMS", "VERIFY_PA_APPROVED_OTP", "NOTIFY_PROVIDER_TRANSFER", "VERIFY_PROVIDER_TRANSFER_SMS",
    "VERIFY_CASH_OFFER_SMS", "SELECT_SELF_PAY", "SEND_CASH_OFFER", "PATIENT_PAYS", "VERIFY_PAYMENT",
    "PATIENT_SETS_ADDRESS", "PATIENT_SELECTS_SHIP_DATE", "FILL_RX", "READY_RX", "SHIP_RX", "DELIVER_RX",
  ].map((type) => ({ type })),
  { type: "COMPLETE_BI" },
  { type: "COMPLETE_BI", result: "coverage_found" },
  { type: "COMPLETE_BI", result: "no_coverage" },
  ...COVERAGE.map((c) => ({ type: "COMPLETE_BI", ...c })),
  ...["BI", "PA", "PROVIDER_TRANSFER"].flatMap((stage) => [
    { type: "VIEW_STAGE", stage },
    { type: "LEAVE_STAGE", stage },
  ]),
  ...["retail", "mail_order", "self_pay"].map((option) => ({ type: "SELECT_PRICING_OPTION", option })),
  { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
];

/** A small seeded random generator, so a failing walk can be replayed. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The route rules in the recorded (pre-move) order, evaluated against the current rule definitions. */
function referenceRoute(order: string[], data: any): string {
  const byId = new Map(COASSIST_SCREENS.rules.map((r) => [r.id, r]));
  for (const id of order) {
    const rule = byId.get(id)!;
    if (!rule.when || rule.when(data)) return rule.path;
  }
  return COASSIST_SCREENS.fallback;
}

// The order before the move, frozen. Never re-record it: it is the reference the slot spine is held to.
const fixture = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "client/engine/__tests__/__fixtures__/rules/coassist-route-order.json"), "utf8"),
);

describe("CoAssist route equivalence", () => {
  it("applies the same rules to each scenario as the frozen order lists", () => {
    // Scope replaced the `scenarios` lists. Each scenario must still get exactly the rules it had.
    for (const flow of FLOWS) {
      const now = rulesFor(COASSIST_SCREENS, flow as FlowType).map((r) => r.id).sort();
      expect(now).toEqual([...fixture.scenarios[flow]].sort());
    }
  });

  it("has no screen map problems", () => {
    expect(screenMapProblems(COASSIST_SCREENS)).toEqual([]);
  });

  for (const flow of FLOWS) {
    it(`${flow}: the screen map routes every reachable state as the recorded order does`, () => {
      const recordedOrder: string[] = fixture.scenarios[flow];
      const forks = forksForScenario(COASSIST_FORKS, flow as FlowType);
      const mismatches: string[] = [];
      const matched = new Set<string>();
      let states = 0;

      for (let walk = 0; walk < WALKS; walk++) {
        const rand = mulberry32(walk * 7919 + FLOWS.indexOf(flow) + 1);
        // Pin a random exit at about half the forks, so DTP, Copay, and Coverage each reach their branches.
        const choices: Record<string, string> = {};
        for (const fork of forks) if (rand() < 0.5) choices[fork.id] = fork.exits[Math.floor(rand() * fork.exits.length)].id;

        const clock = new SimulatedClock();
        const actor = createActor(coassistMachine, { input: { flowType: flow, choices }, clock } as any);
        actor.start();

        for (let step = 0; step < STEPS; step++) {
          const snapshot = actor.getSnapshot();
          const data: any = (snapshot.context as any).workflowData;
          const route = routeFor(COASSIST_SCREENS, data);
          const expected = referenceRoute(recordedOrder, data);
          states++;
          if (route !== expected) mismatches.push(`walk ${walk} step ${step}: got ${route}, recorded order gives ${expected}`);
          const byId = new Map(COASSIST_SCREENS.rules.map((r) => [r.id, r]));
          const winner = recordedOrder.find((id) => {
            const r = byId.get(id)!;
            return !r.when || r.when(data);
          });
          if (winner) matched.add(winner);

          const options = EVENTS.filter((e) => snapshot.can(e as any));
          if (!options.length) break;
          actor.send(options[Math.floor(rand() * options.length)] as any);
          if (rand() < 0.5) clock.increment(REVEAL_MS);
        }
        actor.stop();
      }

      expect(mismatches.slice(0, 5)).toEqual([]);
      expect(states).toBeGreaterThan(WALKS * 10);
      // The proof only covers rules the walks reach. Fail if the walks stop reaching most of them.
      expect(matched.size).toBeGreaterThan(recordedOrder.length * 0.6);
    });
  }
});
