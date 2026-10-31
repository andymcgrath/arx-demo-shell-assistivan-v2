import type { WorkflowData } from "@/engine/types";
import { scenarioHasModule } from "@/workflows/scenarios";
import { BRAND } from "@/brand";
import { dateFromToday, daysFromToday } from "@/lib/relativeDate";
import { copayBalance } from "@/portals/iassist/data/copayProgram";
import { pspStages } from "../pspStages";
import type { Stage } from "./types";
import { STAGES, STAGES_PAP_AUDIT } from "./stageData";
import { crmFlags } from "./flags";

/**
 * buildStages.ts: the stages the CRM shows in the Stage Quick View and the stage tabs, from the workflow data.
 * Pure: no React, no store, so the stage-list test (engine/__tests__/crm.stages.test.ts) runs it headless. Flags come from crmFlags (flags.ts).
 */

export function buildCrmStages(workflowData: WorkflowData): Stage[] {
  const flowType = workflowData.flowType;
  const consentStatus = workflowData.consentStatus;
  const biStatus = workflowData.biStatus;
  const paStatus = workflowData.paStatus;
  const appealStatus = workflowData.appealStatus;
  const papStatus = workflowData.papStatus;
  const papSmsSent = workflowData.papSmsSent;
  const incomeStatus = workflowData.incomeStatus;
  const dispatchStatus = workflowData.dispatchStatus;
  const pharmacyStatus = workflowData.pharmacyStatus;
  const selectedPharmacy = workflowData.selectedPharmacy;
  const cashOfferStatus = workflowData.cashOfferStatus;
  const paymentVerified = workflowData.paymentVerified;
  const patientShipDate = workflowData.patientShipDate;
  const pricingOption = workflowData.pricingOption;
  const copayEnrolled = workflowData.copayEnrolled;
  const providerTransferStatus = workflowData.providerTransferStatus;
  const pharmacyBenefitStatus = workflowData.pharmacyBenefitStatus;
  const medicalBenefitStatus = workflowData.medicalBenefitStatus;
  const {
    isPapFlow, isCoaFlow, isCoverageFlow, isIAssistFlow, isIAssistPapFlow, isFreeDrug,
    isBuyAndBill, isCopayRetailFlow, isCoverageRetailFlow, schedulingDone,
  } = crmFlags(workflowData);

  const paStage: Stage =
    paStatus === "none" && biStatus === "complete" && !isPapFlow
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Letter sent", statusDetail: "HCP letter mailed for Prior Authorization", isComplete: false, isNotStarted: false, fields: [], lastUpdated: new Date().toLocaleDateString(), lastUpdatedAgo: "just now" }
      : paStatus === "none"
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
      : paStatus === "submitted"
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Submitted", statusDetail: "Awaiting Approval", isComplete: false, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
      : paStatus === "approved"
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Complete", statusDetail: "PA Approved", isComplete: true, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
      : { id: "PA-14274", name: "Prior Authorization", statusLabel: "Denied", statusDetail: "PA Denied — Appeal initiated", isComplete: false, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" };

  const eaStage: Stage = consentStatus !== "confirmed"
    ? { id: "EA-14272", name: "Enrollment Assistance", statusLabel: "Pending", statusDetail: isIAssistFlow ? "Welcome message sent" : (isCoaFlow || isCoverageFlow) ? "SMS sent — awaiting patient consent" : "Awaiting patient consent", isComplete: false, isNotStarted: false, fields: [], lastUpdated: dateFromToday(-4).toLocaleDateString(), lastUpdatedAgo: "4 days ago" }
    : { id: "EA-14272", name: "Enrollment Assistance", statusLabel: "Complete", statusDetail: "Enrollment Completed", isComplete: true, isNotStarted: false, fields: [], lastUpdated: dateFromToday(-4).toLocaleDateString(), lastUpdatedAgo: "4 days ago" };

  const biCompleteDetail = isPapFlow
    ? "No Insurance Found; Free Goods Assessment Initiated"
    : "Patient Has Coverage; Prior Authorization Required";

  // CoA_DTP/CoA_Copay no longer wait on consent to start BI (the machine starts it
  // at the referral, workflows/coassist/rules.ts) — biStatus === "none" now only
  // describes the sliver of time before the eRx itself has been sent, not
  // before consent, so the copy needs to say so. Every other flow keeps the
  // original consent-gated wording.
  const biStage: Stage = biStatus === "none"
    ? { id: "BI-14273", name: "Benefits Investigation", statusLabel: "Not Started", statusDetail: isCoaFlow ? "Awaiting eRx" : "Waiting for patient consent", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : biStatus === "running"
    ? { id: "BI-14273", name: "Benefits Investigation", statusLabel: "Running", statusDetail: "Investigating patient benefits...", isComplete: false, isNotStarted: false, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : { id: "BI-14273", name: "Benefits Investigation", statusLabel: "Complete", statusDetail: biCompleteDetail, isComplete: true, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" };

  const papStage: Stage = papStatus === "none"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Pending", statusDetail: "Awaiting income verification", isComplete: false, isNotStarted: true, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: null }], lastUpdated: null, lastUpdatedAgo: null }
    : papStatus === "active"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Complete", statusDetail: "Patient enrolled — Free Goods approved", isComplete: true, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: "Verified" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : papStatus === "audit_pending"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Audit Pending", statusDetail: "Insurance audit initiated", isComplete: false, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: "Verified" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Discontinued", statusDetail: "Patient has insurance — PAP discontinued", isComplete: false, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" };

  // iAssist_PAP (WF5) dispenses "Keanu to facility" — a site of care, not a
  // pharmacy shipment — so this stage is this flow's FINAL step (see
  // engine/WorkflowEngine.ts's derivePatientRoute and DemoShell.tsx's
  // 6-step WF5 stepper). It completes the moment a site of care is picked;
  // there's no separate Rx Processing/Shipped/Delivered chain to wait on.
  const tpStage: Stage = isIAssistPapFlow
    ? (dispatchStatus === "pending_selection" || dispatchStatus === "none"
      ? { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "Pending", statusDetail: isFreeDrug && workflowData.infusionDate === null ? "Awaiting the patient's appointment date" : "Awaiting site of care selection", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
      : { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "Complete", statusDetail: "Dispatched to site of care — Keanu to facility", isComplete: true, isNotStarted: false, fields: [{ label: "Site of Care", value: selectedPharmacy?.name || null }, { label: "Dispense Method", value: "Keanu to Facility" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" })
    // CoA_Copay Retail/Mail Order, and now CoA_Coverage Scenario 1 too
    // (isCoverageRetailFlow — see that flag's own comment above) — see
    // isCopayRetailFlow above. Keyed off selectedPharmacy/dispatchStatus ===
    // "dispatched" rather than dispatchStatus === "selected" like the
    // generic branch below does. Retail (CoA_Copay and CoA_Coverage alike) jumps
    // straight from "none" to "dispatched" (address collection is skipped
    // entirely — see PharmacySelection.tsx/NetworkPharmacySelection.tsx);
    // CoA_Copay's Mail Order still passes through "selected" via
    // PATIENT_SETS_ADDRESS on /delivery-address (see DeliveryAddress.tsx —
    // that step stays for Mail Order, only /delivery-date is skipped; CoA_Coverage
    // has no Mail Order option at all). Either way this completes the
    // moment dispatchStatus hits "dispatched," rather than waiting on
    // pharmacyStatus to reach "shipped" like the generic branch does —
    // there's no Pharmacy Status stage left to advance it that far, since
    // fulfillment happens outside AssistRx's own pipeline either way.
    : (isCopayRetailFlow || isCoverageRetailFlow)
    ? (!selectedPharmacy
      ? { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "Pending", statusDetail: "Awaiting pharmacy selection", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
      : dispatchStatus !== "dispatched"
      ? { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "In Progress", statusDetail: "Pharmacy selected — awaiting dispatch", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "Status", value: "Pharmacy Selected" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
      : { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "Complete", statusDetail: pricingOption === "retail" ? "Dispatched to retail pharmacy — filled outside AssistRx" : "Dispatched via Mail Order — filled outside AssistRx", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "Status", value: "Dispatched" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" })
    : dispatchStatus === "pending_selection" || dispatchStatus === "none"
    ? { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "Pending", statusDetail: "Awaiting pharmacy selection", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : dispatchStatus === "selected"
    ? { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "In Progress", statusDetail: "Pharmacy selected — awaiting dispatch", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "Status", value: "Pharmacy Selected" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : pharmacyStatus === "processing"
    ? { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "In Progress", statusDetail: "First dispense processing", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "First Dispense", value: "Initiated" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : pharmacyStatus === "ready"
    ? { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "In Progress", statusDetail: "Ready for delivery", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "First Dispense", value: "Ready" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: "TP-14277", name: "Triage to Pharmacy", statusLabel: "Complete", statusDetail: "First dispense shipped", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "First Dispense", value: "Shipped" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" };

  const psStage: Stage = pharmacyStatus === "shipped"
    ? { id: "PS-14278", name: "Pharmacy Status", statusLabel: "In Transit", statusDetail: "First dispense shipped — in transit to patient", isComplete: false, isNotStarted: false, fields: [{ label: "Carrier", value: "FedEx" }, { label: "Tracking #", value: "775899987245" }, { label: "Est. Delivery", value: daysFromToday(7) }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : pharmacyStatus === "delivered"
    ? { id: "PS-14278", name: "Pharmacy Status", statusLabel: "Complete", statusDetail: "First dispense delivered", isComplete: true, isNotStarted: false, fields: [{ label: "Carrier", value: "FedEx" }, { label: "Tracking #", value: "775899987245" }, { label: "Delivered", value: daysFromToday(0) }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: "PS-14278", name: "Pharmacy Status", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null };

  // iAssist_PAP (WF5) is the one flow that actually files a real Appeal
  // (appealStatus flips 'initiated' via INITIATE_APPEAL, then 'approved' via
  // APPROVE_APPEAL once the agent opens this stage's tab — see
  // workflows/iassist/rules.ts). Every other flow leaves appealStatus at 'none'
  // forever, so this only ever shows "Filed"/"Approved" for WF5, matching
  // paStage's existing "PA Denied — Appeal initiated" copy for the first
  // time instead of contradicting it.
  const appealStage: Stage = paStatus === "approved"
    ? { id: "A-14275", name: "Appeals", statusLabel: "Not needed", statusDetail: "PA Approved", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy Notes", value: null }, { label: "Shipment Date", value: null }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : appealStatus === "approved"
    ? { id: "A-14275", name: "Appeals", statusLabel: "Approved", statusDetail: "Appeal approved — payer overturned the denial", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy Notes", value: null }, { label: "Shipment Date", value: null }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : appealStatus === "initiated"
    ? { id: "A-14275", name: "Appeals", statusLabel: "Filed", statusDetail: "Appeal submitted — awaiting payer response", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy Notes", value: null }, { label: "Shipment Date", value: null }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: "A-14275", name: "Appeals", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [{ label: "Pharmacy Notes", value: null }, { label: "Shipment Date", value: null }], lastUpdated: null, lastUpdatedAgo: null };

  // For the PAP flow, Financial Assistance tracks the FA eIncome check
  // itself (IncomeQualification.tsx) rather than WF1's "not needed —
  // commercial insurance" shortcut.
  const faStage: Stage = isPapFlow
    ? incomeStatus === "verified"
      ? { id: "FA-14276", name: "Financial Assistance", statusLabel: "Complete", statusDetail: "Income verified — PAP approved", isComplete: true, isNotStarted: false, fields: [{ label: "Financial Program", value: "Free Goods (PAP)" }, { label: "Income Verification", value: "Verified" }], lastUpdated: new Date().toLocaleDateString(), lastUpdatedAgo: "today" }
      : papSmsSent
      ? { id: "FA-14276", name: "Financial Assistance", statusLabel: "In Progress", statusDetail: "SMS sent — awaiting patient income verification", isComplete: false, isNotStarted: false, fields: [{ label: "Financial Program", value: "Free Goods (PAP)" }, { label: "Income Verification", value: "Pending" }], lastUpdated: new Date().toLocaleDateString(), lastUpdatedAgo: "today" }
      : { id: "FA-14276", name: "Financial Assistance", statusLabel: "Stage not started", statusDetail: "Awaiting BI result", isComplete: false, isNotStarted: true, fields: [{ label: "Financial Program", value: null }, { label: "Income Verification", value: null }], lastUpdated: null, lastUpdatedAgo: null }
    : biStatus === "complete" && paStatus === "approved"
    ? { id: "FA-14276", name: "Financial Assistance", statusLabel: "Not needed", statusDetail: "Commercial Insurance", isComplete: true, isNotStarted: false, fields: [{ label: "Financial Program", value: null }, { label: "Effective Date", value: null }, { label: "Program Approval Date", value: null }, { label: "Expiration Date", value: null }, { label: "Program Denial Reason", value: null }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: "FA-14276", name: "Financial Assistance", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [{ label: "Financial Program", value: null }, { label: "Effective Date", value: null }, { label: "Program Approval Date", value: null }, { label: "Expiration Date", value: null }, { label: "Program Denial Reason", value: null }], lastUpdated: null, lastUpdatedAgo: null };

  // CoA_Coverage's Benefits Investigation stage's own outcome-aware statusDetail —
  // used both by the inline BI stage below and (via biStage further down)
  // nowhere else, since isCoverageFlow never reads the shared biStage constant.
  const coverageBiOutcomeDetail = medicalBenefitStatus === "covered"
    ? "Both Benefits Covered — Transferring to Provider"
    : pharmacyBenefitStatus === "covered"
    ? "Pharmacy Benefit Covered"
    : "No Coverage Found — Cash Pay Offered";

  // Buy and Bill. BI is the medical benefit (eMedBV already ran in iAssist). Financial Assistance is the copay the HCP
  // enrolled there. Appeals are skipped because the PA is approved, and nothing triages or ships.
  const copayEnrolledOn = workflowData.copayEnrolledAt ? new Date(workflowData.copayEnrolledAt) : new Date();
  const copayYear = copayEnrolledOn.getFullYear();
  const buyAndBillStages: Stage[] = [
    eaStage,
    biStatus === "complete"
      ? { ...biStage, statusDetail: "Medical benefit covered (buy and bill); prior authorization required" }
      : biStage,
    paStage,
    copayEnrolled
      ? {
          id: "FA-14276",
          name: "Financial Assistance",
          statusLabel: "Complete",
          statusDetail: "Copay enrolled by the HCP in iAssist",
          isComplete: true,
          isNotStarted: false,
          fields: [
            { label: "Financial Program", value: `${BRAND.program.name} Copay Program` },
            { label: "Remaining Balance", value: `$${copayBalance(workflowData).toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
            { label: "Effective Date", value: copayEnrolledOn.toLocaleDateString() },
            { label: "Program Approval Date", value: copayEnrolledOn.toLocaleDateString() },
            { label: "Expiration Date", value: new Date(copayYear, 11, 31).toLocaleDateString() },
            { label: "Program Denial Reason", value: null },
          ],
          lastUpdated: copayEnrolledOn.toLocaleDateString(),
          lastUpdatedAgo: "today",
        }
      : { ...faStage, statusDetail: "Awaiting copay enrollment" },
  ];

  // Free drug (PAP). eMedBV found no coverage, so there is no PA and no copay. Financial Assistance is the application the
  // patient completes. Approval triages the drug to the site of care, and the last stage is the order status.
  const papApproved = workflowData.papStatus === "active";
  const freeDrugStages: Stage[] = [
    eaStage,
    biStatus === "complete" ? { ...biStage, statusDetail: "No medical coverage found; free drug program" } : biStage,
    papApproved
      ? {
          id: "FA-14276",
          name: "Financial Assistance",
          statusLabel: "Complete",
          statusDetail: "Free drug application approved",
          isComplete: true,
          isNotStarted: false,
          fields: [
            { label: "Financial Program", value: `${BRAND.program.name} Free Drug Program` },
            { label: "Credit Check Consent", value: workflowData.creditCheckConsented ? "Yes" : null },
            { label: "Household Size", value: workflowData.householdSize ?? null },
            { label: "Annual Household Income", value: workflowData.householdIncome ? `$${Number(workflowData.householdIncome).toLocaleString("en-US")}` : null },
            { label: "Program Denial Reason", value: null },
          ],
          lastUpdated: dateFromToday(0).toLocaleDateString(),
          lastUpdatedAgo: "today",
        }
      : workflowData.incomeStatus === "verified"
      ? {
          id: "FA-14276",
          name: "Financial Assistance",
          statusLabel: "In Review",
          statusDetail: "Application received. Review and approve",
          isComplete: false,
          isNotStarted: false,
          fields: [
            { label: "Financial Program", value: `${BRAND.program.name} Free Drug Program` },
            { label: "Credit Check Consent", value: workflowData.creditCheckConsented ? "Yes" : null },
            { label: "Household Size", value: workflowData.householdSize ?? null },
            { label: "Annual Household Income", value: workflowData.householdIncome ? `$${Number(workflowData.householdIncome).toLocaleString("en-US")}` : null },
            { label: "Program Denial Reason", value: null },
          ],
          lastUpdated: dateFromToday(0).toLocaleDateString(),
          lastUpdatedAgo: "today",
        }
      : papSmsSent
      ? { id: "FA-14276", name: "Financial Assistance", statusLabel: "In Progress", statusDetail: "Application update sent. Awaiting the patient's credit check consent and income", isComplete: false, isNotStarted: false, fields: [{ label: "Financial Program", value: `${BRAND.program.name} Free Drug Program` }, { label: "Income Verification", value: "Pending" }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
      : { id: "FA-14276", name: "Financial Assistance", statusLabel: "Stage not started", statusDetail: biStatus === "complete" ? "Sending the application update" : "Awaiting BI result", isComplete: false, isNotStarted: true, fields: [{ label: "Financial Program", value: null }, { label: "Income Verification", value: null }], lastUpdated: null, lastUpdatedAgo: null },
    { ...tpStage, name: "Triage to Site of Care" },
    { ...psStage, name: "Order Status" },
  ];

  const STAGES_LIVE: Stage[] = isFreeDrug
    ? freeDrugStages
    : scenarioHasModule(flowType, "pap_transfer")
    ? [eaStage, ...pspStages(workflowData, BRAND.program.name), tpStage, psStage]
    : isBuyAndBill
    ? buyAndBillStages
    : isCoverageFlow
    ? [
        // Same "active, waiting on something automatic" treatment as
        // isCoaFlow's eaStage below — SMS/consent is sent automatically for
        // this flow too.
        eaStage,
        {
          id: "BI-14273",
          name: "Benefits Investigation",
          statusLabel: biStatus === "none" ? "Not Started" : biStatus === "running" ? "Running" : "Complete",
          statusDetail: biStatus === "none" ? "Awaiting case creation" : biStatus === "running" ? "Investigating patient benefits..." : coverageBiOutcomeDetail,
          isComplete: biStatus === "complete",
          isNotStarted: biStatus === "none",
          fields: [],
          lastUpdated: biStatus === "complete" ? new Date().toLocaleDateString() : null,
          lastUpdatedAgo: biStatus === "complete" ? "today" : null,
        },
        // Outcome-specific stages below — computed once as plain Stage
        // objects so they can also be shown as "not started" placeholders
        // BEFORE BI resolves (matching isCoaFlow's own Quick View, which
        // always shows its full PA/Cash Offer/Dispatch/Pharmacy Status set
        // rather than growing the list only once each stage actually
        // starts).
        ...(() => {
          const coverageTransferStage: Stage = {
            id: "PT-14282",
            name: "Provider Transfer",
            statusLabel: biStatus !== "complete" ? "Stage not started" : providerTransferStatus === "notified" ? "Complete" : "Ready to Notify",
            statusDetail: biStatus !== "complete" ? "Awaiting Benefits Investigation" : providerTransferStatus === "notified" ? "Transferred to Advanced Diabetes Supply for fulfillment" : "Medical benefit coverage confirmed — ready to notify Advanced Diabetes Supply",
            isComplete: providerTransferStatus === "notified",
            isNotStarted: biStatus !== "complete",
            fields: providerTransferStatus === "notified" ? [{ label: "Provider", value: "Advanced Diabetes Supply" }] : [],
            lastUpdated: providerTransferStatus === "notified" ? new Date().toLocaleDateString() : null,
            lastUpdatedAgo: providerTransferStatus === "notified" ? "today" : null,
          };
          const coverageCashOfferStage: Stage = {
            id: "CO-14281",
            name: "Cash Offer",
            statusLabel: paymentVerified ? "Complete" : pricingOption === "self_pay" ? "Payment Pending" : "Stage not started",
            statusDetail: paymentVerified ? "Payment verified — Complete" : pricingOption === "self_pay" ? "Cash-pay offer accepted — awaiting payment verification" : biStatus !== "complete" ? "Awaiting Benefits Investigation" : "No coverage found under either benefit — cash-pay offer available",
            isComplete: paymentVerified,
            isNotStarted: pricingOption !== "self_pay",
            fields: [
              { label: "Payment Verified", value: paymentVerified ? "Yes" : "No" },
              { label: "Ship Date", value: patientShipDate ? new Date(patientShipDate).toLocaleDateString() : null },
            ],
            lastUpdated: paymentVerified || patientShipDate ? new Date().toLocaleDateString() : null,
            lastUpdatedAgo: paymentVerified || patientShipDate ? "today" : null,
          };
          // Outcome not known yet — show every possible downstream stage as
          // a "not started" placeholder (tpStage/psStage already render
          // correctly as not-started, since dispatchStatus/pharmacyStatus
          // are still "none" at this point; paStage's own logic does too,
          // since paStatus is still "none" here) instead of just BI alone.
          if (biStatus !== "complete") return [paStage, coverageTransferStage, coverageCashOfferStage, tpStage, psStage];

          // Every outcome keeps the full 4-stage set visible — the ones
          // that don't apply to the resolved scenario get the same "Not
          // needed" treatment the standard flow already uses for skipped
          // stages (see appealStage/faStage above: blue icon, isComplete
          // true, a specific reason instead of just disappearing).
          const coverageTransferNotNeeded: Stage = {
            ...coverageTransferStage,
            statusLabel: "Not needed",
            statusDetail: pharmacyBenefitStatus === "covered"
              ? "Pharmacy benefit covers this order — no medical-benefit transfer needed"
              : "No medical benefit coverage found — no transfer needed",
            isComplete: true,
            isNotStarted: false,
            fields: [],
            lastUpdated: dateFromToday(0).toLocaleDateString(),
            lastUpdatedAgo: "today",
          };
          const coverageCashOfferNotNeeded: Stage = {
            ...coverageCashOfferStage,
            statusLabel: "Not needed",
            statusDetail: medicalBenefitStatus === "covered"
              ? "Both benefits covered — no cash-pay offer needed"
              : "Pharmacy benefit covers this order — no cash-pay offer needed",
            isComplete: true,
            isNotStarted: false,
            fields: [],
            lastUpdated: dateFromToday(0).toLocaleDateString(),
            lastUpdatedAgo: "today",
          };
          // Scenarios 2/3 only — Scenario 1 is the only Coverage outcome that
          // ever submits a real PA (see paStage below and this component's
          // own isCoverageFlow-scoped SUBMIT_PA effect above); paStatus stays
          // "none" forever for these two, so paStage's own logic would
          // wrongly show "Letter sent" once biStatus is complete. Same "Not
          // needed" treatment as coverageTransferNotNeeded/coverageCashOfferNotNeeded
          // above, not just omitting the card.
          const paNotNeeded: Stage = {
            id: "PA-14274",
            name: "Prior Authorization",
            statusLabel: "Not needed",
            statusDetail: medicalBenefitStatus === "covered"
              ? "Both benefits covered — no Prior Authorization needed"
              : "No coverage found under either benefit — no Prior Authorization needed",
            isComplete: true,
            isNotStarted: false,
            fields: [],
            lastUpdated: dateFromToday(0).toLocaleDateString(),
            lastUpdatedAgo: "today",
          };
          // Scenario 2 only — medical-benefit transfer hands fulfillment to
          // Advanced Diabetes Supply entirely, so neither stage is ever
          // reached through AssistRx's own pipeline.
          const tpNotNeededTransfer: Stage = {
            id: "TP-14277",
            name: "Triage to Pharmacy",
            statusLabel: "Not needed",
            statusDetail: "Case transferred to Advanced Diabetes Supply — fulfillment handled outside AssistRx's pipeline",
            isComplete: true,
            isNotStarted: false,
            fields: [],
            lastUpdated: dateFromToday(0).toLocaleDateString(),
            lastUpdatedAgo: "today",
          };
          const psNotNeededTransfer: Stage = {
            id: "PS-14278",
            name: "Pharmacy Status",
            statusLabel: "Not needed",
            statusDetail: "Case transferred to Advanced Diabetes Supply — fulfillment handled outside AssistRx's pipeline",
            isComplete: true,
            isNotStarted: false,
            fields: [],
            lastUpdated: dateFromToday(0).toLocaleDateString(),
            lastUpdatedAgo: "today",
          };
          // Scenario 1 only — same isCoverageRetailFlow reasoning as tpStage's
          // own "filled outside AssistRx" copy above, just for the stage
          // that's dropped entirely rather than reworded.
          const psNotNeededRetail: Stage = {
            id: "PS-14278",
            name: "Pharmacy Status",
            statusLabel: "Not needed",
            statusDetail: "Filled directly at the patient's selected retail pharmacy — no separate Pharmacy Status tracking",
            isComplete: true,
            isNotStarted: false,
            fields: [],
            lastUpdated: dateFromToday(0).toLocaleDateString(),
            lastUpdatedAgo: "today",
          };

          // Scenario 2 — medical covered (always wins): only the provider
          // transfer really happens. No PA stage, no cash-offer stage, no
          // dispense tail — see workflows/coassist/.
          if (medicalBenefitStatus === "covered") return [paNotNeeded, coverageTransferStage, coverageCashOfferNotNeeded, tpNotNeededTransfer, psNotNeededTransfer];

          // Scenario 1 — pharmacy covered, medical not. This outcome now
          // requires a real Prior Authorization (paStage — reused as-is from
          // isCoaFlow, since isPapFlow is false for Coverage), submitted
          // automatically by this component's own isCoverageFlow-scoped SUBMIT_PA
          // effect above and auto-approved by PA-14274's existing tab-open
          // effect — replaces this scenario's old automatic single
          // tap-through SMS entirely. Pharmacy Status (psStage) gets the
          // "Not needed" treatment once a pharmacy is picked
          // (isCoverageRetailFlow), same reasoning isCopayRetailFlow already
          // uses: fulfillment happens outside AssistRx's own pipeline.
          if (pharmacyBenefitStatus === "covered") return [paStage, coverageTransferNotNeeded, coverageCashOfferNotNeeded, tpStage, isCoverageRetailFlow ? psNotNeededRetail : psStage];

          // Scenario 3 — neither covered. Cash Offer card plus the same
          // fulfillment-tracking stages Scenario 1 uses.
          return [paNotNeeded, coverageTransferNotNeeded, coverageCashOfferStage, tpStage, psStage];
        })(),
      ]
    : isCoaFlow
    ? [
        // SMS/consent is sent automatically in CoA_DTP — same "active,
        // waiting on something automatic" shape as WF4's EA-14272 welcome
        // message, so it gets the same blue StageCard treatment (see
        // StageCard's isActiveWaiting) instead of jumping straight to a
        // gray, not-started Benefits Investigation card with no stage
        // shown for the step the breadcrumb is actually sitting on.
        eaStage,
        {
          id: "BI-14273",
          name: "Benefits Investigation",
          statusLabel: biStatus === "none" ? "Not Started" : biStatus === "running" ? "Running" : "Complete",
          statusDetail: biStatus === "none" ? "Awaiting case creation" : biStatus === "running" ? "Investigating patient benefits..." : "Complete",
          isComplete: biStatus === "complete",
          isNotStarted: biStatus === "none",
          fields: [],
          lastUpdated: biStatus === "complete" ? new Date().toLocaleDateString() : null,
          lastUpdatedAgo: biStatus === "complete" ? "today" : null,
        },
        {
          id: "PA-14274",
          name: "Prior Authorization",
          statusLabel: paStatus === 'none' ? "Stage not started"
            : paStatus === 'submitted' ? "Submitted"
            : paStatus === 'approved' ? "Approved"
            : "Denied",
          statusDetail: paStatus === 'none' ? "Awaiting BI completion"
            : paStatus === 'submitted' ? "Awaiting payer decision"
            : paStatus === 'approved' ? (consentStatus === "confirmed"
                ? "PA Approved — pricing options sent to patient"
                : "PA Approved — pricing options will be sent once the patient completes enrollment")
            : "PA Denied — Patient eligible for cash offer",
          isComplete: paStatus === 'denied' || paStatus === 'approved',
          isNotStarted: paStatus === 'none',
          fields: [
            { label: "PA Status", value: paStatus === 'none' ? null : paStatus === 'submitted' ? "Submitted" : paStatus === 'approved' ? "Approved" : "Denied" },
          ],
          lastUpdated: paStatus !== 'none' ? new Date().toLocaleDateString() : null,
          lastUpdatedAgo: paStatus !== 'none' ? "today" : null,
        },
        {
          id: "CO-14281",
          name: "Cash Offer",
          // Approved-PA path: once the patient has picked a pricing option
          // AND scheduled delivery (pricingOption + patientShipDate both
          // set), this stage is done — either because Retail/Mail Order was
          // chosen (nothing to collect here — charged at the pharmacy
          // counter) or because the Copay Program was chosen (self_pay never
          // dispatches PATIENT_PAYS/VERIFY_PAYMENT in this flow — see
          // DeliveryDate.tsx's skipPayment — so cashOfferStatus/
          // paymentVerified never fire for Copay and can't be the completion
          // signal here). Before scheduling finishes, it's just not started.
          //
          // CoA_Copay Retail/Mail Order are the exception to the
          // patientShipDate requirement (schedulingDone below) — both skip
          // ship-date collection entirely now (Retail skips address too; Mail
          // Order still confirms an address, just no date — see
          // WorkflowEngine.ts's derivePatientRoute, PharmacySelection.tsx,
          // and DeliveryAddress.tsx), so patientShipDate stays null forever
          // for either. pricingOption alone is enough to call scheduling
          // "done" once isCopayRetailFlow.
          //
          // PA-denied path is unchanged — cashOfferStatus/paymentVerified
          // still drive Offer Sent/Paid there, same as before.
          statusLabel: paStatus === 'approved' && pricingOption !== null && schedulingDone ? "Complete"
            : cashOfferStatus === "none" ? "Stage not started" : cashOfferStatus === "sent" ? "Offer Sent" : "Paid",
          statusDetail: paStatus === 'approved' && pricingOption !== null && schedulingDone
            ? (pricingOption === "self_pay" ? "Copay Selected"
                // CoA_Copay's Copay pick never sets pricingOption to
                // "self_pay" (see coaCopay.ts) — copayEnrolled is what
                // still tells "enrolled in Copay, filling via Retail/Mail"
                // apart from a direct Retail/Mail pick, for this label.
                : copayEnrolled ? `Copay Selected (${pricingOption === "retail" ? "Retail" : "Mail Order"})`
                : "Retail or Mail Order Selected")
            : paStatus === 'approved' ? "Awaiting price selection and scheduling"
            : cashOfferStatus === "none" ? "Awaiting PA denial" : cashOfferStatus === "sent" ? "Payment link sent to patient" : paymentVerified ? "Payment verified — Complete" : "Payment received — pending verification",
          isComplete: (paStatus === 'approved' && pricingOption !== null && schedulingDone) || paymentVerified,
          isNotStarted: paStatus === 'approved' ? (pricingOption === null || !schedulingDone) : cashOfferStatus === "none",
          fields: [
            { label: "Offer Status", value: cashOfferStatus === "none" ? null : cashOfferStatus === "sent" ? "Sent" : "Paid" },
            { label: "Payment Verified", value: paymentVerified ? "Yes" : "No" },
            { label: "Ship Date", value: patientShipDate ? new Date(patientShipDate).toLocaleDateString() : null },
          ],
          lastUpdated: cashOfferStatus !== "none" || patientShipDate ? new Date().toLocaleDateString() : null,
          lastUpdatedAgo: cashOfferStatus !== "none" || patientShipDate ? "today" : null,
        },
        // Triage to Pharmacy / Pharmacy Status — reused verbatim from WF1
        // (tpStage/psStage, computed above) instead of a bespoke CoA-only
        // "Dispense" stage, so HUB staff see the exact same dispensing UI
        // regardless of flow.
        tpStage,
        // CoA_Copay Retail and Mail Order (isCopayRetailFlow) — Pharmacy
        // Status doesn't apply once fulfillment happens outside AssistRx's
        // own pipeline (a retail counter or the mail-order pharmacy's own
        // facility), so it's dropped here the same way isIAssistPapFlow
        // drops it below for its own out-of-pipeline dispense. CoA_DTP keeps
        // the full pipeline, unchanged.
        ...(isCopayRetailFlow ? [] : [psStage]),
      ]
    : isPapFlow
    ? STAGES_PAP_AUDIT.map((s) =>
        s.id === "EA-14272" ? eaStage
        : s.id === "BI-14273" ? biStage
        : s.id === "PAP-14279" ? papStage
        : s.id === "TP-14277" ? tpStage
        : s.id === "PS-14278" ? psStage
        : s.id === "FA-14276" ? faStage
        : s
      )
    : isIAssistPapFlow
    // WF5 dispenses "Keanu to facility" — a site of care, not a pharmacy
    // shipment (see tpStage/SITES_OF_CARE above) — so "Pharmacy Status"
    // (PS-14278) doesn't apply to this flow at all and never resolves past
    // "Stage not started," sitting as dead weight in the Stage Quick View
    // list. Dropped here instead of just leaving it permanently "not
    // started" like WF1/WF4 do for their own inapplicable stages, since
    // this one specifically described a pharmacy-shipping concept WF5 no
    // longer has any path to.
    ? STAGES.filter((s) => s.id !== "PS-14278").map((s) =>
        s.id === "EA-14272" ? eaStage
        : s.id === "BI-14273" ? biStage
        : s.id === "PA-14274" ? paStage
        : s.id === "TP-14277" ? tpStage
        : s.id === "A-14275" ? appealStage
        : s.id === "FA-14276" ? faStage
        : s
      )
    : STAGES.map((s) =>
        s.id === "EA-14272" ? eaStage
        : s.id === "BI-14273" ? biStage
        : s.id === "PA-14274" ? paStage
        : s.id === "TP-14277" ? tpStage
        : s.id === "PS-14278" ? psStage
        : s.id === "A-14275" ? appealStage
        : s.id === "FA-14276" ? faStage
        : s
      );

  return STAGES_LIVE;
}
