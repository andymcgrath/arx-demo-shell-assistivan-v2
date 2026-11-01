import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";
import { BRAND } from "@/brand";
import { pspStages } from "../../pspStages";
import type { Stage } from "../types";

/**
 * Benefits Investigation. The variants differ in the "not started" line and in what the result says. Opening the stage
 * while BI runs is the machine's reveal (the stage's `signal`), so none of this holds a timer.
 */

const ID = "BI-14273";
const NAME = "Benefits Investigation";

/** The shared shape: not started, running, complete. `completeDetail` is what the result says. */
const bi = (completeDetail: string) => (d: WorkflowData): Stage =>
  d.biStatus === "none"
    ? { id: ID, name: NAME, statusLabel: "Not Started", statusDetail: "Waiting for patient consent", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : d.biStatus === "running"
    ? { id: ID, name: NAME, statusLabel: "Running", statusDetail: "Investigating patient benefits...", isComplete: false, isNotStarted: false, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : { id: ID, name: NAME, statusLabel: "Complete", statusDetail: completeDetail, isComplete: true, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" };

const standard = bi("Patient Has Coverage; Prior Authorization Required");

/** CoAssist DTP and Copay: BI starts at the referral, so "not started" means the eRx has not arrived. */
const coa = (d: WorkflowData): Stage => ({
  id: ID,
  name: NAME,
  statusLabel: d.biStatus === "none" ? "Not Started" : d.biStatus === "running" ? "Running" : "Complete",
  statusDetail: d.biStatus === "none" ? "Awaiting case creation" : d.biStatus === "running" ? "Investigating patient benefits..." : "Complete",
  isComplete: d.biStatus === "complete",
  isNotStarted: d.biStatus === "none",
  fields: [],
  lastUpdated: d.biStatus === "complete" ? new Date().toLocaleDateString() : null,
  lastUpdatedAgo: d.biStatus === "complete" ? "today" : null,
});

/** CoAssist Coverage: the result says which benefit covered. The `bi` fork's exit decides it. */
const coverage = (d: WorkflowData): Stage => ({
  ...coa(d),
  statusDetail:
    d.biStatus === "none"
      ? "Awaiting case creation"
      : d.biStatus === "running"
      ? "Investigating patient benefits..."
      : d.medicalBenefitStatus === "covered"
      ? "Both Benefits Covered — Transferring to Provider"
      : d.pharmacyBenefitStatus === "covered"
      ? "Pharmacy Benefit Covered"
      : "No Coverage Found — Cash Pay Offered",
});

/** The same stage with its result line replaced once BI is complete. */
const withResult = (detail: string) => (d: WorkflowData): Stage =>
  d.biStatus === "complete" ? { ...standard(d), statusDetail: detail } : standard(d);

export const BI_BUILDERS = {
  standard,
  /** Fax PAP and PrES PAP: no insurance is found and the free goods assessment starts. */
  no_insurance: bi("No Insurance Found; Free Goods Assessment Initiated"),
  coa,
  coverage,
  /** Buy and Bill: BI is the medical benefit (eMedBV already ran in iAssist). */
  buy_and_bill: withResult("Medical benefit covered (buy and bill); prior authorization required"),
  free_drug: withResult("No medical coverage found; free drug program"),
  /** CoAssist PAP: the result says whether the case went to the patient support program. See pspStages.ts. */
  psp: (d: WorkflowData): Stage => pspStages(d, BRAND.program.name)[0],
};
