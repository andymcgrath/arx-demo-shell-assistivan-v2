/**
 * The spine: BI and PA. Every scenario passes through it, so these rules belong to no module.
 *
 * The CRM reports "the agent is looking at this stage" (VIEW_STAGE) and "left it" (LEAVE_STAGE). The machine owns
 * the delay and the outcome. Leaving the stage cancels a pending reveal. The `bi` and `pa` forks decide the outcomes.
 */
import type { CoaRule } from "./shared";
import { nowIso, deriveBiResult, dmeNeitherCovered, REVEAL_MS } from "./shared";
import { exitFor } from "@/engine/workflow/forks";
import { PA_FORK, biForkFor } from "../forks";

export const SPINE_RULES: CoaRule[] = [
  {
    id: "spine.run_bi",
    on: "RUN_BI",
    when: (d) => d.enrollmentStatus === "enrolled" && d.biStatus === "none",
    set: () => ({ biStatus: "running" }),
    emit: { portal: "analytics", step: 6 },
  },
  {
    // One BI resolves to the exit the scenario's `bi` fork picked (forks.ts). An event that carries a result (DTP and
    // Copay) or the two benefit statuses (DME) still wins, so a replay or a test can force one.
    id: "spine.complete_bi",
    on: "COMPLETE_BI",
    when: (d) => d.biStatus === "running",
    set: (d, e) => {
      const chosen = exitFor(biForkFor(d.flowType), d).data;
      // DTP and Copay exits carry a result. Only `coverage_found` means a PA is required.
      if (chosen.pharmacyBenefitStatus === undefined) return { biStatus: "complete", biResult: e.result ?? chosen.biResult };
      // DME: one BI resolves to one of four coverage outcomes. Their exits carry the two benefit statuses.
      const pharmacy = e.pharmacyBenefitStatus ?? chosen.pharmacyBenefitStatus;
      const medical = e.medicalBenefitStatus ?? chosen.medicalBenefitStatus;
      return {
        biStatus: "complete",
        pharmacyBenefitStatus: pharmacy,
        medicalBenefitStatus: medical,
        biResult: deriveBiResult(pharmacy, medical),
        // The pharmacy_transfer exit: pharmacy covers, so the Rx goes to an assigned pharmacy, not the patient's pick.
        pharmacyAssigned: pharmacy === "covered" && medical !== "covered" && !!chosen.pharmacyAssigned,
        // Neither covered: the cash-offer SMS goes out automatically.
        cashOfferSmsSent: pharmacy === "not_covered" && medical === "not_covered",
      };
    },
    emit: [
      { portal: "analytics", step: 7 },
      { type: "SEND_CASH_OFFER_SMS", portal: "crm", step: 9, when: dmeNeitherCovered },
    ],
    // The eRx holds everything the PA needs, so it starts on its own. SUBMIT_PA checks the BI result:
    // DTP and Copay need `coverage_found`, and DME needs "pharmacy covered, medical not". It ignores the rest.
    then: { trigger: "system", send: () => ({ type: "SUBMIT_PA" }) },
  },
  {
    // The BI result lands after a delay once the agent opens the BI stage. The `bi` fork's exit decides it. DME's stage
    // event may also carry the statuses the presenter picked on the CRM, which COMPLETE_BI prefers.
    id: "spine.view_stage.bi",
    on: "VIEW_STAGE",
    snapshot: false,
    when: (d, e) => e.stage === "BI" && d.biStatus === "running",
    then: {
      trigger: "agent",
      id: "bi-reveal",
      after: REVEAL_MS,
      send: (d, e) => ({
        type: "COMPLETE_BI",
        result: exitFor(biForkFor(d.flowType), d).data.biResult,
        pharmacyBenefitStatus: e.pharmacyBenefitStatus,
        medicalBenefitStatus: e.medicalBenefitStatus,
      }),
    },
  },
  {
    id: "spine.view_stage.pa",
    on: "VIEW_STAGE",
    snapshot: false,
    when: (d, e) => e.stage === "PA" && d.paStatus === "submitted",
    then: {
      trigger: "agent",
      id: "pa-decision",
      after: REVEAL_MS,
      // The `pa` fork's exit decides the outcome. DME pins `approved`.
      send: (d) => ({ type: exitFor(PA_FORK, d).id === "denied" ? "DENY_PA" : "APPROVE_PA" }),
    },
  },
  { id: "spine.leave_stage.bi", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "BI", cancel: ["bi-reveal"] },
  { id: "spine.leave_stage.pa", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "PA", cancel: ["pa-decision"] },
  {
    id: "spine.submit_pa.standard",
    on: "SUBMIT_PA",
    scope: { fork: "bi", exit: "coverage_found" },
    // A PA needs a completed BI whose result says one is required.
    when: (d) => d.biStatus === "complete" && d.biResult === "coverage_found" && d.paStatus === "none",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    // DME: a PA is needed only when the pharmacy benefit covers and the medical benefit does not.
    id: "spine.submit_pa.dme",
    on: "SUBMIT_PA",
    scope: { fork: "bi", exit: "pharmacy_covered" },
    when: (d) =>
      d.biStatus === "complete" &&
      d.paStatus === "none" &&
      d.pharmacyBenefitStatus === "covered" &&
      d.medicalBenefitStatus !== "covered",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    id: "spine.approve_pa",
    on: "APPROVE_PA",
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "approved", paApprovedAt: nowIso() }),
    emit: { portal: "provider", step: 9 },
  },
];
