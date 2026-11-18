import { afterEach, describe, expect, it } from "vitest";
import { SimulatedClock } from "xstate";
import abivax from "../../../brands/abivax/brand.json";
import { recipeProblems } from "@/engine/workflow/recipe";
import { composeRecipe, setRecipeOverride } from "@/engine/workflow/recipeOverride";
import { forksForScenario } from "@/engine/workflow/forks";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COA_COPAY } from "@/workflows/coassist/scenarios";
import { APPEAL_DECISION_MS, APPEAL_START_MS } from "@/workflows/coassist/modules/appeal";
import { SECOND_LEG_MS } from "@/workflows/coassist/modules/tracking";
import { BRIDGE_TEXT_MS } from "@/workflows/coassist/modules/cash_offer";
import { REVEAL_MS } from "@/workflows/coassist/modules/shared";
import { stepBarModel } from "@/shell/stepBar";
import { STAGE_BUILDERS } from "@/portals/crm/stages/builders";
import { crmActions } from "@/portals/crm/stages/actions";
import fs from "node:fs";
import path from "node:path";
import { validateDemoRequest } from "@/workflows/catalog/request";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { caseDocuments } from "@/brand/caseDocuments";
import { caseDocumentOptions } from "@/workflows/caseDocumentOptions";
import { triageLabel } from "@/workflows/vocabulary";
import { startPortalFor } from "@/shell/DemoShell";
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
      expect(STAGE_BUILDERS["PS-14278"].standard(data()).statusDetail).toBe("First dispense delivered");
      expect(actor.getSnapshot().can({ type: "START_SECOND_LEG" })).toBe(false); // the appeal is still open

      // 7. The appeal is approved and the patient is told. The case manager then transfers to the commercial pharmacy (Triage to Pharmacy).
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "APPEAL" }]);
      clock.increment(APPEAL_DECISION_MS);
      expect(data().appealStatus).toBe("approved");
      // An eRx case needs no click: the approved appeal starts the second shipment on its own, and the patient gets a text.
      expect(data().dispenseLeg).toBeUndefined();
      clock.increment(SECOND_LEG_MS);
      expect(data().dispenseLeg).toBe(2);
      expect(derivePatientRoute(ctx(actor))).toBe("/appeal-approved-sms");
      expect(stepBarModel("CoA_Copay", data()).workflowStep).toBe(5); // the second shipment restarts at Triage, never at Prior Authorization
      expect(buttons()).not.toContain("triage.second_leg");
      expect(route("PATIENT_SETS_ADDRESS")).toBe("/delivery-date");
      expect(data().patientShipDate).toBeNull(); // the date is a fresh pick
      expect(route("PATIENT_SELECTS_SHIP_DATE")).toBe("/enrollment-complete");
      expect(buttons()).toContain("triage.dispatch");
      route("FILL_RX");
      expect(data().selectedPharmacy).toEqual(COMMERCIAL);
      runSteps(actor, [{ type: "READY_RX" }, { type: "SHIP_RX" }]);
      // The CRM stages follow the second shipment, not the first (Triage and Pharmacy Status agree).
      expect(STAGE_BUILDERS["PS-14278"].standard(data()).statusDetail).toBe("Second dispense shipped — in transit to patient");
      expect(STAGE_BUILDERS["TP-14277"].bridge(data()).statusDetail).toBe("Second dispense shipped");
      runSteps(actor, [{ type: "DELIVER_RX" }]);
      expect(STAGE_BUILDERS["PS-14278"].standard(data()).statusDetail).toBe("Second dispense delivered");

      // The end state: both shipments delivered, each by its own pharmacy.
      expect(data().pharmacyStatus).toBe("delivered");
      expect(data().dispenseLeg).toBe(2);
      expect(data().firstLeg?.pharmacy).toEqual(BRIDGE_PHARMACY);
      expect(data().selectedPharmacy).toEqual(COMMERCIAL);
      expect(data().paStatus).toBe("denied"); // a denied PA stays denied
    });
  });
});

/**
 * The same story, started by a fax. The referral reaches the platform by fax, so the case starts in the CRM like the Standard flow
 * (`intake: "fax"` on the demo's recipe, rule 11). Everything the intake decides follows it: the Bridge text and the second
 * shipment wait for the case manager, and the pharmacy hand-off is called "Triage to Pharmacy".
 */
const FAX_DEMO = abivax.demos.find((d) => d.id === "coassist-copay-bridge-fax")! as any;

describe("the Abivax demo list", () => {
  it("is numbered in dropdown order, and the Bridge is first", () => {
    const labels = abivax.demos.map((d) => d.label);
    expect(labels.map((l, i) => l.startsWith(`${i + 1}. `))).toEqual(labels.map(() => true));
    expect(abivax.demos[0].id).toBe("coassist-copay-bridge");
    expect(abivax.demos.map((d) => d.id)).not.toContain("coa-dtp");
    expect(abivax.demos.map((d) => d.id)).not.toContain("coa-copay");
  });

  it("the fax demo differs from the eRx demo only by its intake and its words", () => {
    const { intake, ...faxRecipe } = FAX_DEMO.recipe;
    expect(intake).toBe("fax");
    expect(faxRecipe).toEqual(DEMO.recipe);
    expect(FAX_DEMO.flow).toBe(DEMO.flow);
    expect(FAX_DEMO.choices).toEqual(DEMO.choices);
    expect(DEMO.recipe.intake).toBeUndefined();
  });
});

describe("the denied-PA Bridge story, started by a fax", () => {
  afterEach(() => setRecipeOverride("CoA_Copay", undefined));

  it("starts in the CRM, and the eRx demo still starts in the EHR", () => {
    setRecipeOverride("CoA_Copay", FAX_DEMO.recipe);
    expect(startPortalFor("CoA_Copay")).toBe("crm");
    setRecipeOverride("CoA_Copay", DEMO.recipe);
    expect(startPortalFor("CoA_Copay")).toBe("provider");
  });

  it("runs end to end, with the case manager doing what the eRx case does on its own", () => {
    withFrozenClock(() => {
      setRecipeOverride("CoA_Copay", FAX_DEMO.recipe);
      const clock = new SimulatedClock();
      const actor = startFlow("CoA_Copay", { clock, choices: FAX_DEMO.choices });
      const data = () => ctx(actor).workflowData;
      const can = (e: { type: string }) => actor.getSnapshot().can(e as any);
      const buttons = (stage: string) => crmActions(data(), stage, can as any).map((a) => ({ id: a.id, label: a.label }));
      const route = (type: string, extra: Record<string, unknown> = {}) => runSteps(actor, [{ type, ...extra }])[0].route;

      // The wording follows the intake.
      expect(triageLabel("CoA_Copay")).toBe("Triage to Pharmacy");

      // 1. The faxed enrollment: the case manager enrolls the patient in the CRM. No EHR pick, so the client's own pharmacy is used.
      expect(buttons("case").map((b) => b.id)).toContain("enroll");
      route("REFERRAL_RECEIVED", { portal: "crm" });
      expect(data().commercialPharmacy).toEqual(COA_COPAY.content.commercial);
      const docs = caseDocuments(data(), caseDocumentOptions("CoA_Copay"));
      expect(docs.find((x) => x.type.startsWith("Enrollment Form"))?.id).toMatch(/^FAX-/); // the faxed form is on the case

      // 2 and 3. Onboarding, BI, and the PA, as in the eRx demo.
      runSteps(actor, [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CAPTURE_SIGNATURE" }, { type: "UPLOAD_INSURANCE" }, { type: "CONFIRM_CONSENT" }]);
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "PA" }]);
      clock.increment(REVEAL_MS);
      expect(data().paStatus).toBe("denied");
      clock.increment(APPEAL_START_MS);
      expect(data().appealStatus).toBe("initiated"); // the appeal still starts on its own

      // 4. The Bridge text waits for the case manager's click. Nothing goes out by itself.
      clock.increment(BRIDGE_TEXT_MS * 5);
      expect(data().bridgeStatus).toBeUndefined();
      expect(buttons("CO-14281").map((b) => b.id)).toContain("cash_offer.send_bridge");
      route("SEND_BRIDGE");
      expect(data().bridgeStatus).toBe("sent");

      // 5 and 6. The patient enrolls at $0 and schedules, and the case manager transfers to the first pharmacy.
      expect(route("VERIFY_BRIDGE_SMS")).toBe("/bridge-supply");
      route("SELECT_SELF_PAY");
      route("PATIENT_SETS_ADDRESS");
      route("PATIENT_SELECTS_SHIP_DATE");
      expect(buttons(TP).find((b) => b.id === "triage.dispatch")?.label).toBe("Triage to Pharmacy");
      runSteps(actor, [{ type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" }]);
      expect(data().selectedPharmacy).toEqual(BRIDGE_PHARMACY);

      // 7. The appeal is approved. The second shipment waits for the case manager's transfer.
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "APPEAL" }]);
      clock.increment(APPEAL_DECISION_MS);
      expect(data().appealStatus).toBe("approved");
      clock.increment(SECOND_LEG_MS * 5);
      expect(data().dispenseLeg).toBeUndefined();
      expect(buttons(TP).find((b) => b.id === "triage.second_leg")?.label).toBe("Transfer to Commercial Pharmacy");
      expect(route("START_SECOND_LEG")).toBe("/appeal-approved-sms");
      route("PATIENT_SETS_ADDRESS");
      route("PATIENT_SELECTS_SHIP_DATE");
      runSteps(actor, [{ type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" }]);

      // The same end state as the eRx demo.
      expect(data().pharmacyStatus).toBe("delivered");
      expect(data().dispenseLeg).toBe(2);
      expect(data().firstLeg?.pharmacy).toEqual(BRIDGE_PHARMACY);
      expect(data().selectedPharmacy).toEqual(COA_COPAY.content.commercial);
      expect(data().paStatus).toBe("denied");
    });
  });
});

