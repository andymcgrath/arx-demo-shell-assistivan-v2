import type { StageMap } from "@/engine/workflow/stages";
import type { Scope } from "@/engine/workflow/types";
import { STAGE_DEFS as S } from "../shared/stageDefs";
import { IASSIST_FORKS } from "./forks";
import { IA_BUY_AND_BILL_PAP, IA_BUY_AND_BILL, IA_MEDICAL_TRANSFER, IA_PA_APPROVED, IA_PA_DENIED_APPEAL, IASSIST_FLOWS } from "./scenarios";

/**
 * The CRM stages for the iAssist scenarios. See workflows/coassist/stages.ts for how the two lists work.
 *
 * Where the scenarios differ:
 * - Standard (PA approved, medical transfer): the full list, with appeals and financial assistance.
 * - Appeal: the drug goes to a site of care, so Pharmacy Status is dropped.
 * - Buy and Bill (the `copay` module): four stages. BI is the medical benefit, Financial Assistance is the copay the
 *   HCP enrolled, appeals are skipped because the PA is approved, and nothing triages or ships.
 * - Free drug (financial assistance with a benefit verification): no PA and no appeals. Approval triages the drug to the
 *   site of care, and the last stage is the order status.
 */

const COPAY_PROGRAM: Scope = { module: "copay" };
const FREE_DRUG: Scope = { module: "financial_assistance" };
const APPEAL: Scope = { module: "appeal" };

export const IASSIST_STAGES: StageMap = {
  flows: IASSIST_FLOWS,
  scenarioDefs: [IA_PA_APPROVED, IA_PA_DENIED_APPEAL, IA_MEDICAL_TRANSFER, IA_BUY_AND_BILL, IA_BUY_AND_BILL_PAP],
  forks: IASSIST_FORKS,

  catalog: [S.EA, S.BI, S.PA, S.A, S.FA, S.TP, S.PS],

  rules: [
    { id: "ea.welcome", stage: S.EA.id, variant: "welcome_message" },

    { id: "bi.free_drug", stage: S.BI.id, variant: "free_drug", scope: FREE_DRUG },
    { id: "bi.buy_and_bill", stage: S.BI.id, variant: "buy_and_bill", scope: COPAY_PROGRAM },
    { id: "bi.standard", stage: S.BI.id, variant: "standard" },

    { id: "pa.free_drug.none", stage: S.PA.id, variant: null, scope: FREE_DRUG },
    { id: "pa.standard", stage: S.PA.id, variant: "standard" },

    { id: "appeal.free_drug.none", stage: S.A.id, variant: null, scope: FREE_DRUG },
    { id: "appeal.buy_and_bill.none", stage: S.A.id, variant: null, scope: COPAY_PROGRAM },
    { id: "appeal.standard", stage: S.A.id, variant: "standard" },

    { id: "fa.free_drug", stage: S.FA.id, variant: "free_drug", scope: FREE_DRUG },
    { id: "fa.copay", stage: S.FA.id, variant: "copay", scope: COPAY_PROGRAM },
    { id: "fa.standard", stage: S.FA.id, variant: "standard" },

    { id: "tp.buy_and_bill.none", stage: S.TP.id, variant: null, scope: COPAY_PROGRAM },
    { id: "tp.free_drug", stage: S.TP.id, variant: "free_drug", scope: FREE_DRUG },
    { id: "tp.appeal", stage: S.TP.id, variant: "site_of_care", scope: APPEAL },
    { id: "tp.standard", stage: S.TP.id, variant: "standard" },

    { id: "ps.buy_and_bill.none", stage: S.PS.id, variant: null, scope: COPAY_PROGRAM },
    { id: "ps.free_drug", stage: S.PS.id, variant: "order_status", scope: FREE_DRUG },
    { id: "ps.appeal.none", stage: S.PS.id, variant: null, scope: APPEAL },
    { id: "ps.standard", stage: S.PS.id, variant: "standard" },
  ],
};
