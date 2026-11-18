import { describe, it, expect } from "vitest";
import { createActor, SimulatedClock } from "xstate";
import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { recipeProblems } from "@/engine/workflow/recipe";
import type { ModuleSpec, ScenarioRecipe } from "@/engine/workflow/components";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
import { SECOND_LEG_MS, secondLegTrigger } from "@/workflows/coassist/modules/tracking";
import { BRIDGE_TEXT_MS, bridgeTrigger } from "@/workflows/coassist/modules/cash_offer";
import * as SCENARIOS from "@/workflows/coassist/scenarios";
import { COA_DTP } from "@/workflows/coassist/scenarios";
import { setRecipeOverride } from "@/engine/workflow/recipeOverride";
import { crmActions } from "@/portals/crm/stages/actions";
import { CASH_OFFER_SCREENS } from "@/workflows/coassist/modules/screens/cash_offer";
import { stageVariantsFor } from "@/engine/workflow/stages";
import { stageMapFor } from "@/workflows/stageMaps";
import { STAGE_BUILDERS } from "@/portals/crm/stages/builders";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";
import { afterEach } from "vitest";

/**
 * The `bridge` variant of `cash_offer` (CLAUDE.md rules 4, 8, 11, 12): after a denied PA the patient gets a free short supply.
 * The trigger defaults from the intake channel and a scenario may override it. The precondition is the same either way.
 *
 * The test recipe runs on DTP's id with its `cash_offer` swapped for the bridge, so the real scenarios stay registered.
 */
const HOST = "CoA_DTP" as const;
const bridgeModule = (props: Record<string, unknown> = {}): ModuleSpec => ({ id: "cash_offer", props: { variant: "bridge", ...props } });

const recipe = (cash: ModuleSpec): ScenarioRecipe => ({
  source: "coassist",
  forks: ["bi", "pa"],
  choices: { bi: "pharmacy_covered", pa: "denied" },
  modules: [{ id: "enrollment" }, { id: "prior_authorization", props: { variant: "auto" } }, { id: "pa_notification" }, cash, { id: "tracking" }],
});

function build(cash: ModuleSpec = bridgeModule(), intake: "erx" | "fax" = "erx") {
  const r = recipe(cash);
  const scenario = { ...COA_DTP, intake, choices: r.choices, recipe: r };
  const machine = createWorkflowMachine({
    id: "coassist-bridge",
    defaultFlowType: HOST,
    rules: COASSIST_RULES,
    forks: COASSIST_FORKS,
    // Every real scenario stays registered, so the scope check sees the same recipes as the app. The host runs the test recipe.
    scenarios: { ...Object.fromEntries(Object.values(SCENARIOS).filter((v: any) => v?.flowType).map((v: any) => [v.flowType, v])), CoA_DTP: scenario },
  });
  const clock = new SimulatedClock();
  const actor = createActor(machine, { input: { flowType: HOST }, clock } as any);
  actor.start();
  const send = (type: string, extra: Record<string, unknown> = {}) => actor.send({ type, ...extra } as any);
  const can = (type: string) => actor.getSnapshot().can({ type } as any);
  const data = () => (actor.getSnapshot().context as any).workflowData;
  const emitted = () => ((actor.getSnapshot().context as any).emittedEvents ?? (actor.getSnapshot().context as any).events ?? []) as { type: string }[];
  return { scenario, clock, send, can, data, emitted };
}

/** BI is back and the PA is submitted. */
function atPaSubmitted(cash?: ModuleSpec, intake?: "erx" | "fax") {
  const t = build(cash, intake);
  for (const e of ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "COMPLETE_BI"]) t.send(e);
  expect(t.data().paStatus).toBe("submitted");
  return t;
}

describe("cash_offer bridge: the recipe", () => {
  it("is a valid recipe, and the `pa` fork accepts it on the denied exit", () => {
    expect(recipeProblems(recipe(bridgeModule()), COASSIST_FORKS)).toEqual([]);
  });

  it("a bridge recipe has no cash pay: no cash offer is sent, and no price is set", () => {
    withFrozenClock(() => {
      const t = atPaSubmitted();
      t.send("DENY_PA");
      t.clock.increment(BRIDGE_TEXT_MS);
      expect(t.can("SEND_CASH_OFFER")).toBe(false);
      t.send("SEND_CASH_OFFER");
      expect(t.data().cashOfferStatus).toBe("none");
      expect(t.data().pricingOption).toBeNull();
    });
  });
});

describe("cash_offer bridge: the trigger", () => {
  it("defaults from the intake channel and a prop overrides it", () => {
    const s = (intake: "erx" | "fax", props?: Record<string, unknown>) => ({ intake, recipe: recipe(bridgeModule(props)) });
    expect(bridgeTrigger(s("erx"))).toBe("system");
    expect(bridgeTrigger(s("fax"))).toBe("agent");
    expect(bridgeTrigger(s("erx", { trigger: "agent" }))).toBe("agent");
    expect(bridgeTrigger(s("fax", { trigger: "system" }))).toBe("system");
  });

  it("erx: the text goes out on its own after the denial, then the patient opens it", () => {
    withFrozenClock(() => {
      const t = atPaSubmitted();
      t.send("DENY_PA");
      expect(t.data().paStatus).toBe("denied");
      expect(t.data().bridgeStatus).toBeUndefined();
      t.clock.increment(BRIDGE_TEXT_MS);
      expect(t.data().bridgeStatus).toBe("sent");
      t.send("VERIFY_BRIDGE_SMS");
      expect(t.data().bridgeStatus).toBe("active");
      expect(t.data().cashOfferStatus).toBe("none");
    });
  });

  it("fax: nothing goes out until the case manager sends it", () => {
    withFrozenClock(() => {
      const t = atPaSubmitted(undefined, "fax");
      t.send("DENY_PA");
      t.clock.increment(BRIDGE_TEXT_MS * 5);
      expect(t.data().bridgeStatus).toBeUndefined();
      expect(t.can("SEND_BRIDGE")).toBe(true);
      t.send("SEND_BRIDGE");
      expect(t.data().bridgeStatus).toBe("sent");
      t.send("VERIFY_BRIDGE_SMS");
      expect(t.data().bridgeStatus).toBe("active");
    });
  });

  it("a scenario can override the default: an eRx scenario with trigger agent waits for the click", () => {
    withFrozenClock(() => {
      const t = atPaSubmitted(bridgeModule({ trigger: "agent" }), "erx");
      t.send("DENY_PA");
      t.clock.increment(BRIDGE_TEXT_MS * 5);
      expect(t.data().bridgeStatus).toBeUndefined();
      t.send("SEND_BRIDGE");
      expect(t.data().bridgeStatus).toBe("sent");
    });
  });
});

describe("cash_offer bridge: preconditions (rule 12)", () => {
  it("SEND_BRIDGE is rejected until the PA is denied, in both triggers", () => {
    withFrozenClock(() => {
      for (const intake of ["erx", "fax"] as const) {
        const t = build(undefined, intake);
        expect(t.can("SEND_BRIDGE")).toBe(false);
        for (const e of ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "COMPLETE_BI"]) t.send(e);
        expect(t.can("SEND_BRIDGE"), `${intake}: PA only submitted`).toBe(false);
        t.send("SEND_BRIDGE");
        expect(t.data().bridgeStatus).toBeUndefined();
      }
    });
  });

  it("the patient cannot open the text before it is sent, and it only counts once", () => {
    withFrozenClock(() => {
      const t = atPaSubmitted(undefined, "fax");
      t.send("DENY_PA");
      expect(t.can("VERIFY_BRIDGE_SMS")).toBe(false);
      t.send("SEND_BRIDGE");
      expect(t.can("SEND_BRIDGE")).toBe(false);
      t.send("VERIFY_BRIDGE_SMS");
      expect(t.can("VERIFY_BRIDGE_SMS")).toBe(false);
    });
  });

  it("a recipe with the other variants ignores the bridge events", () => {
    withFrozenClock(() => {
      for (const variant of ["pa_denied", "sms"]) {
        const t = atPaSubmitted({ id: "cash_offer", props: { variant } });
        t.send("DENY_PA");
        t.clock.increment(BRIDGE_TEXT_MS * 5);
        expect(t.can("SEND_BRIDGE"), variant).toBe(false);
        expect(t.can("VERIFY_BRIDGE_SMS"), variant).toBe(false);
        expect(t.data().bridgeStatus, variant).toBeUndefined();
      }
    });
  });
});

/**
 * The patient's screens for a bridge demo, on the real registered machine: a demo lays the bridge recipe over Copay
 * and pins the PA to denied (the brand file's `demos`). Each screen the patient visits is in the menu (rule 13).
 */
describe("cash_offer bridge: the patient's screens (end to end)", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));

  it("a denied PA runs from the waiting screen, through the text, to the free supply", () => {
    withFrozenClock(() => {
      setRecipeOverride("CoA_Copay", { modules: [{ id: "enrollment" }, { id: "prior_authorization", props: { variant: "auto" } }, { id: "pa_notification" }, bridgeModule(), { id: "tracking" }] });
      const clock = new SimulatedClock();
      const actor = startFlow("CoA_Copay", { clock, choices: { bi: "pharmacy_covered", pa: "denied" } });
      const records = runSteps(actor, [
        { type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }, { type: "DENY_PA" },
      ]);
      // The eRx text goes out on its own. No cash offer screen shows in between.
      expect(records[records.length - 1].route).toBe("/");
      clock.increment(BRIDGE_TEXT_MS);
      expect(ctx(actor).workflowData.bridgeStatus).toBe("sent");
      const [tap] = runSteps(actor, [{ type: "VERIFY_BRIDGE_SMS" }]);
      expect(tap.route).toBe("/bridge-supply");
      expect(ctx(actor).workflowData.cashOfferStatus).toBe("none");
      const menu = CASH_OFFER_SCREENS.map((x) => x.path);
      expect(menu).toContain("/bridge-sms");
      expect(menu).toContain("/bridge-supply");
    });
  });

  it("the CRM shows Send Bridge Supply on the cash offer stage only while the machine accepts it (fax)", () => {
    withFrozenClock(() => {
      setRecipeOverride("CoA_Copay", { modules: [{ id: "enrollment" }, { id: "prior_authorization", props: { variant: "auto" } }, { id: "pa_notification" }, bridgeModule({ trigger: "agent" }), { id: "tracking" }] });
      const actor = startFlow("CoA_Copay", { clock: new SimulatedClock(), choices: { bi: "pharmacy_covered", pa: "denied" } });
      const can = (e: { type: string }) => actor.getSnapshot().can(e as any);
      const labels = () => crmActions(ctx(actor).workflowData, "CO-14281", can as any).map((a) => a.label);
      runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }]);
      expect(labels()).not.toContain("Send Bridge Supply");
      runSteps(actor, [{ type: "DENY_PA" }]);
      expect(labels()).toContain("Send Bridge Supply");
      runSteps(actor, [{ type: "SEND_BRIDGE" }]);
      expect(labels()).not.toContain("Send Bridge Supply");
    });
  });
});

/**
 * The Bridge step: the text unlocks the $0 copay, then the address and date, the confirmation, and the tracker. Copay waits for the
 * Bridge text, not for a PA approval a denial never reaches.
 */
describe("cash_offer bridge: $0 copay and delivery", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));
  const MODULES: ModuleSpec[] = [
    { id: "enrollment" }, { id: "prior_authorization", props: { variant: "auto" } }, { id: "pa_notification" }, bridgeModule(), { id: "appeal" },
    { id: "financial_assistance", props: { variant: "copay" } }, { id: "scheduling" }, { id: "tracking" },
  ];
  const start = () => {
    setRecipeOverride("CoA_Copay", { modules: MODULES, forks: ["bi", "pa", "appeal"] });
    const clock = new SimulatedClock();
    const actor = startFlow("CoA_Copay", { clock, choices: { bi: "pharmacy_covered", pa: "denied", appeal: "approved" } });
    runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }, { type: "DENY_PA" }]);
    return { actor, clock, can: (type: string) => actor.getSnapshot().can({ type } as any), data: () => ctx(actor).workflowData };
  };

  it("rejects copay, address, date, and fill until each precondition holds (rule 12)", () => {
    withFrozenClock(() => {
      const t = start();
      t.clock.increment(BRIDGE_TEXT_MS); // text sent, not yet opened
      for (const e of ["SELECT_SELF_PAY", "PATIENT_SETS_ADDRESS", "PATIENT_SELECTS_SHIP_DATE", "FILL_RX"]) expect(t.can(e), `${e} before the text is opened`).toBe(false);
      runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }]);
      for (const e of ["PATIENT_SETS_ADDRESS", "PATIENT_SELECTS_SHIP_DATE", "FILL_RX"]) expect(t.can(e), `${e} before copay`).toBe(false);
      expect(t.can("SELECT_SELF_PAY")).toBe(true);
      runSteps(t.actor, [{ type: "SELECT_SELF_PAY" }]);
      expect(t.data().copayEnrolled).toBe(true);
      expect(t.can("PATIENT_SELECTS_SHIP_DATE")).toBe(false); // address first
      expect(t.can("FILL_RX")).toBe(false); // and the date
    });
  });

  it("walks the patient from the text to the tracker, each screen in the menu", () => {
    withFrozenClock(() => {
      const t = start();
      t.clock.increment(BRIDGE_TEXT_MS);
      const routes = runSteps(t.actor, [
        { type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, { type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" },
        { type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" },
      ]).map((r) => r.route);
      expect(routes).toEqual(["/bridge-supply", "/delivery-address", "/delivery-date", "/enrollment-complete", "/order-tracker", "/order-tracker", "/order-shipped", "/order-tracker"]);
      expect(t.data().pricingOption).toBeNull();
      expect(t.data().cashOfferStatus).toBe("none");
      expect(t.data().pharmacyStatus).toBe("delivered");
    });
  });
});

/**
 * Two dispense legs (CLAUDE.md rules 4, 8, 12): the Bridge pharmacy ships first, and the commercial pharmacy the HCP picked on
 * the eRx ships after the appeal is approved. The second leg waits for both.
 */
describe("cash_offer bridge: two dispense legs", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));
  const COMMERCIAL = { name: "Commercial Test Pharmacy", address: "1 Main St", city: "Indianapolis", state: "IN", zip: "46240", phone: "(317) 555-0100" };
  const MODULES: ModuleSpec[] = [
    { id: "enrollment" }, { id: "pharmacy_selection", props: { variant: "prescriber" } }, { id: "prior_authorization", props: { variant: "auto" } }, { id: "pa_notification" },
    bridgeModule(), { id: "appeal" }, { id: "financial_assistance", props: { variant: "copay" } }, { id: "scheduling" }, { id: "tracking", props: { variant: "two_legs", trigger: "agent" } },
  ];
  function start(appeal: "approved" | "denied" = "approved", modules: ModuleSpec[] = MODULES) {
    setRecipeOverride("CoA_Copay", { modules, forks: ["bi", "pa", "appeal"] });
    const clock = new SimulatedClock();
    const actor = startFlow("CoA_Copay", { clock, choices: { bi: "pharmacy_covered", pa: "denied", appeal } });
    return { actor, clock, can: (type: string) => actor.getSnapshot().can({ type } as any), data: () => ctx(actor).workflowData };
  }
  const THROUGH_DENIAL = [{ type: "REFERRAL_RECEIVED", pharmacy: COMMERCIAL }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }, { type: "DENY_PA" }];
  const LEG = [{ type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" }, { type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" }];

  /** The Bridge is delivered. The appeal has been filed. */
  function afterLegOne() {
    const t = start();
    runSteps(t.actor, THROUGH_DENIAL);
    t.clock.increment(BRIDGE_TEXT_MS);
    runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, ...LEG]);
    return t;
  }
  const approveAppeal = (t: ReturnType<typeof start>) => {
    runSteps(t.actor, [{ type: "VIEW_STAGE", stage: "APPEAL" }]);
    t.clock.increment(5000);
  };

  it("keeps the HCP's pharmacy pick on the case, and the first leg goes to the non-commercial pharmacy", () => {
    withFrozenClock(() => {
      const t = start();
      runSteps(t.actor, THROUGH_DENIAL);
      expect(t.data().commercialPharmacy).toEqual(COMMERCIAL);
      t.clock.increment(BRIDGE_TEXT_MS);
      runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, ...LEG.slice(0, 3)]);
      expect(t.data().selectedPharmacy?.name).not.toBe(COMMERCIAL.name);
      expect(t.data().commercialPharmacy).toEqual(COMMERCIAL);
    });
  });

  it("rejects the second leg until the appeal is approved and the first leg is delivered", () => {
    withFrozenClock(() => {
      const t = start();
      runSteps(t.actor, THROUGH_DENIAL);
      expect(t.can("START_SECOND_LEG"), "before anything").toBe(false);
      t.clock.increment(BRIDGE_TEXT_MS);
      runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, ...LEG.slice(0, 5)]);
      approveAppeal(t);
      expect(t.data().appealStatus).toBe("approved");
      expect(t.can("START_SECOND_LEG"), "approved but the first leg is only shipped").toBe(false);
      runSteps(t.actor, [{ type: "DELIVER_RX" }]);
      expect(t.can("START_SECOND_LEG"), "approved and delivered").toBe(true);
    });
  });

  it("rejects the second leg when the appeal is not approved, even after delivery", () => {
    withFrozenClock(() => {
      const t = start("denied");
      runSteps(t.actor, THROUGH_DENIAL);
      t.clock.increment(BRIDGE_TEXT_MS);
      runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, ...LEG]);
      approveAppeal(t);
      expect(t.data().appealStatus).toBe("denied");
      expect(t.can("START_SECOND_LEG")).toBe(false);
    });
  });

  it("the second leg asks for the address and date again, then the commercial pharmacy receives, ships, and delivers", () => {
    withFrozenClock(() => {
      const t = afterLegOne();
      approveAppeal(t);
      const firstShipDate = t.data().patientShipDate;
      const routes = runSteps(t.actor, [{ type: "START_SECOND_LEG" }, ...LEG]).map((r) => r.route);
      expect(routes).toEqual(["/appeal-approved-sms", "/delivery-date", "/enrollment-complete", "/order-tracker", "/order-tracker", "/order-shipped", "/medication-delivered"]);
      expect(t.data().dispenseLeg).toBe(2);
      expect(t.data().selectedPharmacy).toEqual(COMMERCIAL);
      expect(t.data().firstLeg?.shipDate).toBe(firstShipDate);
      expect(t.data().firstLeg?.pharmacy?.name).not.toBe(COMMERCIAL.name);
      expect(t.data().pharmacyStatus).toBe("delivered");
      expect(t.can("START_SECOND_LEG")).toBe(false); // and only once
    });
  });

  it("the second leg's own steps wait for the patient's address and date", () => {
    withFrozenClock(() => {
      const t = afterLegOne();
      approveAppeal(t);
      runSteps(t.actor, [{ type: "START_SECOND_LEG" }]);
      expect(t.can("FILL_RX")).toBe(false);
      runSteps(t.actor, [{ type: "PATIENT_SETS_ADDRESS" }]);
      expect(t.can("FILL_RX")).toBe(false); // and the date
      runSteps(t.actor, [{ type: "PATIENT_SELECTS_SHIP_DATE" }]);
      expect(t.can("READY_RX")).toBe(false); // the pharmacy receives only after the transfer
      expect(t.can("FILL_RX")).toBe(true);
    });
  });

  describe("the system trigger (an eRx case starts the second shipment on its own)", () => {
    const SYSTEM = MODULES.map((m) => (m.id === "tracking" ? { id: "tracking", props: { variant: "two_legs" } } : m)) as ModuleSpec[];

    it("defaults from the intake channel, and a prop overrides it", () => {
      const s = (intake: "erx" | "fax", trigger?: "system" | "agent") => ({ intake, recipe: { source: "coassist", forks: [], choices: {}, modules: [{ id: "tracking", props: { variant: "two_legs", ...(trigger ? { trigger } : {}) } }] } as ScenarioRecipe });
      expect(secondLegTrigger(s("erx"))).toBe("system");
      expect(secondLegTrigger(s("fax"))).toBe("agent");
      expect(secondLegTrigger(s("erx", "agent"))).toBe("agent");
      expect(secondLegTrigger(s("fax", "system"))).toBe("system");
    });

    it("an approved appeal starts it once the first shipment is delivered, and the patient is told", () => {
      withFrozenClock(() => {
        const t = start("approved", SYSTEM);
        runSteps(t.actor, THROUGH_DENIAL);
        t.clock.increment(BRIDGE_TEXT_MS);
        runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, ...LEG]);
        expect(t.data().dispenseLeg).toBeUndefined();
        approveAppeal(t);
        expect(t.data().appealStatus).toBe("approved");
        t.clock.increment(SECOND_LEG_MS); // the machine starts the second shipment by itself
        expect(t.data().dispenseLeg).toBe(2);
        expect(t.data().selectedPharmacy).toEqual(COMMERCIAL);
        expect(derivePatientRoute(ctx(t.actor))).toBe("/appeal-approved-sms");
      });
    });

    it("an appeal approved while the first shipment is in transit starts the second at delivery", () => {
      withFrozenClock(() => {
        const t = start("approved", SYSTEM);
        runSteps(t.actor, THROUGH_DENIAL);
        t.clock.increment(BRIDGE_TEXT_MS);
        runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, ...LEG.slice(0, 5)]);
        approveAppeal(t);
        t.clock.increment(SECOND_LEG_MS * 4);
        expect(t.data().dispenseLeg, "approved but still in transit").toBeUndefined();
        runSteps(t.actor, [{ type: "DELIVER_RX" }]);
        t.clock.increment(SECOND_LEG_MS);
        expect(t.data().dispenseLeg).toBe(2);
      });
    });

    it("never starts when the appeal is denied", () => {
      withFrozenClock(() => {
        const t = start("denied", SYSTEM);
        runSteps(t.actor, THROUGH_DENIAL);
        t.clock.increment(BRIDGE_TEXT_MS);
        runSteps(t.actor, [{ type: "VERIFY_BRIDGE_SMS" }, { type: "SELECT_SELF_PAY" }, ...LEG]);
        approveAppeal(t);
        t.clock.increment(SECOND_LEG_MS * 4);
        expect(t.data().appealStatus).toBe("denied");
        expect(t.data().dispenseLeg).toBeUndefined();
      });
    });

    it("with the agent trigger, nothing starts until the case manager clicks", () => {
      withFrozenClock(() => {
        const t = afterLegOne(); // MODULES carry trigger: agent
        approveAppeal(t);
        t.clock.increment(SECOND_LEG_MS * 4);
        expect(t.data().dispenseLeg).toBeUndefined();
        expect(t.can("START_SECOND_LEG")).toBe(true);
      });
    });
  });

  it("a recipe without two_legs ignores the second leg", () => {
    withFrozenClock(() => {
      setRecipeOverride("CoA_Copay", { modules: MODULES.map((m) => (m.id === "tracking" ? { id: "tracking" } : m)), forks: ["bi", "pa", "appeal"] });
      const actor = startFlow("CoA_Copay", { clock: new SimulatedClock(), choices: { bi: "pharmacy_covered", pa: "denied", appeal: "approved" } });
      expect(actor.getSnapshot().can({ type: "START_SECOND_LEG" } as any)).toBe(false);
    });
  });
});

/**
 * Patient onboarding with `capture` (CLAUDE.md rules 4 and 8): the signature and the insurance upload come after the confirmed
 * details, and enrollment completes only after both. A recipe without `capture` keeps the combined screen.
 */
describe("enrollment capture", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));
  const withCapture = (capture: boolean) => {
    setRecipeOverride("CoA_Copay", { modules: [capture ? { id: "enrollment", props: { capture: ["signature", "upload_insurance"] } } : { id: "enrollment" }, { id: "tracking" }], forks: ["bi"] });
    const actor = startFlow("CoA_Copay", { clock: new SimulatedClock(), choices: { bi: "pharmacy_covered" } });
    return { actor, can: (type: string) => actor.getSnapshot().can({ type } as any), data: () => ctx(actor).workflowData };
  };

  it("holds consent until the signature and the upload are both in", () => {
    withFrozenClock(() => {
      const t = withCapture(true);
      const routes = runSteps(t.actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }]).map((r) => r.route);
      expect(routes[2]).toBe("/confirm-details");
      expect(t.can("CONFIRM_CONSENT"), "before the signature").toBe(false);
      expect(t.can("UPLOAD_INSURANCE"), "upload before the signature").toBe(false);
      runSteps(t.actor, [{ type: "CAPTURE_SIGNATURE" }]);
      expect(t.can("CAPTURE_SIGNATURE")).toBe(false); // only once
      expect(t.can("CONFIRM_CONSENT"), "signed but no upload").toBe(false);
      runSteps(t.actor, [{ type: "UPLOAD_INSURANCE" }]);
      expect(t.can("CONFIRM_CONSENT")).toBe(true);
      const [done] = runSteps(t.actor, [{ type: "CONFIRM_CONSENT" }]);
      expect(t.data().consentStatus).toBe("confirmed");
      expect(done.route).toBe("/enrollment-complete");
    });
  });

  it("routes the patient to the upload once they have signed", () => {
    withFrozenClock(() => {
      const t = withCapture(true);
      const [, , , sign] = runSteps(t.actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CAPTURE_SIGNATURE" }]);
      expect(sign.route).toBe("/upload-insurance");
    });
  });

  it("a recipe without capture keeps today's flow: consent confirms at once and the capture events are ignored", () => {
    withFrozenClock(() => {
      const t = withCapture(false);
      runSteps(t.actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }]);
      expect(t.can("CAPTURE_SIGNATURE")).toBe(false);
      expect(t.can("UPLOAD_INSURANCE")).toBe(false);
      expect(t.can("CONFIRM_CONSENT")).toBe(true);
    });
  });
});

/**
 * The CRM's Stage Quick View for a Bridge demo: the cash offer is replaced by the Bridge Supply, and the PA stage no longer
 * says the patient is eligible for a cash offer.
 */
describe("cash_offer bridge: CRM stages", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));
  const variantFor = (stage: string) => stageVariantsFor(stageMapFor("CoA_Copay"), "CoA_Copay").find((v) => v.stage === stage)?.variant;

  it("draws the Bridge Supply and a PA stage with no cash offer wording", () => {
    withFrozenClock(() => {
      setRecipeOverride("CoA_Copay", { modules: [{ id: "enrollment" }, { id: "prior_authorization", props: { variant: "auto" } }, bridgeModule(), { id: "appeal" }, { id: "tracking" }], forks: ["bi", "pa", "appeal"] });
      expect(variantFor("CO-14281")).toBe("bridge");
      expect(variantFor("PA-14274")).toBe("bridge");
      const actor = startFlow("CoA_Copay", { clock: new SimulatedClock(), choices: { bi: "pharmacy_covered", pa: "denied", appeal: "approved" } });
      runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }, { type: "DENY_PA" }]);
      const d = ctx(actor).workflowData;
      const co = STAGE_BUILDERS["CO-14281"].bridge(d);
      const pa = STAGE_BUILDERS["PA-14274"].bridge(d);
      expect(co.name).toBe("Bridge Supply");
      expect(co.statusDetail).toMatch(/Bridge supply ready to send/);
      expect(pa.statusDetail).toBe("PA Denied — appeal filed, Bridge supply offered");
      for (const text of [co.name, co.statusLabel, co.statusDetail, pa.statusDetail]) expect(text).not.toMatch(/cash/i);
      runSteps(actor, [{ type: "SEND_BRIDGE" }, { type: "VERIFY_BRIDGE_SMS" }]);
      expect(STAGE_BUILDERS["CO-14281"].bridge(ctx(actor).workflowData).statusLabel).toBe("Active");
    });
  });
});
