import { describe, it, expect } from "vitest";
import { BRAND, DEFAULT_FLOW } from "@/brand";
import { DEFAULT_PERSONA, personaFor } from "@/workflows/persona";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { PATIENT_SEED } from "@/store/patientStore";
import type { ScenarioDefinition } from "@/engine/workflow/types";
import { SCENARIOS } from "./scenarios";

describe("patient persona is scenario data", () => {
  it("has a scenario for every tested flow", () => {
    expect(ALL_SCENARIOS.map((s) => s.flowType).sort()).toEqual([...new Set(SCENARIOS.map((s) => s.flowType as string))].sort());
  });

  it("gives every flow the shared patient and the brand's drug", () => {
    for (const { flowType } of ALL_SCENARIOS) {
      const p = personaFor(flowType);
      expect(p.patientName).toBe(DEFAULT_PERSONA.patientName);
      expect(p.drugName).toBe(BRAND.program.drugDisplayName || BRAND.program.name);
      expect(p.dosageForm).toBe(BRAND.program.dosageForm ?? "");
    }
  });

  it("starts the patient store from the default flow's persona", () => {
    expect(PATIENT_SEED).toEqual(personaFor(DEFAULT_FLOW));
  });

  it("lets a scenario override single fields", () => {
    const scenario = { flowType: "CoA_DTP", patient: { patientName: "Maria Lopez", payer: "Medicaid" } } as ScenarioDefinition<unknown>;
    const p = personaFor("CoA_DTP", [scenario]);
    expect(p.patientName).toBe("Maria Lopez");
    expect(p.payer).toBe("Medicaid");
    expect(p.patientDob).toBe(DEFAULT_PERSONA.patientDob);
  });

  it("never lets a scenario set the drug", () => {
    const scenario = { flowType: "CoA_DTP", patient: { drugName: "Other", dosageForm: "Other form" } } as unknown as ScenarioDefinition<unknown>;
    const p = personaFor("CoA_DTP", [scenario]);
    expect(p.drugName).toBe(BRAND.program.drugDisplayName || BRAND.program.name);
    expect(p.dosageForm).toBe(BRAND.program.dosageForm ?? "");
  });
});
