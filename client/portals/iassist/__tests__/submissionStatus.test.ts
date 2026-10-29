import { describe, it, expect } from "vitest";
import { deriveDocuments, deriveStatusCards, paExpiration, submissionSummary } from "../data/submissionStatus";
import type { WorkflowData } from "@/engine/types";

const d = (over: Record<string, unknown> = {}) =>
  ({ enrollmentStatus: "none", consentStatus: "pending", biStatus: "none", paStatus: "none", paApprovedAt: null, copayEnrolled: false, ...over }) as unknown as WorkflowData;

const card = (data: WorkflowData, key: string) => deriveStatusCards(data, "Sam", "Program").find((c) => c.key === key)!;

describe("iAssist patient view status", () => {
  it("shows an idle submission before the referral", () => {
    expect(deriveStatusCards(d(), "Sam", "Program").map((c) => c.state)).toEqual(["idle", "idle", "idle"]);
    expect(deriveDocuments(d())).toEqual([]);
  });

  it("follows the submission: enrolled, waiting on consent, PA pending", () => {
    const data = d({ enrollmentStatus: "enrolled", biStatus: "running" });
    expect(card(data, "enrollment").body).toContain("Waiting on Sam's consent");
    expect(card(data, "prior_authorization").state).toBe("pending");
    expect(deriveDocuments(data).map((x) => x.name)).toEqual(["EnrollmentForm.pdf"]);
  });

  it("shows the approved PA with an authorization number and a one-year expiration", () => {
    const data = d({ enrollmentStatus: "enrolled", consentStatus: "confirmed", paStatus: "approved", paApprovedAt: "2026-01-15T12:00:00.000Z" });
    expect(card(data, "prior_authorization").body).toContain("PA-48201937");
    expect(paExpiration("2026-01-15T12:00:00.000Z")).toBe("01/15/2027");
    expect(deriveDocuments(data).map((x) => x.name)).toContain("PAApprovalNotice.pdf");
  });

  it("counts copay claims and lists the covered steps", () => {
    const data = d({ enrollmentStatus: "enrolled", medbvStatus: "complete", paStatus: "submitted", copayEnrolled: true, copayClaims: [{}, {}] });
    expect(card(data, "copay").body).toContain("2 claims filed");
    expect(submissionSummary(data)).toBe("Enrollment, MedBV, PA, Copay");
    expect(deriveDocuments(data).map((x) => x.name)).toEqual(["EnrollmentForm.pdf", "SummaryOfBenefits.pdf", "PriorAuthorizationForm.pdf"]);
  });

  it("closes the loop when the patient consents by text and confirms income", () => {
    const base = { enrollmentStatus: "enrolled", choices: { consent: "patient_text" } };
    expect(card(d(base), "enrollment").body).toContain("consent by text");
    // A recipe without `income: "confirm"` never asks, so there is nothing to wait on.
    const noIncomeStep = d({ ...base, consentStatus: "confirmed", incomeStatus: "none" });
    expect(card(noIncomeStep, "enrollment").body).not.toContain("household income");
    const consented = d({ ...base, consentStatus: "confirmed", incomeStatus: "none", householdRequested: true });
    expect(card(consented, "enrollment").body).toContain("Waiting on household income");
    const done = d({ ...base, consentStatus: "confirmed", incomeStatus: "verified", householdRequested: true, householdSize: "2", householdIncome: "62000" });
    expect(card(done, "enrollment").body).toContain("Household of 2, income $62,000, confirmed");
  });
});
