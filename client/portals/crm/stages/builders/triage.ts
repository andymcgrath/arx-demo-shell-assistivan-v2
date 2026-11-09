import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";
import type { Stage } from "../types";
import { patientFirstNameFor } from "../../patientFacts";
import { TRANSFER_NOT_NEEDED_DETAIL, notNeeded } from "./coverage";

/** Triage to Pharmacy. The variants are the ways a scenario dispenses: a pharmacy chain, a site of care, or outside AssistRx. */

const ID = "TP-14277";
const NAME = "Triage to Pharmacy";
const today = () => dateFromToday(0).toLocaleDateString();

const pending = (statusDetail: string): Stage =>
  ({ id: ID, name: NAME, statusLabel: "Pending", statusDetail, isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null });

const pharmacyField = (d: WorkflowData) => d.selectedPharmacy?.name || null;

/** The full pipeline: pharmacy picked, dispatched, first dispense processed, ready, shipped. */
const standard = (d: WorkflowData): Stage =>
  d.dispatchStatus === "pending_selection" || d.dispatchStatus === "none"
    ? pending("Awaiting pharmacy selection")
    : d.dispatchStatus === "selected"
    ? { id: ID, name: NAME, statusLabel: "In Progress", statusDetail: "Pharmacy selected — awaiting dispatch", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: pharmacyField(d) }, { label: "Status", value: "Pharmacy Selected" }], lastUpdated: today(), lastUpdatedAgo: "today" }
    : d.pharmacyStatus === "processing"
    ? { id: ID, name: NAME, statusLabel: "In Progress", statusDetail: "First dispense processing", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: pharmacyField(d) }, { label: "First Dispense", value: "Initiated" }], lastUpdated: today(), lastUpdatedAgo: "today" }
    : d.pharmacyStatus === "ready"
    ? { id: ID, name: NAME, statusLabel: "In Progress", statusDetail: "Ready for delivery", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: pharmacyField(d) }, { label: "First Dispense", value: "Ready" }], lastUpdated: today(), lastUpdatedAgo: "today" }
    : { id: ID, name: NAME, statusLabel: "Complete", statusDetail: "First dispense shipped", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy", value: pharmacyField(d) }, { label: "First Dispense", value: "Shipped" }], lastUpdated: today(), lastUpdatedAgo: "today" };

/**
 * The prescriber picked the pharmacy on the eRx, so the stage opens with it filled in. It waits for the PA, then for the
 * patient to schedule, then the agent dispatches. After dispatch it follows the standard pipeline.
 */
const prescriber = (d: WorkflowData): Stage => {
  const waiting = (detail: string, status: string): Stage =>
    ({ id: ID, name: NAME, statusLabel: "In Progress", statusDetail: detail, isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: pharmacyField(d) }, { label: "Status", value: status }], lastUpdated: today(), lastUpdatedAgo: "today" });
  if (d.dispatchStatus === "none") return pending(d.paStatus === "approved" ? "PA approved — awaiting the patient's confirmation" : "Awaiting PA approval");
  if (d.dispatchStatus === "pending_selection") return waiting("Pharmacy from the eRx — awaiting the patient's delivery address and date", "Pharmacy From eRx");
  if (d.dispatchStatus === "selected") return d.patientShipDate === null ? waiting("Pharmacy from the eRx — awaiting the patient's delivery date", "Pharmacy From eRx") : waiting("Delivery scheduled — ready to dispatch", "Ready to Dispatch");
  return standard(d);
};

/**
 * The drug goes to a site of care, not a pharmacy shipment. This is the scenario's last step: it completes the moment a
 * site of care is picked, with no Rx Processing, Shipped or Delivered chain to wait on.
 */
const siteOfCare = (pendingDetail: (d: WorkflowData) => string, name = NAME) => (d: WorkflowData): Stage =>
  d.dispatchStatus === "pending_selection" || d.dispatchStatus === "none"
    ? { ...pending(pendingDetail(d)), name }
    : { id: ID, name, statusLabel: "Complete", statusDetail: `Dispatched to site of care — ${patientFirstNameFor(d.flowType)} to facility`, isComplete: true, isNotStarted: false, fields: [{ label: "Site of Care", value: pharmacyField(d) }, { label: "Dispense Method", value: `${patientFirstNameFor(d.flowType)} to Facility` }], lastUpdated: today(), lastUpdatedAgo: "today" };

/**
 * Filled outside AssistRx's own pipeline: Copay retail and mail order, and Coverage scenario 1. Retail jumps straight
 * from "none" to "dispatched". Mail order still passes through "selected" on the address step. Either way the stage
 * completes at "dispatched", with no Pharmacy Status stage left to advance it further.
 */
const dispatchedOutside = (d: WorkflowData): Stage =>
  !d.selectedPharmacy
    ? pending("Awaiting pharmacy selection")
    : d.dispatchStatus !== "dispatched"
    ? { id: ID, name: NAME, statusLabel: "In Progress", statusDetail: "Pharmacy selected — awaiting dispatch", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: pharmacyField(d) }, { label: "Status", value: "Pharmacy Selected" }], lastUpdated: today(), lastUpdatedAgo: "today" }
    : { id: ID, name: NAME, statusLabel: "Complete", statusDetail: d.pricingOption === "retail" ? "Dispatched to retail pharmacy — filled outside AssistRx" : "Dispatched via Mail Order — filled outside AssistRx", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy", value: pharmacyField(d) }, { label: "Status", value: "Dispatched" }], lastUpdated: today(), lastUpdatedAgo: "today" };

export const TRIAGE_BUILDERS = {
  standard,
  prescriber,
  site_of_care: siteOfCare(() => "Awaiting site of care selection"),
  /** Free drug: the same, but the patient's appointment date comes first, and the stage is renamed. */
  free_drug: siteOfCare((d) => (d.infusionDate === null ? "Awaiting the patient's appointment date" : "Awaiting site of care selection"), "Triage to Site of Care"),
  dispatched_outside: dispatchedOutside,
  /** Coverage with the medical benefit covered: fulfillment goes to the provider. */
  transfer_not_needed: (): Stage => notNeeded({ id: ID, name: NAME }, TRANSFER_NOT_NEEDED_DETAIL),
};
