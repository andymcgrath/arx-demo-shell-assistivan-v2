import type { WorkflowData } from "@/engine/types";
import { BRAND } from "@/brand";
import { dateFromToday } from "@/lib/relativeDate";
import { copayBalance } from "@/portals/iassist/data/copayProgram";
import { pspStages } from "../../pspStages";
import type { Stage } from "../types";

/** Financial Assistance. Each variant is a different program: none needed, free goods, copay, free drug. */

const ID = "FA-14276";
const NAME = "Financial Assistance";
const FIELD_LABELS = ["Financial Program", "Effective Date", "Program Approval Date", "Expiration Date", "Program Denial Reason"];
const blankFields = () => FIELD_LABELS.map((label) => ({ label, value: null }));

/** Commercial insurance: the stage is skipped once BI is complete and the PA approved. */
const standard = (d: WorkflowData): Stage =>
  d.biStatus === "complete" && d.paStatus === "approved"
    ? { id: ID, name: NAME, statusLabel: "Not needed", statusDetail: "Commercial Insurance", isComplete: true, isNotStarted: false, fields: blankFields(), lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: ID, name: NAME, statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: blankFields(), lastUpdated: null, lastUpdatedAgo: null };

/** Fax PAP and PrES PAP: the stage tracks the eIncome check the patient completes. */
const pap = (d: WorkflowData): Stage =>
  d.incomeStatus === "verified"
    ? { id: ID, name: NAME, statusLabel: "Complete", statusDetail: "Income verified — PAP approved", isComplete: true, isNotStarted: false, fields: [{ label: "Financial Program", value: "Free Goods (PAP)" }, { label: "Income Verification", value: "Verified" }], lastUpdated: new Date().toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.papSmsSent
    ? { id: ID, name: NAME, statusLabel: "In Progress", statusDetail: "SMS sent — awaiting patient income verification", isComplete: false, isNotStarted: false, fields: [{ label: "Financial Program", value: "Free Goods (PAP)" }, { label: "Income Verification", value: "Pending" }], lastUpdated: new Date().toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: ID, name: NAME, statusLabel: "Stage not started", statusDetail: "Awaiting BI result", isComplete: false, isNotStarted: true, fields: [{ label: "Financial Program", value: null }, { label: "Income Verification", value: null }], lastUpdated: null, lastUpdatedAgo: null };

/** Buy and Bill: the copay the HCP enrolled in iAssist. */
const copay = (d: WorkflowData): Stage => {
  if (!d.copayEnrolled) return { ...standard(d), statusDetail: "Awaiting copay enrollment" };
  const enrolledOn = d.copayEnrolledAt ? new Date(d.copayEnrolledAt) : new Date();
  return {
    id: ID,
    name: NAME,
    statusLabel: "Complete",
    statusDetail: "Copay enrolled by the HCP in iAssist",
    isComplete: true,
    isNotStarted: false,
    fields: [
      { label: "Financial Program", value: `${BRAND.program.name} Copay Program` },
      { label: "Remaining Balance", value: `$${copayBalance(d).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
      { label: "Effective Date", value: enrolledOn.toLocaleDateString() },
      { label: "Program Approval Date", value: enrolledOn.toLocaleDateString() },
      { label: "Expiration Date", value: new Date(enrolledOn.getFullYear(), 11, 31).toLocaleDateString() },
      { label: "Program Denial Reason", value: null },
    ],
    lastUpdated: enrolledOn.toLocaleDateString(),
    lastUpdatedAgo: "today",
  };
};

/** The free drug application: what the patient sent, then the agent's approval. */
const freeDrugFields = (d: WorkflowData) => [
  { label: "Financial Program", value: `${BRAND.program.name} Free Drug Program` },
  { label: "Credit Check Consent", value: d.creditCheckConsented ? "Yes" : null },
  { label: "Household Size", value: d.householdSize ?? null },
  { label: "Annual Household Income", value: d.householdIncome ? `$${Number(d.householdIncome).toLocaleString("en-US")}` : null },
  { label: "Program Denial Reason", value: null },
];

const freeDrug = (d: WorkflowData): Stage =>
  d.papStatus === "active"
    ? { id: ID, name: NAME, statusLabel: "Complete", statusDetail: "Free drug application approved", isComplete: true, isNotStarted: false, fields: freeDrugFields(d), lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.incomeStatus === "verified"
    ? { id: ID, name: NAME, statusLabel: "In Review", statusDetail: "Application received. Review and approve", isComplete: false, isNotStarted: false, fields: freeDrugFields(d), lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.papSmsSent
    ? { id: ID, name: NAME, statusLabel: "In Progress", statusDetail: "Application update sent. Awaiting the patient's credit check consent and income", isComplete: false, isNotStarted: false, fields: [{ label: "Financial Program", value: `${BRAND.program.name} Free Drug Program` }, { label: "Income Verification", value: "Pending" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: ID, name: NAME, statusLabel: "Stage not started", statusDetail: d.biStatus === "complete" ? "Sending the application update" : "Awaiting BI result", isComplete: false, isNotStarted: true, fields: [{ label: "Financial Program", value: null }, { label: "Income Verification", value: null }], lastUpdated: null, lastUpdatedAgo: null };

export const FA_BUILDERS = {
  standard,
  pap,
  copay,
  free_drug: freeDrug,
  /** CoAssist PAP: the income check after the referral to the patient support program. See pspStages.ts. */
  income: (d: WorkflowData): Stage => pspStages(d, BRAND.program.name)[2],
};
