import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";
import type { Stage } from "../types";

/**
 * Provider Transfer and the Cash Offer of the Coverage scenario. Both are shown before BI resolves, as "not started"
 * placeholders, and become "Not needed" for the outcomes that skip them. Opening Provider Transfer when the medical
 * benefit covered is the machine's transfer timer (the stage's `signal`).
 */

const notNeeded = (stage: Pick<Stage, "id" | "name">, statusDetail: string): Stage => ({
  ...stage,
  statusLabel: "Not needed",
  statusDetail,
  isComplete: true,
  isNotStarted: false,
  fields: [],
  lastUpdated: dateFromToday(0).toLocaleDateString(),
  lastUpdatedAgo: "today",
});

const PT = { id: "PT-14282", name: "Provider Transfer" };
const CO = { id: "CO-14281", name: "Cash Offer" };

const transfer = (d: WorkflowData): Stage => {
  const notified = d.providerTransferStatus === "notified";
  return {
    ...PT,
    statusLabel: d.biStatus !== "complete" ? "Stage not started" : notified ? "Complete" : "Ready to Notify",
    statusDetail:
      d.biStatus !== "complete"
        ? "Awaiting Benefits Investigation"
        : notified
        ? "Transferred to Advanced Diabetes Supply for fulfillment"
        : "Medical benefit coverage confirmed — ready to notify Advanced Diabetes Supply",
    isComplete: notified,
    isNotStarted: d.biStatus !== "complete",
    fields: notified ? [{ label: "Provider", value: "Advanced Diabetes Supply" }] : [],
    lastUpdated: notified ? new Date().toLocaleDateString() : null,
    lastUpdatedAgo: notified ? "today" : null,
  };
};

export const TRANSFER_BUILDERS = {
  standard: transfer,
  not_needed: (d: WorkflowData): Stage =>
    notNeeded(
      PT,
      d.pharmacyBenefitStatus === "covered"
        ? "Pharmacy benefit covers this order — no medical-benefit transfer needed"
        : "No medical benefit coverage found — no transfer needed",
    ),
};

const cashOffer = (d: WorkflowData): Stage => ({
  ...CO,
  statusLabel: d.paymentVerified ? "Complete" : d.pricingOption === "self_pay" ? "Payment Pending" : "Stage not started",
  statusDetail: d.paymentVerified
    ? "Payment verified — Complete"
    : d.pricingOption === "self_pay"
    ? "Cash-pay offer accepted — awaiting payment verification"
    : d.biStatus !== "complete"
    ? "Awaiting Benefits Investigation"
    : "No coverage found under either benefit — cash-pay offer available",
  isComplete: d.paymentVerified,
  isNotStarted: d.pricingOption !== "self_pay",
  fields: [
    { label: "Payment Verified", value: d.paymentVerified ? "Yes" : "No" },
    { label: "Ship Date", value: d.patientShipDate ? new Date(d.patientShipDate).toLocaleDateString() : null },
  ],
  lastUpdated: d.paymentVerified || d.patientShipDate ? new Date().toLocaleDateString() : null,
  lastUpdatedAgo: d.paymentVerified || d.patientShipDate ? "today" : null,
});

/** The Cash Offer for the CoAssist DTP and Copay scenarios. `schedulingDone` is when the patient's pick ends scheduling. */
const coaCashOffer = (schedulingDone: (d: WorkflowData) => boolean) => (d: WorkflowData): Stage => {
  const done = schedulingDone(d);
  const approvedAndPicked = d.paStatus === "approved" && d.pricingOption !== null && done;
  return {
    ...CO,
    // Approved-PA path: once the patient has picked a pricing option and scheduled delivery, this stage is done. Retail
    // and Mail Order collect nothing here (charged at the pharmacy counter), and the Copay Program never fires
    // PATIENT_PAYS or VERIFY_PAYMENT, so cashOfferStatus and paymentVerified cannot be the completion signal.
    // The PA-denied path is driven by cashOfferStatus and paymentVerified.
    statusLabel: approvedAndPicked ? "Complete" : d.cashOfferStatus === "none" ? "Stage not started" : d.cashOfferStatus === "sent" ? "Offer Sent" : "Paid",
    statusDetail: approvedAndPicked
      ? d.pricingOption === "self_pay"
        ? "Copay Selected"
        : // Copay's pick never sets pricingOption to "self_pay" (see coaCopay.ts), so copayEnrolled tells "enrolled in Copay,
          // filling via Retail or Mail" apart from a direct Retail or Mail pick.
          d.copayEnrolled
        ? `Copay Selected (${d.pricingOption === "retail" ? "Retail" : "Mail Order"})`
        : "Retail or Mail Order Selected"
      : d.paStatus === "approved"
      ? "Awaiting price selection and scheduling"
      : d.cashOfferStatus === "none"
      ? "Awaiting PA denial"
      : d.cashOfferStatus === "sent"
      ? "Payment link sent to patient"
      : d.paymentVerified
      ? "Payment verified — Complete"
      : "Payment received — pending verification",
    isComplete: approvedAndPicked || d.paymentVerified,
    isNotStarted: d.paStatus === "approved" ? d.pricingOption === null || !done : d.cashOfferStatus === "none",
    fields: [
      { label: "Offer Status", value: d.cashOfferStatus === "none" ? null : d.cashOfferStatus === "sent" ? "Sent" : "Paid" },
      { label: "Payment Verified", value: d.paymentVerified ? "Yes" : "No" },
      { label: "Ship Date", value: d.patientShipDate ? new Date(d.patientShipDate).toLocaleDateString() : null },
    ],
    lastUpdated: d.cashOfferStatus !== "none" || d.patientShipDate ? new Date().toLocaleDateString() : null,
    lastUpdatedAgo: d.cashOfferStatus !== "none" || d.patientShipDate ? "today" : null,
  };
};

export const CASH_OFFER_BUILDERS = {
  /** Coverage with neither benefit covered. */
  coverage: cashOffer,
  coverage_not_needed: (d: WorkflowData): Stage =>
    notNeeded(
      CO,
      d.medicalBenefitStatus === "covered"
        ? "Both benefits covered — no cash-pay offer needed"
        : "Pharmacy benefit covers this order — no cash-pay offer needed",
    ),
  /** DTP: scheduling ends with the ship date. */
  coa: coaCashOffer((d) => d.patientShipDate !== null),
  /** Copay: Retail and Mail Order skip ship-date collection, so the pick alone ends scheduling. */
  coa_copay: coaCashOffer((d) => d.pricingOption === "retail" || d.pricingOption === "mail_order" || d.patientShipDate !== null),
};

/** The placeholders the Coverage outcomes that hand fulfillment to the provider show for Triage and Pharmacy Status. */
export const TRANSFER_NOT_NEEDED_DETAIL = "Case transferred to Advanced Diabetes Supply — fulfillment handled outside AssistRx's pipeline";
export { notNeeded };
