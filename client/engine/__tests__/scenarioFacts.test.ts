import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { scenarioFacts } from "@/workflows/scenarioFacts";

const FIXTURE = path.join(__dirname, "__fixtures__", "ui", "predicates.json");

/** The UI predicates as recorded in step 51, read from scenarioFacts. */
const fromFacts = (flowType: string) => {
  const f = scenarioFacts(flowType);
  const pricing = [null, "dtp", "retail", "mail_order", "copay"] as const;
  return {
    isCoaFlow_dtpCopay: f.hasPricingFork,
    isCoA_providerAnyCoassist: f.isCoassistSource,
    isCoverageFlow: f.isCoverageScenario,
    isPapFlow_faxAuditOnly: f.isFaxPap,
    isPapFlow_faxAuditAndPres: f.isNoPaIntake,
    isFaxFlow: f.isFax,
    isIAssistFlow: f.isIassistSource,
    isIAssist: f.isIassistStandardPa,
    isIAssistPapFlow_idOnly: f.isIassistAppeal,
    isIAssistPapFlow_crmWithFreeDrug: f.dispensesAtSiteOfCare,
    isCopayWorkflow: f.hasCopayFork,
    isPres: f.isPres,
    isWideFlow: f.isWideFlow,
    isCopayRetailFlow_byPricingOption: Object.fromEntries(pricing.map((p) => [String(p), f.isCopayRetail(p)])),
  };
};

describe("scenarioFacts", () => {
  const recorded = JSON.parse(fs.readFileSync(FIXTURE, "utf8")).flows as Record<string, unknown>;

  it("the step 51 fixture covers every scenario", () => {
    expect(Object.keys(recorded).sort()).toEqual(ALL_SCENARIOS.map((s) => s.flowType).sort());
  });

  for (const s of ALL_SCENARIOS) {
    it(`${s.flowType}: equals the recorded UI predicates`, () => {
      expect(fromFacts(s.flowType)).toEqual(recorded[s.flowType]);
    });
  }

  it("isStandardFaxPa is the faxed PA flow and no other (the UI's isWorkflow1)", () => {
    // The old definition, copied from patient/pages/DeliveryDate.tsx: flowType === "Fax_QS_PA_Approved".
    for (const s of ALL_SCENARIOS) expect({ flow: s.flowType, is: scenarioFacts(s.flowType).isStandardFaxPa }).toEqual({ flow: s.flowType, is: s.flowType === "Fax_QS_PA_Approved" });
  });

  it("a flow with no scenario has no facts", () => {
    const f = scenarioFacts("not_a_flow");
    expect(Object.entries(f).filter(([, v]) => v === true)).toEqual([]);
    expect(f.isCopayRetail("retail")).toBe(false);
  });
});
