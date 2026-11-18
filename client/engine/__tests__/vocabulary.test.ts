import { describe, expect, it } from "vitest";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { TRANSFER_LABEL, TRIAGE_LABEL, triageLabel, triageVerb, withTriageLabel } from "@/workflows/vocabulary";
import { stepBarModel } from "@/shell/stepBar";
import { STAGE_BUILDERS } from "@/portals/crm/stages/builders";
import { crmActions } from "@/portals/crm/stages/actions";
import { ctx, startFlow, withFrozenClock } from "./harness";

/**
 * One rule names the step that hands the Rx to the pharmacy: an eRx referral is "Transfer to Pharmacy", and a fax referral
 * (or e-sign) is "Triage to Pharmacy". The scenario's `intake` decides, and every app reads the one helper.
 */
describe("Transfer to Pharmacy for eRx, Triage to Pharmacy for fax", () => {
  it("names every scenario by its intake", () => {
    for (const s of ALL_SCENARIOS) {
      expect(triageLabel(s.flowType), s.flowType).toBe(s.intake === "erx" ? TRANSFER_LABEL : TRIAGE_LABEL);
      expect(triageVerb(s.flowType), s.flowType).toBe(s.intake === "erx" ? "Transfer" : "Triage");
    }
  });

  it("has both kinds, so the test means something", () => {
    expect(ALL_SCENARIOS.some((s) => s.intake === "erx")).toBe(true);
    expect(ALL_SCENARIOS.some((s) => s.intake === "fax")).toBe(true);
    expect(triageLabel("Fax_QS_PA_Approved")).toBe("Triage to Pharmacy");
    expect(triageLabel("PrES_PAP")).toBe("Triage to Pharmacy");
    expect(triageLabel("CoA_DTP")).toBe("Transfer to Pharmacy");
    expect(triageLabel("iAssist_PA_Approved")).toBe("Transfer to Pharmacy");
  });

  it("leaves other labels alone", () => {
    expect(withTriageLabel("Rx Processing", "CoA_DTP")).toBe("Rx Processing");
    expect(withTriageLabel("Triage to Pharmacy", "CoA_DTP")).toBe("Transfer to Pharmacy");
    expect(withTriageLabel("Triage to Pharmacy", "Fax_QS_PA_Approved")).toBe("Triage to Pharmacy");
    expect(withTriageLabel("Triage to Site of Care", "CoA_DTP")).toBe("Triage to Site of Care");
  });

  it("the step bar, the CRM stage and its button agree for each intake", () => {
    withFrozenClock(() => {
      for (const [flow, label] of [["CoA_DTP", "Transfer to Pharmacy"], ["Fax_QS_PA_Approved", "Triage to Pharmacy"]] as const) {
        const actor = startFlow(flow);
        const d = ctx(actor).workflowData;
        expect(stepBarModel(flow, d).labels, `${flow} step bar`).toContain(label);
        expect(stepBarModel(flow, d).labels, `${flow} step bar has only its own wording`).not.toContain(label === "Triage to Pharmacy" ? "Transfer to Pharmacy" : "Triage to Pharmacy");
        expect(STAGE_BUILDERS["TP-14277"].standard(d).name, `${flow} stage`).toBe(label);
        const dispatch = crmActions({ ...d, dispatchStatus: "selected" } as any, "TP-14277", () => true).find((a) => a.id === "triage.dispatch");
        expect(dispatch?.label, `${flow} button`).toBe(label);
        actor.stop();
      }
    });
  });
});
