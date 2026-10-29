/**
 * buyAndBillLadders.ts: the stage-jump list for a scenario whose recipe has the `copay` module (Buy and Bill). The
 * HCP runs eMedBV and enrolls the patient in copay before the referral, so the ladder sends both first. The
 * machine holds the referral until they are done (workflows/iassist/modules/enrollment.ts).
 *
 * 2 HCP submitted (eMedBV, copay, referral), 3 patient enrolled (consent, and income when the patient consents by text), 4 BI complete and PA approved, 5 patient verified,
 * 6 copay claim filed (the terminal stage).
 */
import { scenarioHasModule } from "@/workflows/scenarios";
import type { LadderEvent } from "./coassistLadders";
import { KEANU_SITE_OF_CARE_FACTS } from "@/engine/WorkflowEngine";

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): LadderEvent => ({ type, portal, ...extra });

export const BUY_AND_BILL_STAGE_LABELS = [
  "Referral Received",
  "HCP Submitted (eMedBV, Copay Enrolled)",
  "Patient Enrolled",
  "PA Approved",
  "Patient Verified",
  "Copay Claim Filed",
];

/** True when the scenario's recipe lists the `copay` module. */
export const isBuyAndBillScenario = (flowType: string): boolean => scenarioHasModule(flowType, "copay");

export function buyAndBillStageEvents(stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  const upTo = (n: number) => stage >= n;
  if (upTo(2)) out.push(ev("RUN_MEDBV", "provider"), ev("ENROLL_COPAY", "provider"), ev("REFERRAL_RECEIVED", "provider"));
  if (upTo(3)) out.push(ev("VERIFY_SMS", "patient"), ev("VERIFY_OTP", "patient"), ev("CONFIRM_CONSENT", "patient"));
  if (upTo(4)) out.push(ev("COMPLETE_BI", "crm"), ev("APPROVE_PA", "crm"));
  if (upTo(5)) out.push(ev("VERIFY_PA_APPROVED_SMS", "patient"), ev("VERIFY_PA_APPROVED_OTP", "patient"));
  if (upTo(6)) out.push(ev("SUBMIT_COPAY_CLAIM", "provider", { dateOfService: new Date().toISOString().slice(0, 10) }));
  return out;
}

// ── Free drug (PAP): eMedBV finds no coverage, so no PA and no copay. ──
// 2 HCP submitted (eMedBV, referral), 3 patient enrolled, 4 BI back with no coverage, 5 application received (update text,
// credit check and income), 6 the CRM agent approves, 7 appointment scheduled, 8 triaged to the site of care (the terminal stage).
export const FREE_DRUG_STAGE_LABELS = [
  "Referral Received",
  "HCP Submitted (eMedBV)",
  "Patient Enrolled",
  "BI Complete (No Coverage)",
  "Application Received",
  "Free Drug Approved (CRM)",
  "Appointment Scheduled",
  "Triage to Site of Care",
];

/** True for the free drug scenario: its recipe lists `financial_assistance` with the `pap` variant. */
export const isFreeDrugScenario = (flowType: string): boolean => scenarioHasModule(flowType, "financial_assistance") && scenarioHasModule(flowType, "benefit_verification");

export function freeDrugStageEvents(stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  const upTo = (n: number) => stage >= n;
  if (upTo(2)) out.push(ev("RUN_MEDBV", "provider"), ev("REFERRAL_RECEIVED", "provider"));
  if (upTo(3)) out.push(ev("VERIFY_SMS", "patient"), ev("VERIFY_OTP", "patient"), ev("CONFIRM_CONSENT", "patient"));
  if (upTo(4)) out.push(ev("COMPLETE_BI", "crm"), ev("SEND_PAP_SMS", "crm"));
  if (upTo(5)) out.push(ev("VERIFY_PAP_SMS", "patient"), ev("VERIFY_PAP_OTP", "patient"), ev("VERIFY_INCOME", "patient", { householdSize: "2", householdIncome: "62000" }));
  if (upTo(6)) out.push(ev("APPROVE_PAP", "crm"), ev("VERIFY_PA_APPROVED_SMS", "patient"), ev("VERIFY_PA_APPROVED_OTP", "patient"));
  if (upTo(7)) {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(9, 0, 0, 0);
    out.push(ev("PATIENT_SELECTS_INFUSION_DATE", "patient", { date: date.toISOString() }));
  }
  if (upTo(8)) {
    out.push(
      ev("SELECT_PHARMACY", "crm", {
        pharmacy: {
          name: KEANU_SITE_OF_CARE_FACTS.facilityName,
          address: KEANU_SITE_OF_CARE_FACTS.address,
          city: KEANU_SITE_OF_CARE_FACTS.city,
          state: KEANU_SITE_OF_CARE_FACTS.state,
          zip: KEANU_SITE_OF_CARE_FACTS.zip,
          phone: KEANU_SITE_OF_CARE_FACTS.contactPhone,
        },
      }),
    );
  }
  return out;
}
