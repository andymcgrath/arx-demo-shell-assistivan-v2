import { ADVANCED_DIABETES_SUPPLY_FACTS } from "@/engine/WorkflowEngine";
import { useNavigate } from "@/lib/portalRouter";
import type { WorkflowData } from "@/engine/types";
import { scenarioFor } from "@/workflows/scenarios";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { FC_BLUE } from "./SfControls";
import { Send, ChevronDown } from "lucide-react";
import { BenefitsPanel } from "./BenefitsPanel";
import { Section, FieldRow, SF_SECTION_BG, SfLink, NOT_APPLICABLE } from "./SfPrimitives";
import { PAYER } from "../payerFacts";

interface BiDetailProps {
  workflowData: WorkflowData;
  patientName: string;
  drugName: string;
  caseNumber: string;
  phone: string;
  payer: string;
  onOpenProductDetail: () => void;
}

/** The Benefits Investigation result view, once BI completes. */
export function BiDetail({ workflowData, patientName, drugName, caseNumber, phone, payer, onOpenProductDetail }: BiDetailProps) {
  const navigate = useNavigate();
  const facts = scenarioFacts(workflowData.flowType);
  const { biResult, papSmsSent, biStatus, pharmacyBenefitStatus, medicalBenefitStatus, pharmacyStatus } = workflowData;
  // The scenario's recipe says whether the CRM shows the benefits panel.
  const showBenefitsPanel = !!scenarioFor(workflowData.flowType)?.recipe?.panels?.includes("benefits");
  return (
    <>
      <div>
        {/* BIR Record Header */}
        <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
          <div className="text-[11px] text-[#706e6b] mb-0.5">Benefit Investigation Result</div>
          <div className="flex items-center justify-between py-2 gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                style={{ width: 36, height: 36, background: "linear-gradient(135deg, var(--crm-primary, #0176d3) 0%, var(--crm-primary-dark, #014486) 100%)" }}
              >
                BIR
              </div>
              <h1 className="text-[20px] font-bold text-[#3e3e3c]">BIR-0431</h1>
            </div>
            {/* No Coverage → Application Update: kicks off the FA
                eIncome check (papSmsSent gates /income-qualification in
                WorkflowEngine.ts's PAP routing branch). Sent through the
                Fulfillment Center now, same as every other patient SMS
                in the demo, instead of a bespoke button here. */}
            {((facts.isNoPaIntake && biResult === "no_insurance") || (facts.agentSendsPapUpdate && biStatus === "complete")) && (
              papSmsSent ? (
                <span className="text-[12px] font-semibold px-2.5 py-1 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>
                  SMS Sent to Patient
                </span>
              ) : (
                <button
                  onClick={() => navigate('/fulfilment-center')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <Send size={12} />
                  Send via Fulfillment Center
                </button>
              )
            )}
          </div>
        </div>

        {showBenefitsPanel ? (
          <BenefitsPanel
            patientName={patientName}
            drugName={drugName}
            caseNumber={caseNumber}
            biComplete={biStatus === "complete"}
            pharmacyBenefitStatus={pharmacyBenefitStatus}
            medicalBenefitStatus={medicalBenefitStatus}
            paRequired={workflowData.paRequired}
            transferProvider={ADVANCED_DIABETES_SUPPLY_FACTS.name}
            onOpenProductDetail={() => onOpenProductDetail()}
          />
        ) : (
        <div className="flex gap-0 overflow-hidden">
          {/* Left: Information + tables */}
          <div className="flex-1 min-w-0 p-4 space-y-4">

            {/* Information section — iAssist flows get the Patient
                Details / Insurance Information / Member Information
                layout populated from the same payer
                facts used in the Summary of Benefits PDF; every
                other flow keeps the original single "Information" box. */}
            {facts.isIassistSource ? (
              <>
                <Section title="Patient Details">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                    <div>
                      <FieldRow label="Patient" value={patientName} isLink />
                      <FieldRow label="Benefit Type" value="Medical" />
                      <FieldRow label="Selected Product Coverage Pharmacy" value="" />
                      <FieldRow label="Benefit Source" value="eBV" />
                    </div>
                    <div>
                      <FieldRow label="Case" value={caseNumber} isLink />
                      <FieldRow label="Stage" value="BI-14273" isLink />
                      <FieldRow label="Rank" value="Primary" />
                    </div>
                  </div>
                </Section>

                <Section title="Insurance Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                    <div>
                      <FieldRow label="Insurance Plan Type" value={PAYER.planType} />
                      <FieldRow label="Insurance Payer Type" value={PAYER.type} />
                      <FieldRow label="Medical Group Number" value={PAYER.groupNumber} />
                      <FieldRow label="Employer" value={PAYER.employer} />
                      <FieldRow label="Copay Accumulator" value="No" />
                      <FieldRow label="Non Emergency Transportation Coverage" value="No" />
                    </div>
                    <div>
                      <FieldRow label="Payer" value={PAYER.name} />
                      <FieldRow label="Payer Summary" value={`Payer ID: ${PAYER.payerId}`} />
                      <FieldRow label="Medical Plan Name" value={PAYER.planName} />
                      <FieldRow label="Plan Funding" value={PAYER.planFunding} />
                      <FieldRow label="OOP Included in Deductible" value="Yes" />
                      <FieldRow label="Insurance Phone #" value={PAYER.insurancePhone} />
                      <FieldRow label="Medical Member ID" value={PAYER.memberId} />
                    </div>
                  </div>
                </Section>

                <Section title="Member Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                    <div>
                      <FieldRow label="Medical Insurance Effective Date" value={PAYER.effectiveDate} />
                      <FieldRow label="Medical Insurance Termination Date" value="" />
                    </div>
                    <div>
                      <FieldRow label="Subscriber Name" value={patientName} />
                      <FieldRow label="Relationship to Subscriber" value="Self" />
                    </div>
                  </div>
                </Section>
              </>
            ) : (
            <Section title="Information">
              <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                <div>
                  <FieldRow label="Patient" value={patientName} isLink />
                  <FieldRow label="Product" value={drugName} isLink />
                  <FieldRow label="Record Type" value="Pharmacy" />
                  <FieldRow label="Care" value={caseNumber} isLink />
                  <FieldRow label="Benefit Type" value="Pharmacy" />
                  <FieldRow label="Rank" value="Primary" />
                  <FieldRow label="Benefit Source" value="BI" />
                  <FieldRow label="Status" value="Active" />
                  <FieldRow label="Reimbursement Plan" value="" />
                  <FieldRow label="Sub-Status" value="" />
                  <FieldRow label="Insured?" value={facts.isNoPaIntake ? "No" : "Yes"} />
                  <FieldRow label="Prior Authorization Phone #" value={phone} />
                  <FieldRow label="Subscriber Name" value="Dr. Sarah Chen" />
                  <FieldRow label="Internal Comments" value="" />
                  <FieldRow label="External Comments" value="" />
                </div>
                <div>
                  <FieldRow label="Benefit Investigation Result Name" value="BIR-0431" />
                  <FieldRow label="Stage" value="BI-14273" isLink />
                  <FieldRow label="Selected Product Coverage" value="Pharmacy" />
                  <FieldRow label="Payer" value={payer} />
                  <FieldRow label="Payer Type" value={facts.isNoPaIntake ? "No Insurance" : "Commercial"} />
                  <FieldRow label="Benefit Source" value="BI" />
                  <FieldRow label="External Comments" value="" />
                  <FieldRow label="Subscriber Tax #" value="" />
                  <FieldRow label="Additional Benefit Information" value="" />
                  <FieldRow label="Internal Comments Long" value="" />
                  <FieldRow label="External Comments Long" value="" />
                </div>
              </div>
            </Section>
            )}

            {/* BI Referral Pharmacies table — shown only after Triage stage starts */}
            {pharmacyStatus !== "none" && (
            <div className="border border-[#dddbda] rounded">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                <span className="text-[12px] font-semibold text-[#3e3e3c]">BI Referral Pharmacies (1)</span>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: SF_SECTION_BG }}>
                    <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Referral Pharmacy Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Pharmacy Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Record Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Network Status</th>
                    <th className="w-8 border-b border-[#dddbda]" />
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-[#f3f3f3]">
                    <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>PREF-0675</SfLink></td>
                    <td className="px-3 py-2 border-b border-[#dddbda]">Biologics</td>
                    <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>Program Mandated</SfLink></td>
                    <td className="px-3 py-2 border-b border-[#dddbda]">In Network</td>
                    <td className="px-3 py-2 border-b border-[#dddbda]">
                      <button className="border border-[#dddbda] rounded px-1 py-0.5 bg-white hover:bg-[#f3f3f3]">
                        <ChevronDown size={11} className="text-[#706e6b]" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="px-3 py-2">
                <SfLink className="text-[12px]">View All</SfLink>
              </div>
            </div>
            )}

          </div>

          {/* Right: BI Product Coverage panel */}
          <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
            <div className="border border-[#dddbda] rounded">
              <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                <span className="text-[12px] font-semibold text-[#3e3e3c]">BI Product Coverage Name</span>
              </div>
              <div className="space-y-0">
                <div className="px-3 py-2 border-b border-[#dddbda]">
                  <SfLink onClick={() => onOpenProductDetail()}>BIPC-0455</SfLink>
                </div>
                <div className="px-3 py-2 border-b border-[#dddbda]">
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Product</div>
                  <SfLink>{drugName}</SfLink>
                </div>
                <div className="px-3 py-2 border-b border-[#dddbda]">
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Status</div>
                  <div className="text-[13px] text-[#3e3e3c]">{facts.isNoPaIntake ? "No Coverage" : "Covered"}</div>
                </div>
                <div className="px-3 py-2 border-b border-[#dddbda]">
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">PA Required?</div>
                  <div className="text-[13px] text-[#3e3e3c]">{facts.isNoPaIntake ? NOT_APPLICABLE : "Yes"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
}
