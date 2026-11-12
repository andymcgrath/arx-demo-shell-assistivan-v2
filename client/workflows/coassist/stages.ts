import type { WorkflowData } from "@/engine/types";
import type { StageMap } from "@/engine/workflow/stages";
import type { Scope } from "@/engine/workflow/types";
import { STAGE_DEFS as S } from "../shared/stageDefs";
import { COASSIST_FORKS } from "./forks";
import { COA_COPAY, COA_COVERAGE, COA_DTP, COA_MEDICAL_TRANSFER, COA_PAP, COA_WEB_COPAY, COA_HCP_ENROLL, COA_APA_SPECIALTY, COA_APA_ASSISTANCE, COA_WEB_PAP, COASSIST_FLOWS } from "./scenarios";

/**
 * The CRM stages for the CoAssist scenarios. A catalog in CRM order, and rules that pick how each stage is drawn.
 * See engine/workflow/stages.ts for how the two lists work, and portals/crm/stages/builders for what each variant draws.
 * A rule's `scope` reads the scenario's recipe and forks, the way the patient screen map does.
 *
 * Where the scenarios differ:
 * - DTP and Copay (the `pricing` fork): a PA, a cash offer, triage and pharmacy status. Copay filled at retail or by mail
 *   is filled outside AssistRx, so its Triage stage ends at dispatch and Pharmacy Status is dropped.
 * - Coverage (`provider_transfer`): every stage shows before BI resolves, as a placeholder. The BI result then marks
 *   the ones that do not apply "Not needed".
 * - PAP (`pap_transfer`): no PA. The referral to the patient support program and its income check take their place.
 * - Medical transfer: the standard stages, with appeals and financial assistance.
 */

const PRICING: Scope = { fork: "pricing" };
const COPAY: Scope = { fork: "copay" };
const COVERAGE: Scope = { module: "provider_transfer" };
const PSP: Scope = { module: "pap_transfer" };
/** The medical transfer scenario: a PA fork, and the pharmacy assigned to the case. The PAP scenario has no PA fork. */
/** The pharmacy came from the prescriber's eRx. The agent dispatches to it once the patient has scheduled. */
const PRESCRIBER_PHARMACY: Scope = { module: "pharmacy_selection", props: { variant: "prescriber" } };
const MEDICAL_TRANSFER: Scope = [{ fork: "pa" }, { module: "pharmacy_selection", props: { variant: "assigned" } }];

/** The scenario hands the case to the client's own CRM. */

const biComplete = (d: WorkflowData) => d.biStatus === "complete";
const medicalCovered = (d: WorkflowData) => d.medicalBenefitStatus === "covered";
const pharmacyCovered = (d: WorkflowData) => d.pharmacyBenefitStatus === "covered";
/** Copay filled at retail or by mail order, outside AssistRx's pipeline. */
const copayFilledOutside = (d: WorkflowData) => d.pricingOption === "retail" || d.pricingOption === "mail_order";
/** Coverage scenario 1: the pharmacy benefit covers, the medical benefit does not, and the patient picked retail. */
const coverageRetail = (d: WorkflowData) => pharmacyCovered(d) && !medicalCovered(d) && d.pricingOption === "retail";

export const COASSIST_STAGES: StageMap = {
  flows: COASSIST_FLOWS,
  scenarioDefs: [COA_DTP, COA_COPAY, COA_WEB_COPAY, COA_HCP_ENROLL, COA_COVERAGE, COA_MEDICAL_TRANSFER, COA_PAP, COA_APA_SPECIALTY, COA_APA_ASSISTANCE, COA_WEB_PAP],
  forks: COASSIST_FORKS,

  catalog: [S.EA, S.BI, S.PA, S.PT, S.CO, S.A, S.PSP, S.FA, S.TP, S.PS],

  rules: [
    { id: "ea.sms_consent.pricing", stage: S.EA.id, variant: "sms_consent", scope: PRICING },
    { id: "ea.sms_consent.coverage", stage: S.EA.id, variant: "sms_consent", scope: COVERAGE },
    { id: "ea.default", stage: S.EA.id, variant: "default" },

    { id: "bi.psp", stage: S.BI.id, variant: "psp", scope: PSP },
    { id: "bi.coverage", stage: S.BI.id, variant: "coverage", scope: COVERAGE },
    { id: "bi.coa", stage: S.BI.id, variant: "coa", scope: PRICING },
    { id: "bi.standard", stage: S.BI.id, variant: "standard" },

    { id: "pa.psp.none", stage: S.PA.id, variant: null, scope: PSP },
    // Outcomes with no PA: both benefits covered, or neither. Only pharmacy-only coverage submits one.
    { id: "pa.coverage.not_needed", stage: S.PA.id, variant: "not_needed", scope: COVERAGE, when: (d) => biComplete(d) && (medicalCovered(d) || !pharmacyCovered(d)) },
    { id: "pa.coverage", stage: S.PA.id, variant: "standard", scope: COVERAGE },
    { id: "pa.coa", stage: S.PA.id, variant: "coa", scope: PRICING },
    { id: "pa.standard", stage: S.PA.id, variant: "standard" },

    { id: "pt.coverage.not_needed", stage: S.PT.id, variant: "not_needed", scope: COVERAGE, when: (d) => biComplete(d) && !medicalCovered(d) },
    { id: "pt.coverage", stage: S.PT.id, variant: "standard", scope: COVERAGE },

    { id: "co.coverage.not_needed", stage: S.CO.id, variant: "coverage_not_needed", scope: COVERAGE, when: (d) => biComplete(d) && (medicalCovered(d) || pharmacyCovered(d)) },
    { id: "co.coverage", stage: S.CO.id, variant: "coverage", scope: COVERAGE },
    { id: "co.copay", stage: S.CO.id, variant: "coa_copay", scope: COPAY },
    { id: "co.pricing", stage: S.CO.id, variant: "coa", scope: PRICING },

    { id: "appeal.medical_transfer", stage: S.A.id, variant: "standard", scope: MEDICAL_TRANSFER },

    { id: "psp.referral", stage: S.PSP.id, variant: "standard", scope: PSP },

    { id: "fa.psp", stage: S.FA.id, variant: "income", scope: PSP },
    { id: "fa.medical_transfer", stage: S.FA.id, variant: "standard", scope: MEDICAL_TRANSFER },

    { id: "tp.coverage.transfer", stage: S.TP.id, variant: "transfer_not_needed", scope: COVERAGE, when: (d) => biComplete(d) && medicalCovered(d) },
    { id: "tp.coverage.retail", stage: S.TP.id, variant: "dispatched_outside", scope: COVERAGE, when: coverageRetail },
    { id: "tp.copay.outside", stage: S.TP.id, variant: "dispatched_outside", scope: COPAY, when: copayFilledOutside },
    { id: "tp.prescriber", stage: S.TP.id, variant: "prescriber", scope: PRESCRIBER_PHARMACY },
    { id: "tp.standard", stage: S.TP.id, variant: "standard" },

    { id: "ps.coverage.transfer", stage: S.PS.id, variant: "transfer_not_needed", scope: COVERAGE, when: (d) => biComplete(d) && medicalCovered(d) },
    { id: "ps.coverage.retail", stage: S.PS.id, variant: "retail_not_needed", scope: COVERAGE, when: (d) => biComplete(d) && coverageRetail(d) },
    { id: "ps.copay.outside", stage: S.PS.id, variant: null, scope: COPAY, when: copayFilledOutside },
    { id: "ps.standard", stage: S.PS.id, variant: "standard" },

  ],
};
