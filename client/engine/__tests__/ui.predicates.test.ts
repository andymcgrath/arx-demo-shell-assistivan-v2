import { describe, it, expect } from "vitest";
import { ALL_SCENARIOS, scenarioHasModule } from "@/workflows/scenarios";
import { COASSIST_FLOWS } from "@/workflows/coassist/scenarios";
import { IASSIST_FLOWS } from "@/workflows/iassist/scenarios";
import type { FlowType } from "@/engine/types";
import { expectMatchesFixture } from "./harness";

/**
 * Oracle for the rule 7 cleanup. Each predicate below is copied verbatim from
 * the UI file named in its comment. They are NOT imported, so this test keeps
 * today's answers even after the UI stops defining them. Step 52's
 * scenarioFacts must produce the same values for every flow.
 *
 * Two names are ambiguous in the UI, and the fixture keeps them apart:
 * - isCoA means "CoA_DTP or CoA_Copay" in the patient pages and "any CoAssist flow" in the provider portal.
 * - isPapFlow has two spellings: Fax_PAP_Audit only (DemoShell:171, Signature), and Fax_PAP_Audit plus PrES_PAP (everywhere else).
 *
 * Some answers depend on workflowData.pricingOption, so those are recorded per pricing option.
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */

// shell/DemoShell.tsx:618, crm/pages/Index.tsx:853, patient/pages/DeliveryDate.tsx:37 (and PADenied, PAApproved, CopayEnroll, DeliveryPayment, DeliveryAddress)
// CoA_Web_Copay was added after these were copied. It has the pricing fork and the copay fork, so it counts here.
const isCoaFlow_dtpCopay = (flowType: string) => flowType === "CoA_DTP" || flowType === "CoA_Copay" || flowType === "CoA_Web_Copay";

// provider/index.tsx:2919
// CoA_Web_Copay and CoA_Web_PAP are in COASSIST_FLOWS but its source is `web`, so the provider portal does not treat it as CoAssist (no provider tab).
const isCoA_providerAnyCoassist = (flowType: string) => flowType !== "CoA_Web_Copay" && flowType !== "CoA_Web_PAP" && flowType !== "CoA_Web_HCP_Patient" && flowType !== "CoA_HCP_Enroll" && COASSIST_FLOWS.includes(flowType as FlowType);

// shell/DemoShell.tsx:635, crm/pages/Index.tsx:858, patient/pages/DeliveryDate.tsx:44 (and DeliveryAddress, DeliveryPayment, PADenied, PaApprovedSms)
const isCoverageFlow = (flowType: string) => flowType === "CoA_Coverage";

// shell/DemoShell.tsx:171, patient/pages/Signature.tsx:16
const isPapFlow_faxAuditOnly = (flowType: string) => flowType === "Fax_PAP_Audit";

// shell/DemoShell.tsx:1065, crm/pages/Index.tsx:821, client/pages/Index.tsx:801, both FulfilmentCenter.tsx:541, field/index.tsx:224, patient/pages/DeliveryDate.tsx:39, DeliveryAddress.tsx:48
const isPapFlow_faxAuditAndPres = (flowType: string) => flowType === "Fax_PAP_Audit" || flowType === "PrES_PAP";

// crm/pages/Index.tsx:799, client/pages/Index.tsx:794, field/index.tsx:212
const isFaxFlow = (flowType: string) => flowType === "Fax_QS_PA_Approved" || flowType === "Fax_PAP_Audit";

// shell/DemoShell.tsx:166, crm/pages/Index.tsx:897, client/pages/Index.tsx:838
const isIAssistFlow = (flowType: string) => IASSIST_FLOWS.includes(flowType as FlowType);

// patient/pages/DeliveryDate.tsx:38, DeliveryAddress.tsx:47, DeliveryPayment.tsx:48, CopayEnroll.tsx:15
const isIAssist = (flowType: string) => flowType === "iAssist_PA_Approved";

// shell/DemoShell.tsx:632, client/pages/Index.tsx:810 (and PADenied, PAApproved, MedicationDelivered)
const isIAssistPapFlow_idOnly = (flowType: string) => flowType === "iAssist_PAP";

// crm/pages/Index.tsx:850-851: isFreeDrug is part of the CRM's isIAssistPapFlow
const isFreeDrug = (flowType: string) =>
  scenarioHasModule(flowType, "financial_assistance") && scenarioHasModule(flowType, "benefit_verification");
const isIAssistPapFlow_crmWithFreeDrug = (flowType: string) => flowType === "iAssist_PAP" || isFreeDrug(flowType);

// shell/DemoShell.tsx:627, crm/pages/Index.tsx:875, client/pages/Index.tsx:825
const isCopayRetailFlow = (flowType: string, pricingOption: string | null) =>
  (flowType === "CoA_Copay" || flowType === "CoA_Web_Copay") && (pricingOption === "retail" || pricingOption === "mail_order");

// patient/pages/CopayEnroll.tsx:16 (CoA_Web_Copay added: it runs the same copay screens)
const isCopayWorkflow = (flowType: string) => flowType === "CoA_Copay" || flowType === "CoA_Web_Copay";

// provider/index.tsx:2923
const isPres = (flowType: string) => flowType === "PrES_PAP";

// patient/index.tsx:160 and :246, patient/pages/MedicationDelivered.tsx:26
// The PES site (the HCP-then-patient scenario) uses the same wide layout as PrES_PAP: a deliberate change, not a drift.
const isWideFlow = (flowType: string) => flowType === "PrES_PAP" || flowType === "CoA_Web_HCP_Patient";

const PRICING_OPTIONS = [null, "dtp", "retail", "mail_order", "copay"] as const;

export const oraclePredicates = (flowType: string) => ({
  isCoaFlow_dtpCopay: isCoaFlow_dtpCopay(flowType),
  isCoA_providerAnyCoassist: isCoA_providerAnyCoassist(flowType),
  isCoverageFlow: isCoverageFlow(flowType),
  isPapFlow_faxAuditOnly: isPapFlow_faxAuditOnly(flowType),
  isPapFlow_faxAuditAndPres: isPapFlow_faxAuditAndPres(flowType),
  isFaxFlow: isFaxFlow(flowType),
  isIAssistFlow: isIAssistFlow(flowType),
  isIAssist: isIAssist(flowType),
  isIAssistPapFlow_idOnly: isIAssistPapFlow_idOnly(flowType),
  isIAssistPapFlow_crmWithFreeDrug: isIAssistPapFlow_crmWithFreeDrug(flowType),
  isCopayWorkflow: isCopayWorkflow(flowType),
  isPres: isPres(flowType),
  isWideFlow: isWideFlow(flowType),
  isCopayRetailFlow_byPricingOption: Object.fromEntries(
    PRICING_OPTIONS.map((p) => [String(p), isCopayRetailFlow(flowType, p)]),
  ),
});

describe("UI flag oracle (today's definitions, copied verbatim)", () => {
  it("covers every scenario", () => {
    expect(ALL_SCENARIOS.length).toBeGreaterThan(0);
  });

  it("the two meanings of isCoA differ, and so do the two spellings of isPapFlow", () => {
    const rows = ALL_SCENARIOS.map((s) => oraclePredicates(s.flowType));
    expect(rows.some((r) => r.isCoaFlow_dtpCopay !== r.isCoA_providerAnyCoassist)).toBe(true);
    expect(rows.some((r) => r.isPapFlow_faxAuditOnly !== r.isPapFlow_faxAuditAndPres)).toBe(true);
  });

  it("matches the recorded fixture for every flow", () => {
    const flows: Record<string, ReturnType<typeof oraclePredicates>> = {};
    for (const s of ALL_SCENARIOS) flows[s.flowType] = oraclePredicates(s.flowType);
    expectMatchesFixture("ui/predicates", {
      warnings: {
        isCoA: "Two meanings. isCoaFlow_dtpCopay is CoA_DTP or CoA_Copay (patient pages, shell, CRM). isCoA_providerAnyCoassist is every CoAssist flow (provider portal only).",
        isPapFlow: "Two spellings. isPapFlow_faxAuditOnly is Fax_PAP_Audit only (DemoShell:171, Signature). isPapFlow_faxAuditAndPres adds PrES_PAP (everywhere else).",
        isIAssistPapFlow: "Two spellings. The CRM page also counts the free drug program.",
        pricingOption: "isCopayRetailFlow reads workflowData.pricingOption, so it is recorded per option (null = not chosen yet).",
      },
      flows,
    });
  });
});
