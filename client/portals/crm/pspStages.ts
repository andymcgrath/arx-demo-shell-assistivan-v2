/**
 * pspStages.ts: the CRM stages a scenario with the `pap_transfer` module shows between enrollment and triage: the
 * Benefits Investigation result, the referral to the patient support program (PSP), and the income check. Pure: the
 * page passes in the data and the program name. The page picks this list with `scenarioHasModule`, never the flow id.
 *
 * The page's own `Stage` type is not exported, so `PspStage` repeats its shape. TypeScript checks it where the page
 * spreads these into its list.
 */
import type { WorkflowData } from "@/engine/types";

export interface PspStage {
  id: string;
  name: string;
  statusLabel: string;
  statusDetail: string;
  isComplete: boolean;
  isNotStarted: boolean;
  fields: { label: string; value: string | null }[];
  lastUpdated: string | null;
  lastUpdatedAgo: string | null;
}

const today = () => new Date().toLocaleDateString();

/** What the BI result says, from the `bi` fork choice the story or the demo made. */
function biOutcomeDetail(choices: WorkflowData["choices"]): string {
  return choices.bi === "no_coverage_pap"
    ? "No Coverage Found; Referred to the Patient Support Program"
    : "No Coverage Found";
}

export function pspStages(d: WorkflowData, programName: string): PspStage[] {
  const biDone = d.biStatus === "complete";
  const referred = d.papTransferStatus === "referred";
  const transferred = d.papTransferSmsVerified;
  const incomeVerified = d.incomeStatus === "verified";

  const bi: PspStage = {
    id: "BI-14273",
    name: "Benefits Investigation",
    statusLabel: d.biStatus === "none" ? "Not Started" : biDone ? "Complete" : "Running",
    statusDetail: d.biStatus === "none" ? "Awaiting case creation" : biDone ? biOutcomeDetail(d.choices) : "Investigating patient benefits...",
    isComplete: biDone,
    isNotStarted: d.biStatus === "none",
    fields: [],
    lastUpdated: biDone ? today() : null,
    lastUpdatedAgo: biDone ? "today" : null,
  };

  const referral: PspStage = {
    id: "PSP-14283",
    name: "Patient Support Program Referral",
    statusLabel: transferred ? "Complete" : referred ? "Referred" : "Stage not started",
    statusDetail: transferred
      ? `Patient confirmed the transfer to ${programName}`
      : referred
      ? `Referred to ${programName}; awaiting the patient's confirmation`
      : biDone
      ? "Referring the case"
      : "Awaiting Benefits Investigation",
    isComplete: transferred,
    isNotStarted: !referred,
    fields: [{ label: "Program", value: referred ? programName : null }],
    lastUpdated: referred ? today() : null,
    lastUpdatedAgo: referred ? "today" : null,
  };

  const income: PspStage = {
    id: "FA-14276",
    name: "Income Verification",
    statusLabel: incomeVerified ? "Complete" : d.incomeStatus === "pending" ? "In Progress" : "Stage not started",
    statusDetail: incomeVerified
      ? "Income verified; free drug program active"
      : d.incomeStatus === "pending"
      ? "Awaiting the patient's income form"
      : "Awaiting the patient support program referral",
    isComplete: incomeVerified,
    isNotStarted: d.incomeStatus === "none",
    fields: [{ label: "Income Verification", value: incomeVerified ? "Verified" : d.incomeStatus === "pending" ? "Pending" : null }],
    lastUpdated: d.incomeStatus !== "none" ? today() : null,
    lastUpdatedAgo: d.incomeStatus !== "none" ? "today" : null,
  };

  return [bi, referral, income];
}
