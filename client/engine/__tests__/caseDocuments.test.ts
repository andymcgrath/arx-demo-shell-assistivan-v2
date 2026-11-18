import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caseDocuments } from "@/brand/caseDocuments";
import { caseDocumentOptions } from "@/workflows/caseDocumentOptions";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The CRM and the Field portal show the same documents. Both call `caseDocuments(workflowData, caseDocumentOptions(flow))`,
 * so the tests check the one list: every scenario, the new document kinds, and that neither portal builds its own list again.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("case documents in every scenario", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: ids and names are unique, and every file exists in public/`, () => {
      withFrozenClock(() => {
        const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
        runSteps(actor, scenario.steps);
        const docs = caseDocuments(ctx(actor).workflowData, caseDocumentOptions(scenario.flowType));
        actor.stop();

        expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
        expect(new Set(docs.map((d) => d.name)).size).toBe(docs.length);
        expect(docs.filter((d) => !fs.existsSync(path.join(ROOT, "public", d.file))).map((d) => d.file)).toEqual([]);
      });
    });
  }

  it("lists the faxed enrollment form on a fax scenario, with a FAX id", () => {
    withFrozenClock(() => {
      const scenario = SCENARIOS.find((s) => s.flowType === "Fax_QS_PA_Approved")!;
      const actor = startFlow(scenario.flowType);
      runSteps(actor, scenario.steps);
      const docs = caseDocuments(ctx(actor).workflowData, caseDocumentOptions(scenario.flowType));
      actor.stop();
      expect(docs.find((d) => d.type === "Enrollment Form")?.id).toBe("FAX-2026-00431");
      expect(docs.map((d) => d.type)).toEqual(expect.arrayContaining(["Consent Form", "Prior Authorization Form", "Summary of Benefits", "PA Approval Notice"]));
    });
  });
});

describe("captured documents", () => {
  const base = () => {
    const actor = startFlow("CoA_DTP");
    const data = { ...ctx(actor).workflowData };
    actor.stop();
    return data;
  };

  it("shows signed copies of the enrollment and consent forms once the patient signs", () => {
    const d = { ...base(), enrollmentStatus: "enrolled" as const, consentStatus: "confirmed" as const, signatureCaptured: true };
    const docs = caseDocuments(d, {});
    expect(docs.map((x) => x.name)).toEqual(["SignedEnrollmentForm.pdf", "SignedConsentForm.pdf"]);
  });

  it("lists the PA appeal submission once an appeal is filed, and not before", () => {
    const denied = { ...base(), paStatus: "denied" as const };
    expect(caseDocuments(denied, {}).map((x) => x.type)).not.toContain("PA Appeal Submission");
    expect(caseDocuments({ ...denied, appealStatus: "initiated" }, {}).map((x) => x.type)).toContain("PA Appeal Submission");
  });

  it("lists each file the HCP attached in iAssist once", () => {
    const d = { ...base(), submittedDocuments: ["ChartNotes.pdf", "ChartNotes.pdf", "PayerAttachment.pdf"] };
    const docs = caseDocuments(d, {}).filter((x) => x.type === "Supporting Document");
    expect(docs.map((x) => x.name)).toEqual(["ChartNotes.pdf", "PayerAttachment.pdf"]);
  });

  it("carries the iAssist wizard's file names on the referral", () => {
    withFrozenClock(() => {
      const actor = startFlow("iAssist_Buy_And_Bill");
      runSteps(actor, [{ type: "RUN_MEDBV" }, { type: "ENROLL_COPAY" }, { type: "REFERRAL_RECEIVED", documents: ["ChartNotes.pdf", "LMN.pdf"] }]);
      const data = ctx(actor).workflowData;
      actor.stop();
      expect(data.submittedDocuments).toEqual(["ChartNotes.pdf", "LMN.pdf"]);
      expect(caseDocuments(data, caseDocumentOptions("iAssist_Buy_And_Bill")).filter((x) => x.type === "Supporting Document").map((x) => x.name)).toEqual(["ChartNotes.pdf", "LMN.pdf"]);
    });
  });
});

describe("one list for the CRM and the Field portal", () => {
  it.each(["client/portals/crm/pages/Index.tsx", "client/portals/field/index.tsx"])("%s reads caseDocuments() and builds no list of its own", (file) => {
    const source = read(file);
    expect(source).toContain("caseDocuments(");
    expect(source).toContain("caseDocumentOptions(");
    expect(source).not.toMatch(/FAX-2026|SOB-2026|DOC-2026/);
  });
});
