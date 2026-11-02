import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import type { WorkflowData } from "@/engine/types";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { scenarioHasModule } from "@/workflows/scenarios";
import type { Stage } from "../stages/types";
import type { CrmAction } from "../stages/actions";
import { SfButton, SectionHeader, FC_BLUE } from "./SfControls";
import { dateFromToday, formatShortDate } from "@/lib/relativeDate";
import { SF_BLUE, FieldRow, SfLink, SF_SECTION_BG } from "./SfPrimitives";
import { User, Settings, RefreshCw, ArrowUp, ArrowUpDown, ChevronDown, FileText } from "lucide-react";
import { CASE_TABS, RIGHT_TABS, type RelatedDocument } from "../caseData";
import { StageCard } from "./StageCard";
import { BRAND } from "@/brand";
import { copayMemberId, COPAY_ANNUAL_MAX, copayBalance } from "@/portals/iassist/data/copayProgram";
import { ymdToMdy } from "@/portals/iassist/data/submissionStatus";
import { getLiveWorkItems } from "@/engine/WorkflowEngine";

interface CaseHomeProps {
  workflowData: WorkflowData;
  patientName: string;
  caseNumber: string;
  /** The stages in the Stage Quick View. */
  stages: Stage[];
  relatedDocuments: RelatedDocument[];
  /** The case-home buttons: the machine's answer for each (stages/actions.ts). */
  caseAction: (id: string) => CrmAction | undefined;
  onAction: (action: CrmAction) => void;
  onOpenStage: (stage: Stage) => void;
  /** A related document with no file opens the enrollment form tab. */
  onOpenEnrollmentForm: () => void;
  onOpenCopayClaim: (claimId: string) => void;
}

/** The case record's home tab: header, quick-info bar, case tabs, and the summary, documents, copay and task views. */
export function CaseHome({ workflowData, patientName, caseNumber, stages, relatedDocuments, caseAction, onAction, onOpenStage, onOpenEnrollmentForm, onOpenCopayClaim }: CaseHomeProps) {
  const navigate = useNavigate();
  const facts = scenarioFacts(workflowData.flowType);
  const { consentStatus, biStatus, paStatus, appealStatus, flowType, copayEnrolled } = workflowData;
  const copayClaimsNow = workflowData.copayClaims ?? [];
  // Copay is its own tab only when the recipe has a copay module.
  const caseTabs = scenarioHasModule(flowType, "copay") ? [CASE_TABS[0], CASE_TABS[1], { id: "copay", label: "Copay" }, ...CASE_TABS.slice(2)] : CASE_TABS;
  const [activeCaseTab, setActiveCaseTab] = useState("summary");
  const [activeRightTab, setActiveRightTab] = useState("quick-answers");
  const [caseSummaryCollapsed, setCaseSummaryCollapsed] = useState(false);
  const [stagesCollapsed, setStagesCollapsed] = useState(false);
  return (
    <>
      {/* Case Record Header */}
      <div className="border-b border-[#dddbda] bg-white">
        <div className="px-4 pt-2 pb-0">
          <span className="text-[11px] text-[#706e6b]">Case</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
              style={{ width: 36, height: 36, background: "linear-gradient(135deg, var(--crm-primary, #0176d3) 0%, var(--crm-primary-dark, #014486) 100%)" }}
            >
              Case
            </div>
            <h1 className="text-[20px] font-bold text-[#3e3e3c] truncate">Onboarding</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <SfButton>Edit</SfButton>
            <SfButton>Delete</SfButton>
            <SfButton split>Change Owner</SfButton>
          </div>
        </div>
      </div>
      {/* Case Quick-Info Bar */}
      <div className="border-b border-[#dddbda] bg-white px-4 py-3 flex flex-wrap gap-x-8 gap-y-2">
        <div className="flex flex-col min-w-[70px]">
          <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Case Status</span>
          <span className="text-[13px] text-[#3e3e3c]">Open</span>
        </div>
        <div className="flex flex-col min-w-[90px]">
          <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Case Number</span>
          <span className="text-[13px] text-[#3e3e3c]">{caseNumber}</span>
        </div>
        <div className="flex flex-col min-w-[150px]">
          <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Date/Time Opened</span>
          <span className="text-[13px] text-[#3e3e3c]">{dateFromToday(-4).toLocaleDateString()} 2:31 PM</span>
        </div>
        <div className="flex flex-col min-w-[150px]">
          <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Date/Time Closed</span>
          <span className="text-[13px] text-[#3e3e3c]">&nbsp;</span>
        </div>
        <div className="flex flex-col min-w-[80px]">
          <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Case Origin</span>
          <span className="text-[13px] text-[#3e3e3c]">Fax</span>
        </div>
        <div className="flex flex-col min-w-[100px]">
          <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Referral Source</span>
          <span className="text-[13px] text-[#3e3e3c]">HCP</span>
        </div>
      </div>
      {/* Row 2: Case Navigation Tabs */}
      <div className="border-b border-[#dddbda] flex bg-white overflow-x-auto">
        {caseTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCaseTab(tab.id)}
            className={`px-4 py-3 text-[13px] whitespace-nowrap transition-colors relative shrink-0 ${
              activeCaseTab === tab.id ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
            }`}
            style={{ color: activeCaseTab === tab.id ? SF_BLUE : undefined }}
          >
            {tab.label}
            {activeCaseTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: SF_BLUE }} />
            )}
          </button>
        ))}
      </div>
      {activeCaseTab === "summary" ? (
    <div className="flex" style={{ minHeight: "calc(100vh - 210px)" }}>
      {/* ── Left Panel (68%) ───────────────────────────────────────────── */}
      <div
        className="min-w-0 border-r border-[#dddbda]"
        style={{ flexBasis: "68%" }}
      >
        <div className="p-4">
          {/* Case Summary accordion */}
          <div className="border border-[#dddbda] rounded mb-4">
            <SectionHeader
              title="Case Summary"
              collapsed={caseSummaryCollapsed}
              onToggle={() => setCaseSummaryCollapsed(!caseSummaryCollapsed)}
            />
            {!caseSummaryCollapsed && (
              <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                <div>
                  <FieldRow label="Account Name" value={patientName} isLink />
                  <FieldRow label="Service Type" value="Patient Solutions" isLink />
                  <FieldRow label="Case Type" value="Onboarding" />
                  <FieldRow label="Referral Source" value="HCP" />
                  <FieldRow label="Interaction" value="HCP241205" />
                  <FieldRow label="Product" value="PP-27305" isLink />
                </div>
                <div>
                  <FieldRow label="Case Date" value="Not Started" />
                  <FieldRow label="Case Record Type" value="Patient Solutions" />
                  <FieldRow label="Program Type" />
                  <div className="group relative flex flex-col py-2 border-b border-[#dddbda] pr-6 min-h-[44px]">
                    <span className="text-[11px] text-[#706e6b] mb-0.5 uppercase tracking-wide font-medium leading-tight">
                      Case Owner
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex items-center justify-center rounded-full bg-[#ecebea] shrink-0"
                        style={{ width: 18, height: 18 }}
                      >
                        <User size={10} className="text-[#706e6b]" />
                      </div>
                      <SfLink className="text-[13px]">AssistRx Clin/Fulfillment</SfLink>
                    </div>
                  </div>
                  <FieldRow label="Enrollment Date" value={dateFromToday(-4).toLocaleDateString()} />
                </div>
              </div>
            )}
          </div>

          {/* Stages accordion */}
          <div className="border border-[#dddbda] rounded">
            <SectionHeader
              title={`Stages (${stages.length})`}
              collapsed={stagesCollapsed}
              onToggle={() => setStagesCollapsed(!stagesCollapsed)}
              rightContent={
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button className="p-1.5 hover:bg-[#e5e5e5] rounded transition-colors">
                    <Settings size={13} className="text-[#706e6b]" />
                  </button>
                  <button className="p-1.5 hover:bg-[#e5e5e5] rounded transition-colors">
                    <RefreshCw size={13} className="text-[#706e6b]" />
                  </button>
                </div>
              }
            />
            {!stagesCollapsed && (
              <>
                <div className="px-3 py-1.5 text-[11px] text-[#706e6b] border-b border-[#dddbda]">
                  {stages.length} items • Sorted by Created Date • Updated a few seconds ago
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]" style={{ minWidth: 700 }}>
                    <thead>
                      <tr style={{ background: SF_SECTION_BG }}>
                        <th className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium border-b border-[#dddbda] w-8">#</th>
                        {[
                          { label: "Stage Name", sortable: true },
                          { label: "Record Type Name", sortable: true },
                          { label: "Status", sortable: true },
                          { label: "Sub-Status", sortable: true },
                          { label: "Stage State", sortable: true },
                          { label: "Service Ty...", sortable: true },
                          { label: "Created Date", sortable: true, asc: true },
                        ].map((col) => (
                          <th
                            key={col.label}
                            className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium border-b border-[#dddbda] whitespace-nowrap"
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              {col.asc ? (
                                <ArrowUp size={10} className="text-[#706e6b]" />
                              ) : col.sortable ? (
                                <ArrowUpDown size={10} className="text-[#706e6b]" />
                              ) : null}
                            </div>
                          </th>
                        ))}
                        <th className="border-b border-[#dddbda] w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {stages.map((stage, i) => {
                        const stageState = stage.isComplete
                          ? "Closed"
                          : stage.isNotStarted
                          ? ""
                          : "Not Started";
                        const statusLabel = stage.isNotStarted ? "" : stage.statusLabel;
                        const subStatus = stage.isNotStarted ? "" : stage.statusDetail;
                        return (
                          <tr key={stage.id} className="hover:bg-[#f3f3f3] transition-colors">
                            <td className="px-3 py-2 border-b border-[#dddbda] text-[#706e6b]">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2 border-b border-[#dddbda]">
                              <SfLink className="text-[12px]">{stage.id}</SfLink>
                            </td>
                            <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                              {stage.name}
                            </td>
                            <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">{statusLabel}</td>
                            <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] max-w-[160px] truncate" title={subStatus}>
                              {subStatus}
                            </td>
                            <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">{stageState}</td>
                            <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">Onboarding</td>
                            <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                              {dateFromToday(-4).toLocaleDateString()} 2:31 PM
                            </td>
                            <td className="px-3 py-2 border-b border-[#dddbda]">
                              <button className="p-0.5 hover:bg-[#e5e5e5] rounded">
                                <ChevronDown size={13} className="text-[#706e6b]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Panel (32%) ──────────────────────────────────────────── */}
      <div
        className="flex flex-col bg-white"
        style={{ flexBasis: "32%", minWidth: 280 }}
      >
        {/* Right tab strip */}
        <div className="border-b border-[#dddbda] flex shrink-0">
          {RIGHT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRightTab(tab.id)}
              className={`px-4 py-3 text-[13px] whitespace-nowrap transition-colors relative ${
                activeRightTab === tab.id ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
              }`}
              style={{ color: activeRightTab === tab.id ? SF_BLUE : undefined }}
            >
              {tab.label}
              {activeRightTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: SF_BLUE }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeRightTab === "quick-answers" && (
            <>
              {/* Fulfilment Center section */}
              <div className="border-b border-[#dddbda] p-3">
                <div className="text-[13px] font-semibold text-[#3e3e3c] mb-2">
                  Fulfilment Center
                </div>
                <button
                  onClick={() => navigate("/fulfilment-center")}
                  className="w-full py-1.5 text-[13px] font-medium text-white rounded transition-opacity hover:opacity-90 active:opacity-80"
                  style={{ background: FC_BLUE }}
                >
                  Open Fulfilment Center
                </button>
              </div>

              {/* Stage Quick View */}
              <div>
                <div
                  className="px-3 py-2 border-b border-[#dddbda]"
                  style={{ background: SF_SECTION_BG }}
                >
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">
                    Stage Quick View
                  </span>
                </div>
                <div className="px-3">
                  {stages.map((stage) => (
                    <StageCard key={stage.id} stage={stage} onHeaderClick={onOpenStage} />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeRightTab === "missing-info" && (
            <div>
              {consentStatus === "pending" ? (
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr style={{ background: "#f3f3f3" }}>
                      <th className="px-3 py-2 text-left font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Missing Item</th>
                      <th className="px-3 py-2 text-left font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Impact</th>
                      <th className="px-3 py-2 border-b border-[#dddbda]" />
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-[#f9f9f9]">
                      <td className="px-3 py-2.5 border-b border-[#dddbda] font-medium text-[#3e3e3c]">Patient Consent</td>
                      <td className="px-3 py-2.5 border-b border-[#dddbda]">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: "#fff3cd", color: "#856404" }}>Pending</span>
                      </td>
                      {/* CoA_DTP/CoA_Copay no longer gate Benefits Investigation on
                          consent (the machine starts BI at the referral, see
                          workflows/coassist/rules.ts) — BI
                          may already be running or complete while this row still shows
                          consent as Pending, so the old copy would be a false claim for
                          those two flows specifically. Every other flow keeps it. */}
                      <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#706e6b]">{facts.hasPricingFork ? "Delays Prior Authorization submission" : "Benefits Investigation has not yet run"}</td>
                      <td className="px-3 py-2.5 border-b border-[#dddbda]">
                        {caseAction("enroll") && (
                          <button
                            onClick={() => onAction(caseAction("enroll")!)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold text-white transition-colors hover:opacity-90"
                            style={{ background: FC_BLUE }}
                          >
                            Enroll Patient
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-[13px] text-[#706e6b] text-center py-8">No missing information items.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
      ) : activeCaseTab === "documents" && relatedDocuments.length > 0 ? (
        <div className="p-4">
          <div className="border border-[#dddbda] rounded overflow-hidden">
            {/* Table header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b border-[#dddbda]"
              style={{ background: "#f3f3f3" }}
            >
              <span className="text-[13px] font-semibold text-[#3e3e3c]">Related Documents</span>
              <span className="text-[12px] text-[#706e6b]">{relatedDocuments.length} record{relatedDocuments.length !== 1 ? "s" : ""}</span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "#f3f3f3" }}>
                  {[
                    { label: "File ID", sortable: true },
                    { label: "File Name", sortable: true },
                    { label: "Type" },
                    { label: "Pages" },
                    { label: "Date Received", sortable: true },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="text-left px-3 py-2 text-[11px] text-[#706e6b] uppercase tracking-wide font-medium border-b border-[#dddbda] whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && <ArrowUpDown size={10} className="text-[#706e6b]" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relatedDocuments.map((doc) => {
                  const openDoc = doc.href
                    ? () => window.open(doc.href, "_blank", "noopener,noreferrer")
                    : onOpenEnrollmentForm;
                  return (
                  <tr key={doc.fileId} className="hover:bg-[#f3f3f3] transition-colors">
                    <td className="px-3 py-2.5 border-b border-[#dddbda]">
                      <div className="flex items-center gap-1.5">
                        <FileText size={13} className="text-[#706e6b] shrink-0" />
                        <span
                          className="cursor-pointer hover:underline font-medium"
                          style={{ color: SF_BLUE }}
                          onClick={openDoc}
                        >
                          {doc.fileId}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda]">
                      <span
                        className="cursor-pointer hover:underline"
                        style={{ color: SF_BLUE }}
                        onClick={openDoc}
                      >
                        {doc.fileName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                      {doc.type}
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                      {doc.pages}
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                      {doc.dateReceived}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeCaseTab === "copay" ? (
        <div className="p-4 space-y-4">
          <div className="border border-[#dddbda] rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]" style={{ background: "#f3f3f3" }}>Copay Enrollment</div>
            {copayEnrolled ? (
              <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                <div>
                  <FieldRow label="Program" value={BRAND.program.name} />
                  <FieldRow label="Member ID" value={copayMemberId(patientName, BRAND.program.name)} />
                  <FieldRow label="Status" value="Active" />
                </div>
                <div>
                  <FieldRow label="Effective" value={formatShortDate(workflowData.copayEnrolledAt ? new Date(workflowData.copayEnrolledAt) : dateFromToday(0))} />
                  <FieldRow label="Annual maximum" value={`$${COPAY_ANNUAL_MAX.toLocaleString("en-US")}.00`} />
                  <FieldRow label="Remaining balance" value={`$${copayBalance(workflowData).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                </div>
              </div>
            ) : (
              <div className="p-6 text-[13px] text-[#706e6b] text-center">Not enrolled. The HCP enrolls the patient in iAssist.</div>
            )}
          </div>
          <div className="border border-[#dddbda] rounded overflow-hidden">
            <div className="flex justify-between px-3 py-2 border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]" style={{ background: "#f3f3f3" }}>
              <span>Copay Claims</span><span className="text-[12px] font-normal text-[#706e6b]">{copayClaimsNow.length} record{copayClaimsNow.length !== 1 ? "s" : ""}</span>
            </div>
            {copayClaimsNow.length === 0 ? (
              <div className="p-6 text-[13px] text-[#706e6b] text-center">No claims filed.</div>
            ) : (
              <table className="w-full text-[12px]">
                <thead><tr className="text-left text-[#706e6b]"><th className="px-3 py-2 font-normal">Claim</th><th className="px-3 py-2 font-normal">Date of service</th><th className="px-3 py-2 font-normal">Submitted</th><th className="px-3 py-2 font-normal">Status</th></tr></thead>
                <tbody>
                  {copayClaimsNow.map((c) => (
                    <tr key={c.id} className="border-t border-[#dddbda]">
                      <td className="px-3 py-2"><SfLink onClick={() => onOpenCopayClaim(c.id)}>{c.id}</SfLink></td>
                      <td className="px-3 py-2">{ymdToMdy(c.dateOfService)}</td>
                      <td className="px-3 py-2">{ymdToMdy(c.submittedAt.slice(0, 10))}</td>
                      <td className="px-3 py-2">{c.status === "in_review" ? "In review" : c.status === "paid" ? "Paid" : "Rejected"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : activeCaseTab === "tasks" ? (
        <div className="p-4">
          <div className="border border-[#dddbda] rounded overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "#f3f3f3" }}>
                  {[
                    { label: "Task Type", sortable: true },
                    { label: "Priority" },
                    { label: "Status" },
                    { label: "Due Date" },
                    { label: "Assigned To" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="text-left px-3 py-2 text-[11px] text-[#706e6b] uppercase tracking-wide font-medium border-b border-[#dddbda] whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && <ArrowUpDown size={10} className="text-[#706e6b]" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Same two tasks Field Portal's "My Tasks" shows for this
                    patient — one shared computation (getLiveWorkItems in
                    WorkflowEngine.ts) drives status/visibility in both
                    places, so they can't disagree with each other or with
                    this case's own live Enrollment Assistance (EA-14272)
                    stage card. */}
                {getLiveWorkItems({
                  enrollmentStatus: workflowData.enrollmentStatus,
                  consentStatus,
                  biStatus,
                  paStatus,
                  appealStatus,
                  infusionDate: workflowData.infusionDate,
                  flowType,
                }).map((item) => (
                  <tr key={item.id} className="hover:bg-[#f3f3f3] transition-colors">
                    <td className="px-3 py-2.5 border-b border-[#dddbda] font-medium cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                      {item.refId}
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                      {item.priority}
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda]">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: item.status === "Closed" ? "var(--crm-primary-30, #e8f4ef)" : "#fff3cd", color: item.status === "Closed" ? "#2e844a" : "#856404" }}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                      {item.dueDate}
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                      {item.assignedTo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-[13px] text-[#706e6b] text-center">
          No {caseTabs.find((t) => t.id === activeCaseTab)?.label} records found.
        </div>
      )}
    </>
  );
}
