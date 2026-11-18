import { afterEach, describe, expect, it } from "vitest";
import { SimulatedClock } from "xstate";
import abivax from "../../../brands/abivax/brand.json";
import { recipeProblems } from "@/engine/workflow/recipe";
import { composeRecipe, setRecipeOverride } from "@/engine/workflow/recipeOverride";
import { forksForScenario } from "@/engine/workflow/forks";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COA_COPAY } from "@/workflows/coassist/scenarios";
import { APPEAL_DECISION_MS, APPEAL_START_MS } from "@/workflows/coassist/modules/appeal";
import { BRIDGE_TEXT_MS } from "@/workflows/coassist/modules/cash_offer";
import { REVEAL_MS } from "@/workflows/coassist/modules/shared";
import { stepBarModel } from "@/shell/stepBar";
import { crmActions } from "@/portals/crm/stages/actions";
import fs from "node:fs";
import path from "node:path";
import { validateDemoRequest } from "@/workflows/catalog/request";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * The whole Abivax denied-PA Bridge story, headless (CLAUDE.md rule 8), run from the demo in the brand file so the test and the demo
 * cannot drift. eRx with the HCP's pharmacy, patient onboarding with signature and upload, BI, a denied PA, the appeal, the
 * Bridge from the non-commercial pharmacy, then the commercial pharmacy after the appeal is approved.
 */
const DEMO = abivax.demos.find((d) => d.id === "coassist-copay-bridge")! as any;
const COMMERCIAL = abivax.program.specialtyPharmacy;
// The scenario's own content: the brand's transfer partner (ARx under Abivax, a placeholder under the test brand).
const BRIDGE_PHARMACY = COA_COPAY.content.transferPharmacy;
const TP = "TP-14277";

describe("the denied-PA Bridge story, eRx to the second delivery", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));

  it("the request file is valid, and its blocks and demo match the demo in the brand file", () => {
    const file = path.resolve(__dirname, "../../../docs/demos/abivax/coassist-copay-bridge.request.json");
    const result = validateDemoRequest(JSON.parse(fs.readFileSync(file, "utf8")));
    expect(result.ok ? [] : result.problems).toEqual([]);
    if (!result.ok) return;
    const fromRequest = result.request.cards.map((c) => (c.kind === "block" ? `${c.moduleId}:${c.variantId ?? ""}` : "ghost"));
    const fromBrand = DEMO.recipe.modules.map((m: any) => `${m.id}:${m.props?.variant ?? ""}`);
    expect(fromRequest).toEqual(fromBrand);
    expect(result.request.demos[0]).toMatchObject({ id: DEMO.id, label: DEMO.label, choices: DEMO.choices });
  });

  it("the demo's blocks pass the same ordering rules as a recipe", () => {
    const recipe = composeRecipe(COA_COPAY.recipe!, DEMO.recipe);
    expect(recipeProblems({ ...recipe, choices: DEMO.choices }, forksForScenario(COASSIST_FORKS, "CoA_Copay"))).toEqual([]);
  });

  it("runs end to end, with the right screen, pharmacy and CRM button at each step", () => {
    withFrozenClock(() => {
      setRecipeOverride("CoA_Copay", DEMO.recipe);
      const clock = new SimulatedClock();
      const actor = startFlow("CoA_Copay", { clock, choices: DEMO.choices });
      const data = () => ctx(actor).workflowData;
      const can = (e: { type: string }) => actor.getSnapshot().can(e as any);
      const buttons = () => crmActions(data(), TP, can as any).map((a) => a.id);
      const route = (type: string, extra: Record<string, unknown> = {}) => runSteps(actor, [{ type, ...extra }])[0].route;

      // 1. The HCP picks the commercial pharmacy on the eRx. It stays on the case and is not the Bridge's pharmacy.
      route("REFERRAL_RECEIVED", { pharmacy: COMMERCIAL });
      expect(data().commercialPharmacy).toEqual(COMMERCIAL);
      expect(data().selectedPharmacy).toBeNull();

      // 2. Onboarding: details, consent, signature, and the insurance upload come before enrollment completes.
      runSteps(actor, [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }]);
      expect(actor.getSnapshot().can({ type: "CONFIRM_CONSENT" })).toBe(false);
      expect(route("CAPTURE_SIGNATURE")).toBe("/upload-insurance");
      route("UPLOAD_INSURANCE"); // the Upload page sends this and CONFIRM_CONSENT together
      expect(route("CONFIRM_CONSENT")).toBe("/enrollment-complete");

      // 3. The case manager opens BI: covered, PA required, and the PA fires on its own. Opening the PA denies it.
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      expect(data().paStatus).toBe("submitted");
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "PA" }]);
      clock.increment(REVEAL_MS);
      expect(data().paStatus).toBe("denied");

      // 4. The appeal starts on its own, and the Bridge text goes out on its own. No cash offer.
      clock.increment(Math.max(APPEAL_START_MS, BRIDGE_TEXT_MS));
      expect(data().appealStatus).toBe("initiated");
      expect(data().bridgeStatus).toBe("sent");
      expect(data().cashOfferStatus).toBe("none");
      expect(data().selectedPharmacy).toEqual(BRIDGE_PHARMACY); // ARx, from the first text
      // The offered Bridge resolves the denied PA, so the step bar moves on to Triage to Pharmacy (step 5).
      expect(stepBarModel("CoA_Copay", data()).workflowStep).toBe(5);

      // 5. The patient enrolls at $0, confirms the address, and picks a date.
      expect(route("VERIFY_BRIDGE_SMS")).toBe("/bridge-supply");
      expect(route("SELECT_SELF_PAY")).toBe("/delivery-address");
      expect(route("PATIENT_SETS_ADDRESS")).toBe("/delivery-date");
      expect(route("PATIENT_SELECTS_SHIP_DATE")).toBe("/enrollment-complete");
      expect(data().pricingOption).toBeNull();

      // 6. The case manager transfers to ARx, which receives, ships, and delivers.
      expect(buttons()).toContain("triage.dispatch");
      expect(buttons()).not.toContain("triage.second_leg");
      expect(route("FILL_RX")).toBe("/order-tracker");
      expect(route("READY_RX")).toBe("/order-tracker");
      expect(route("SHIP_RX")).toBe("/order-shipped");
      route("DELIVER_RX");
      expect(data().selectedPharmacy).toEqual(BRIDGE_PHARMACY);
      expect(actor.getSnapshot().can({ type: "START_SECOND_LEG" })).toBe(false); // the appeal is still open

      // 7. The appeal is approved. The case manager transfers to the commercial pharmacy.
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "APPEAL" }]);
      clock.increment(APPEAL_DECISION_MS);
      expect(data().appealStatus).toBe("approved");
      expect(buttons()).toContain("triage.second_leg");
      expect(stepBarModel("CoA_Copay", data()).workflowStep).toBe(9); // the first shipment is delivered
      expect(route("START_SECOND_LEG")).toBe("/appeal-approved-sms"); // the patient gets a text, then confirms again
      // The second shipment restarts at Triage to Pharmacy. It never drops back to Prior Authorization (step 4).
      expect(stepBarModel("CoA_Copay", data()).workflowStep).toBe(5);
      expect(buttons()).not.toContain("triage.second_leg");
      expect(route("PATIENT_SETS_ADDRESS")).toBe("/delivery-date");
      expect(data().patientShipDate).toBeNull(); // the date is a fresh pick
      expect(route("PATIENT_SELECTS_SHIP_DATE")).toBe("/enrollment-complete");
      expect(buttons()).toContain("triage.dispatch");
      route("FILL_RX");
      expect(data().selectedPharmacy).toEqual(COMMERCIAL);
      runSteps(actor, [{ type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" }]);

      // The end state: both shipments delivered, each by its own pharmacy.
      expect(data().pharmacyStatus).toBe("delivered");
      expect(data().dispenseLeg).toBe(2);
      expect(data().firstLeg?.pharmacy).toEqual(BRIDGE_PHARMACY);
      expect(data().selectedPharmacy).toEqual(COMMERCIAL);
      expect(data().paStatus).toBe("denied"); // a denied PA stays denied
    });
  });
});
