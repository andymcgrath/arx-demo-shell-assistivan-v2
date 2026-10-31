import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import { usePatientStore } from "@/store/patientStore";
import { usePersonaState, useWorkflowActor, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { getLiveWorkItems } from "@/engine/WorkflowEngine";
import { dateFromToday, daysFromToday, formatShortDate } from "@/lib/relativeDate";
import { useSelector } from "@xstate/react";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { FileText } from "lucide-react";
import { enrollmentFormDocument, summaryOfBenefitsDocument } from "@/brand/documents";
import { BenefitsPanel } from "../components/BenefitsPanel";
import { PAYER } from "../payerFacts";
import { FieldRow, Section, SfLink, SF_BLUE, SF_SECTION_BG } from "../components/SfPrimitives";
import { scenarioFor, scenarioHasModule } from "@/workflows/scenarios";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { BRAND } from "@/brand";
import { buildCrmStages } from "../stages/buildStages";
import { crmFlags } from "../stages/flags";
import type { Stage } from "../stages/types";
import { caseDocuments } from "@/brand/caseDocuments";
import { ymdToMdy } from "@/portals/iassist/data/submissionStatus";
import { copayBalance, copayMemberId, COPAY_ANNUAL_MAX } from "@/portals/iassist/data/copayProgram";
import {
  ChevronDown,
  User,
  X,
  Zap,
  Settings,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  Send,
} from "lucide-react";
import { FC_BLUE, SfButton, SectionHeader } from "../components/SfControls";
import { StageCard } from "../components/StageCard";
import { CASE_HOME, crmActions, type CrmAction, type CrmCan } from "../stages/actions";
import { CASE_TABS, RIGHT_TABS, type RelatedDocument, type PharmacyOption, SPECIALTY_PHARMACIES, ARX_PHARMACY, SITES_OF_CARE, FAX_DOCUMENTS, PA_FORM_DOCUMENT } from "../caseData";
import { CaseListView } from "../components/CaseListView";



// ─── Main CRM Record Page ────────────────────────────────────────────────────



export default function Index() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('crm');
  const dispatch = useWorkflowDispatch();
  const actor = useWorkflowActor();
  const enrollmentStatus = useSelector(
    actor,
    (snapshot) => snapshot.context.workflowData.enrollmentStatus
  );

  // WF3 used to default to a "My Cases" list (mirrors a real Salesforce
  // Service Console) rather than jumping straight into a case-detail view —
  // now it opens straight on Keanu's case detail like every other flow. The
  // list is still fully wired (CasesList below, reachable via "← Back to
  // Cases" once hubView flips to "list"), just no longer the entry point.
  const [hubView, setHubView] = useState<"list" | "detail">("detail");

  useEffect(() => {
    if (enrollmentStatus === 'none') {
      navigate('/');
      const currentFlowType = useDemoStore.getState().flowType;
      const facts = scenarioFacts(currentFlowType);
      if (facts.hasPricingFork || facts.isCoverageScenario) {
        setHubView("detail");
      }
    }
  }, [enrollmentStatus, navigate]);

  // Once the patient confirms consent there's real work to look at — jump
  // straight into Keanu's case detail instead of leaving the operator on
  // the case list. Guarded by a ref so it only fires on that transition,
  // not every time hubView happens to be "list" while consent is confirmed
  // (otherwise clicking "Back to Cases" afterward would just get overridden).
  const autoOpenedOnConsentRef = useRef(false);
  useEffect(() => {
    const facts = scenarioFacts(workflowData.flowType);
    if (!facts.hasPricingFork && !facts.isCoverageScenario) return;
    if (workflowData.consentStatus === "confirmed") {
      if (!autoOpenedOnConsentRef.current) {
        autoOpenedOnConsentRef.current = true;
        setHubView("detail");
      }
    } else {
      autoOpenedOnConsentRef.current = false;
    }
  }, [workflowData.flowType, workflowData.consentStatus]);

  const patientName = usePatientStore((s) => s.patientName);
  const drugName = usePatientStore((s) => s.drugName);
  const dosageForm = usePatientStore((s) => s.dosageForm);
  const phone = usePatientStore((s) => s.phone);
  const payer = usePatientStore((s) => s.payer);
  const caseNumber = usePatientStore((s) => s.caseNumber);
  const deliveryAddress = usePatientStore((s) => s.deliveryAddress);
  const patientDob = usePatientStore((s) => s.patientDob);
  const patientEmail = usePatientStore((s) => s.email);
  const npi = usePatientStore((s) => s.npi);
  const patientInitials = patientName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const patientFirstName = patientName.split(" ")[0] ?? patientName;
  const patientLastName = patientName.split(" ").slice(1).join(" ") || patientName;
  // deliveryAddress is stored as a single "Street, City, State ZIP" string —
  // split it into the pieces the mock enrollment form displays separately.
  const [deliveryAddressStreet, ...deliveryAddressRest] = deliveryAddress.split(", ");
  const deliveryAddressCityStateZip = deliveryAddressRest.join(", ");

  const flowType = workflowData.flowType;
  const consentStatus = workflowData.consentStatus;
  const biStatus = workflowData.biStatus;
  const biResult = workflowData.biResult;
  const paStatus = workflowData.paStatus;
  const appealStatus = workflowData.appealStatus;
  const paApprovedAt = workflowData.paApprovedAt;
  const papSmsSent = workflowData.papSmsSent;
  const dispatchStatus = workflowData.dispatchStatus;
  const pharmacyStatus = workflowData.pharmacyStatus;
  const selectedPharmacy = workflowData.selectedPharmacy;
  const cashOfferStatus = workflowData.cashOfferStatus;
  const paymentVerified = workflowData.paymentVerified;
  const patientShipDate = workflowData.patientShipDate;
  const copayEnrolled = workflowData.copayEnrolled;
  const providerTransferStatus = workflowData.providerTransferStatus;
  const pharmacyBenefitStatus = workflowData.pharmacyBenefitStatus;
  const medicalBenefitStatus = workflowData.medicalBenefitStatus;
  const {
    isFaxFlow, isPapFlow, isCoaFlow, isCoverageFlow, isIAssistFlow, isIAssistPapFlow, isFreeDrug,
    isBuyAndBill, isCoverageRetailFlow,
  } = crmFlags(workflowData);

  // Summary of Benefits — only appears in Related Documents once the PA is
  // actually approved (not just submitted). Dated to the live PA approval
  // timestamp so it tracks whenever the demo operator actually clicks
  // through, per the relativeDate.ts "sliding window" convention.
  const sobDateLabel = formatShortDate(paApprovedAt ? new Date(paApprovedAt) : dateFromToday(0));
  const sobDocuments: RelatedDocument[] = paStatus === "approved"
    ? [{
        fileId: "SOB-2026-00512",
        fileName: `${patientName}-SOB-${sobDateLabel}.pdf`,
        dateReceived: sobDateLabel,
        type: "Summary of Benefits",
        pages: 2,
        href: summaryOfBenefitsDocument().file,
      }]
    : [];
  const enrollmentFormTabOpen = useDemoStore((s) => s.enrollmentFormTabOpen);
  const closeEnrollmentFormTab = useDemoStore((s) => s.closeEnrollmentFormTab);
  const openEnrollmentFormTab = useDemoStore((s) => s.openEnrollmentFormTab);
  // Related Documents: the enrollment form (fax flows), the brand's PA form (non-PAP flows), and the
  // Summary of Benefits once the PA is approved.
  // An HCP-administered case (eMedBV in iAssist) shows the same documents iAssist and the Field portal show.
  const sharedCaseDocs = scenarioHasModule(flowType, "benefit_verification")
    ? caseDocuments(workflowData, scenarioHasModule(flowType, "financial_assistance")).map((c): RelatedDocument => ({
        fileId: c.id,
        fileName: c.name,
        dateReceived: formatShortDate(dateFromToday(0)),
        type: c.type,
        pages: c.pages,
        href: c.file,
      }))
    : null;
  const relatedDocuments: RelatedDocument[] = sharedCaseDocs ?? [
    ...(isFaxFlow ? FAX_DOCUMENTS : []),
    ...(PA_FORM_DOCUMENT && !isPapFlow ? [PA_FORM_DOCUMENT] : []),
    ...sobDocuments,
  ];
  // Triage pharmacy dropdowns include ARx Pharmacy only for PAP/Income
  // Verification workflows.
  const pharmacyOptions = isPapFlow ? [...SPECIALTY_PHARMACIES, ARX_PHARMACY] : SPECIALTY_PHARMACIES;
  // iAssist_PAP (WF5) dispenses via an in-house site of care rather than a
  // specialty pharmacy — only the Office Dispense dropdown swaps to
  // SITES_OF_CARE; Patient Preferred/Payer Mandated/Program Mandated stay on
  // the standard pharmacyOptions list since those still describe a
  // hypothetical outside pharmacy the case COULD have used.
  const officeDispenseOptions = isIAssistPapFlow ? SITES_OF_CARE : pharmacyOptions;
  // The scenario's recipe says whether the CRM shows the benefits panel.
  const showBenefitsPanel = !!scenarioFor(flowType)?.recipe?.panels?.includes("benefits");
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [productDetailModalOpen, setProductDetailModalOpen] = useState(false);
  const [selectedPharmacyType, setSelectedPharmacyType] = useState<"preferred" | "payer" | "program" | "dispenser" | null>(null);
  const [preferredPharmacy, setPreferredPharmacy] = useState<PharmacyOption | null>(null);
  const [payerPharmacy, setPayerPharmacy] = useState<PharmacyOption | null>(null);
  const [programPharmacy, setProgramPharmacy] = useState<PharmacyOption | null>(null);
  const [dispenserPharmacy, setDispenserPharmacy] = useState<PharmacyOption | null>(null);
  const [activeCaseTab, setActiveCaseTab] = useState("summary");
  // Copay is its own tab only when the recipe has a copay module.
  const caseTabs = isBuyAndBill ? [CASE_TABS[0], CASE_TABS[1], { id: "copay", label: "Copay" }, ...CASE_TABS.slice(2)] : CASE_TABS;
  const copayClaimsNow = workflowData.copayClaims ?? [];
  const [openCopayClaimId, setOpenCopayClaimId] = useState<string | null>(null);
  const openCopayClaim = copayClaimsNow.find((c) => c.id === openCopayClaimId) ?? null;
  const [activeRightTab, setActiveRightTab] = useState("quick-answers");
  const [caseSummaryCollapsed, setCaseSummaryCollapsed] = useState(false);
  const [stagesCollapsed, setStagesCollapsed] = useState(false);
  // Stores IDs, not Stage objects — a Stage object snapshot from the moment
  // a tab was opened would go stale the instant workflowData changed again
  // (e.g. EA-14272 opened before patient consent, still showing "Pending"
  // afterward). The tab strip below re-looks each ID up in the live
  // STAGES_LIVE array every render, same pattern as `activeStage`.
  const [openStageTabs, setOpenStageTabs] = useState<string[]>([]);
  const [activeTopTab, setActiveTopTab] = useState<string>("keanu");
  const [activePatientSubTab, setActivePatientSubTab] = useState<"onboarding" | "enrollment-form">(
    () => enrollmentFormTabOpen ? "enrollment-form" : "onboarding"
  );
  const openSubTabs: Array<"onboarding" | "enrollment-form"> = ["onboarding", ...(enrollmentFormTabOpen ? ["enrollment-form" as const] : [])];

  // Tab state above is local and has no memory of the outer workflow reset —
  // CrmPortal's ResetToHome only resets the *router path* ("/" -> "/" is a
  // no-op that doesn't remount this component), so a previously-open stage
  // tab (e.g. "Appeal") survives both "Reset All" and the stage-jump ladder.
  // That's how a reset to WF5's Stage 6 could appear to silently resolve the
  // Appeal to "Approved": if the Appeal tab (A-14275) was already active,
  // resetActorToStage()'s DENY_PA→INITIATE_APPEAL jump flips appealStatus to
  // 'initiated' while that tab is still open, which immediately (and
  // invisibly, from the user's perspective) satisfies the "opened Appeals
  // tab + appealStatus initiated" VIEW_STAGE effect below — the machine approves
  // the appeal 2.5s later, despite nobody having actually opened that tab
  // themselves in this session. Snapping back to the "keanu" home tab on
  // every reset (mirroring ResetToHome/StateDrivenNav's own resetNonce
  // pattern) means that effect can only fire from a deliberate, fresh click
  // into the tab afterward, not as a side effect of the reset itself.
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const lastResetNonceRef = useRef(resetNonce);
  useEffect(() => {
    if (resetNonce === lastResetNonceRef.current) return;
    lastResetNonceRef.current = resetNonce;
    setOpenStageTabs([]);
    setActiveTopTab("keanu");
  }, [resetNonce]);

  const scrollToTop = () => {
    const scrollable = document.querySelector(".overflow-y-auto");
    if (scrollable) {
      scrollable.scrollTop = 0;
    }
  };

  useEffect(() => {
    if (!enrollmentFormTabOpen && activePatientSubTab === "enrollment-form") {
      setActivePatientSubTab("onboarding");
    }
  }, [enrollmentFormTabOpen]);

  // The workflow machine owns the automation (workflows/<name>/rules.ts, `then`): BI starts
  // when the referral lands (erx) or when the patient consents (fax and e-sign), and a PA
  // starts on its own only for erx workflows. This page only reports what the agent is
  // looking at. The machine owns the 3 second delay and the outcome. Leaving a stage
  // cancels a pending reveal.
  //
  // BI: opening the stage while BI runs. The branch the BI takes (CoA_Coverage's coverage outcome) is the
  // `bi` fork's choice, which lives in the machine, so the event carries nothing extra.
  useEffect(() => {
    if (activeTopTab !== 'BI-14273') return;
    if (biStatus !== 'running') return;
    dispatch('VIEW_STAGE', { portal: 'crm', stage: 'BI' });
    return () => dispatch('LEAVE_STAGE', { portal: 'crm', stage: 'BI' });
  }, [activeTopTab, biStatus, dispatch]);

  // PA: opening the stage while the PA is submitted. The scenario decides approve or deny.
  useEffect(() => {
    if (activeTopTab !== 'PA-14274') return;
    if (paStatus !== 'submitted') return;
    dispatch('VIEW_STAGE', { portal: 'crm', stage: 'PA' });
    return () => dispatch('LEAVE_STAGE', { portal: 'crm', stage: 'PA' });
  }, [activeTopTab, paStatus, dispatch]);

  // Action Factory bridge: once the presenter creates & activates the
  // "Initiate Appeal — Upon PA Denial" rule in the Rules portal
  // (rulesPortalStore's appealRuleActive — see that store's "Bridge to the
  // real engine" header section), auto-file the appeal on any iAssist_PAP
  // case currently sitting at PA Denied — including one that got there
  // before the rule existed. That's the live "watch the stuck case spring
  // into motion" moment the rule was built to demonstrate, not a "reset and
  // rerun" requirement. appealStatus flipping to 'initiated' after the first
  // run is what stops this from re-firing on every re-render/tab switch.
  const appealRuleActive = useRulesPortalStore((s) => s.appealRuleActive);
  // Reports the Rules portal state to the machine. The machine files the appeal
  // (workflows/iassist/rules.ts, SET_APPEAL_RULE and DENY_PA). Sent again after a
  // reset, because a reset clears the machine's copy but not the Rules portal's.
  useEffect(() => {
    if (!scenarioFacts(flowType).isIassistAppeal) return;
    dispatch('SET_APPEAL_RULE', { portal: 'crm', active: appealRuleActive });
  }, [flowType, appealRuleActive, resetNonce, dispatch]);

  // Payer-response follow-up: opening the Appeals stage tab shows the payer's
  // answer a few seconds later. The machine owns the delay (rules.ts, VIEW_STAGE).
  useEffect(() => {
    if (activeTopTab !== 'A-14275') return;
    if (appealStatus !== 'initiated') return;
    dispatch('VIEW_STAGE', { portal: 'crm', stage: 'APPEAL' });
    return () => dispatch('LEAVE_STAGE', { portal: 'crm', stage: 'APPEAL' });
  }, [activeTopTab, appealStatus, dispatch]);

  // CoA_Coverage: the provider transfer notice follows the agent opening the
  // Provider Transfer stage. The machine owns the delay (rules.ts, VIEW_STAGE).
  useEffect(() => {
    if (activeTopTab !== 'PT-14282') return;
    if (biStatus !== 'complete' || medicalBenefitStatus !== 'covered') return;
    if (providerTransferStatus !== 'none') return;
    dispatch('VIEW_STAGE', { portal: 'crm', stage: 'PROVIDER_TRANSFER' });
    return () => dispatch('LEAVE_STAGE', { portal: 'crm', stage: 'PROVIDER_TRANSFER' });
  }, [activeTopTab, biStatus, medicalBenefitStatus, providerTransferStatus, dispatch]);

  // Visual-only: show "Transferring to pharmacy..." for 3 seconds
  // after dispatch, then show "Dispatched" badge.
  // Does not update any store state.
  useEffect(() => {
    if (dispatchStatus !== 'dispatched') {
      setTriageDispatched(false);
      return;
    }
    const timer = setTimeout(() => {
      setTriageDispatched(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [dispatchStatus]);

  const STAGES_LIVE: Stage[] = buildCrmStages(workflowData);

  const [triageDispatched, setTriageDispatched] = useState(false);

  const handleOpenStage = (stage: Stage) => {
    setOpenStageTabs((prev) =>
      prev.includes(stage.id) ? prev : [...prev, stage.id]
    );
    setActiveTopTab(stage.id);
    scrollToTop();
  };

  const handleCloseStageTab = (stageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenStageTabs((prev) => prev.filter((id) => id !== stageId));
    if (activeTopTab === stageId) setActiveTopTab("keanu");
  };

  const activeStage = STAGES_LIVE.find((s) => s.id === activeTopTab);

  // The buttons and badges on the open stage. `enabled` is the machine's own answer (stages/actions.ts).
  const can: CrmCan = (e) => actor.getSnapshot().can(e as any);
  const stageActions = activeStage ? crmActions(workflowData, activeStage.id, can) : [];
  const action = (id: string) => stageActions.find((a) => a.id === id);
  const caseActions = crmActions(workflowData, CASE_HOME, can);
  const caseAction = (id: string) => caseActions.find((a) => a.id === id);
  const send = (a: CrmAction) => a.event && dispatch(a.event.type, { portal: a.event.portal });

  if (isCoaFlow && hubView === "list") {
    return (
      <CaseListView
        keanuCaseNumber={enrollmentStatus !== "none" ? caseNumber : null}
        onOpenKeanuCase={() => setHubView("detail")}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Salesforce Sans', Arial, sans-serif", fontSize: 13 }}
    >
      {isCoaFlow && (
        <div className="px-3 py-1.5 border-b border-[#dddbda] bg-[#f3f3f3]">
          <SfLink onClick={() => setHubView("list")}>← Back to Cases</SfLink>
        </div>
      )}
      {/* ── Row 1: Patient Tab Strip ─────────────────────────────────────────── */}
      {/* sticky top-0: keeps the tab strip pinned in view as the single
          scroll container (DemoShell.tsx's Panel, overflow-y-auto) scrolls —
          see the removed per-branch overflow-y-auto/calc(100vh - 130px)
          wrappers below, which used to create a second, independently
          scrolling region and the double-scrollbar bug this replaces. */}
      <div
        className="sticky top-0 z-10 border-b border-[#dddbda] flex items-end px-2 overflow-x-auto gap-1 overflow-y-hidden"
        style={{ background: "#f3f2f2", minHeight: 42 }}
      >
        {/* Active patient tab — identity sourced live from usePatientStore */}
        <div
          className="flex items-center gap-2 px-3 py-2 border border-[#dddbda] cursor-pointer select-none shrink-0 transition-colors"
          style={{
            borderRadius: "4px 4px 0 0",
            marginBottom: -1,
            background: activeTopTab === "keanu" ? "#fff" : "#ebe9e9",
            borderBottomColor: activeTopTab === "keanu" ? "#fff" : "#dddbda",
            boxShadow: activeTopTab === "keanu" ? "0 -1px 3px rgba(0,0,0,0.08)" : "none",
          }}
          onClick={() => {
            setActiveTopTab("keanu");
            scrollToTop();
          }}
        >
          <div
            className="flex items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
            style={{ width: 20, height: 20, background: "linear-gradient(135deg, var(--crm-primary, #2dbcbb) 0%, var(--crm-primary-dark, #16818a) 100%)" }}
          >
            {patientInitials}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-semibold text-[#3e3e3c] whitespace-nowrap">{patientName}</span>
            <span className="text-[10px] text-[#706e6b]">DOB: {patientDob}</span>
          </div>
          <button className="ml-1 p-0.5 rounded hover:bg-[#e5e5e5] transition-colors">
            <X size={11} className="text-[#706e6b]" />
          </button>
        </div>

        {/* Dynamic stage tabs */}
        {openStageTabs.map((stageId) => {
          const stage = STAGES_LIVE.find((s) => s.id === stageId);
          if (!stage) return null;
          const isActive = activeTopTab === stage.id;
          const stageIconBg = stage.isNotStarted ? "#9a9a9a" : FC_BLUE;
          return (
            <div
              key={stage.id}
              className="flex items-center gap-2 px-3 py-2 border border-[#dddbda] cursor-pointer select-none shrink-0 transition-colors"
              style={{
                borderRadius: "4px 4px 0 0",
                marginBottom: -1,
                background: isActive ? "#fff" : "#ebe9e9",
                borderBottomColor: isActive ? "#fff" : "#dddbda",
                boxShadow: isActive ? "0 -1px 3px rgba(0,0,0,0.08)" : "none",
              }}
              onClick={() => {
                setActiveTopTab(stage.id);
                scrollToTop();
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 18, height: 18, background: stageIconBg, borderRadius: 4 }}
              >
                <Zap size={10} className="text-white" fill="white" />
              </div>
              <span className="text-[12px] font-semibold text-[#3e3e3c] whitespace-nowrap max-w-[160px] truncate">
                {stage.name} - {stage.id}
              </span>
              <button
                className="ml-1 p-0.5 rounded hover:bg-[#e5e5e5] transition-colors"
                onClick={(e) => handleCloseStageTab(stage.id, e)}
              >
                <X size={11} className="text-[#706e6b]" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Content area (conditional on active Row 1 tab) ──────────────────── */}
      {activeTopTab === "keanu" ? (
        /* ── Patient view with sub-tabs */
        <>
          {/* Sub-tab strip: Onboarding | FAX-2026-00431 */}
          <div className="border-b border-[#dddbda] flex items-end px-2 gap-0 bg-white">
            {openSubTabs.includes("onboarding") && (
              <button
                onClick={() => setActivePatientSubTab("onboarding")}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] whitespace-nowrap relative shrink-0 transition-colors ${
                  activePatientSubTab === "onboarding" ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
                }`}
                style={{ color: activePatientSubTab === "onboarding" ? SF_BLUE : undefined }}
              >
                <div
                  className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                  style={{ width: 16, height: 16, background: "linear-gradient(135deg, var(--crm-primary, #0176d3) 0%, var(--crm-primary-dark, #014486) 100%)", borderRadius: 3 }}
                >C</div>
                Onboarding
                <span
                  role="button"
                  className="ml-1 flex items-center justify-center rounded hover:bg-[#e5e5e5] transition-colors"
                  style={{ width: 16, height: 16 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activePatientSubTab === "onboarding") setActivePatientSubTab("enrollment-form");
                  }}
                >
                  <X size={10} className="text-[#706e6b]" />
                </span>
                {activePatientSubTab === "onboarding" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: SF_BLUE }} />
                )}
              </button>
            )}
            {openSubTabs.includes("enrollment-form") && (
              <button
                onClick={() => setActivePatientSubTab("enrollment-form")}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] whitespace-nowrap relative shrink-0 transition-colors ${
                  activePatientSubTab === "enrollment-form" ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
                }`}
                style={{ color: activePatientSubTab === "enrollment-form" ? SF_BLUE : undefined }}
              >
                <div
                  className="flex items-center justify-center rounded shrink-0"
                  style={{ width: 16, height: 16, background: "var(--crm-primary-80, #6b5ecd)", borderRadius: 3 }}
                >
                  <FileText size={9} className="text-white" />
                </div>
                <span className="flex flex-col leading-none text-left gap-0">
                  <span>FAX-2026-00431</span>
                  <span className="text-[10px] text-[#706e6b] font-normal">Enrollment Form</span>
                </span>
                <span
                  role="button"
                  className="ml-1 flex items-center justify-center rounded hover:bg-[#e5e5e5] transition-colors"
                  style={{ width: 16, height: 16 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeEnrollmentFormTab();
                    if (activePatientSubTab === "enrollment-form") setActivePatientSubTab("onboarding");
                  }}
                >
                  <X size={10} className="text-[#706e6b]" />
                </span>
                {activePatientSubTab === "enrollment-form" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: SF_BLUE }} />
                )}
              </button>
            )}
          </div>

          {/* Sub-tab content */}
          {activePatientSubTab === "enrollment-form" ? (
        /* ── Enrollment Form View ──────────────────────────────────────────── */
        <div className="bg-white">
          {/* Doc header */}
          <div className="border-b border-[#dddbda] px-6 py-3 flex items-center justify-between" style={{ background: "#f9f9f9" }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded" style={{ width: 36, height: 36, background: "var(--crm-primary-80, #6b5ecd)" }}>
                <FileText size={18} className="text-white" />
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b]">Related Document</div>
                <div className="text-[16px] font-bold text-[#3e3e3c]">FAX-2026-00431</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-[#706e6b]">
              <span>{enrollmentFormDocument().fileName}</span>
              <span>·</span>
              <span>5 pages</span>
              <span>·</span>
              <span>Received {daysFromToday(-4)}</span>
              <span>·</span>
              <span>Fax: 866-725-7218</span>
            </div>
          </div>

          {/* Side-by-side body: parsed data left, PDF right */}
          <div className="flex overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>

            {/* Left panel — extracted form data */}
            <div className="overflow-y-auto p-5 space-y-4 border-r border-[#dddbda]" style={{ width: "45%", minWidth: 320, background: "#fafafa" }}>

              {/* Section 1 — Patient Authorization */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>1</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Patient Authorization</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>Signed</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Patient Signature" value={patientName} />
                  <FieldRow label="Relationship to Patient" value="Self" />
                  <FieldRow label="Date Signed" value={dateFromToday(1).toLocaleDateString()} />
                </div>
              </div>

              {/* Section 2 — Patient Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>2</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Patient Information</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="First Name" value={patientFirstName} />
                  <FieldRow label="Last Name" value={patientLastName} />
                  <FieldRow label="Date of Birth" value={patientDob} />
                  <FieldRow label="Sex" value="M" />
                  <FieldRow label="Mobile Phone" value={phone} />
                  <FieldRow label="Preferred Contact" value="Mobile" />
                  <FieldRow label="Shipping Address" value={deliveryAddressStreet} />
                  <FieldRow label="City, State, ZIP" value={deliveryAddressCityStateZip} />
                  <FieldRow label="Email" value={patientEmail} isLink />
                  <FieldRow label="OK to Leave Voicemail" value="Yes" />
                  <FieldRow label="Best Time" value="Morning" />
                  <FieldRow label="Preferred Language" value="English" />
                </div>
                <div className="px-4 pb-2">
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-1">Alternate Contact</div>
                  <div className="grid grid-cols-2 gap-x-4">
                    <FieldRow label="Name" value={`Maria ${patientLastName}`} />
                    <FieldRow label="Relationship" value="Spouse" />
                    <FieldRow label="Phone" value="(555) 867-5310" />
                    <FieldRow label="Email" value={`maria.${patientLastName.toLowerCase()}@gmail.com`} isLink />
                    <FieldRow label="OK to Discuss" value="Yes" />
                  </div>
                </div>
              </div>

              {/* Section 3 — Insurance Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>3</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Insurance Information</span>
                </div>
                <div className="px-4 pb-2">
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-1">Prescription Drug Insurance</div>
                  <div className="grid grid-cols-2 gap-x-4">
                    <FieldRow label="Payer" value="BlueCross BlueShield of Florida" />
                    <FieldRow label="Phone" value="(800) 477-3736" />
                    <FieldRow label="Policy / Member ID" value="BCB-KR-298341" />
                    <FieldRow label="Rx BIN" value="610415" />
                    <FieldRow label="Rx PCN" value="ADV" />
                  </div>
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-2">Medical Insurance</div>
                  <div className="grid grid-cols-2 gap-x-4">
                    <FieldRow label="Payer" value="BlueCross BlueShield of Florida" />
                    <FieldRow label="Phone" value="(800) 477-3736" />
                    <FieldRow label="Policy / Member ID" value="BCB-KR-298341" />
                  </div>
                </div>
              </div>

              {/* Section 4 — Prescription */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>4</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescription for {drugName}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Drug" value={drugName} />
                  <FieldRow label="Strength / Form" value={dosageForm} />
                  <FieldRow label="Sig" value="Take one tablet by mouth twice per day" />
                  <FieldRow label="Quantity" value="30-day supply" />
                  <FieldRow label="Refills" value="0" />
                  <FieldRow label="Preferred Pharmacy" value="Accredo Health Group Inc." />
                </div>
              </div>

              {/* Section 5 — Clinical Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>5</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Clinical Information</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Diagnosis (ICD-10)" value="J84.112" />
                  <FieldRow label="Diagnosis Description" value="Idiopathic Pulmonary Fibrosis (IPF)" />
                  <FieldRow label="Allergies" value="Penicillin" />
                  <FieldRow label="Prior Therapies" value="Ofev (nintedanib) — discontinued 02/15/20" />
                  <FieldRow label="Concurrent Therapies" value="None" />
                </div>
              </div>

              {/* Section 6 — Prescriber Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>6</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescriber Information</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Prescriber Name" value="Sarah Chen, MD" />
                  <FieldRow label="Facility" value="Orlando Pulmonology Associates" />
                  <FieldRow label="Address" value="1800 Medical Park Dr, Orlando, FL 32803" />
                  <FieldRow label="Phone" value="(407) 885-9999" />
                  <FieldRow label="Fax" value="(407) 885-9998" />
                  <FieldRow label="NPI" value={npi} />
                  <FieldRow label="State License #" value="ME78901" />
                  <FieldRow label="Office Contact" value="Jennifer Torres" />
                  <FieldRow label="Email" value="scheduling@orlandopulm.com" isLink />
                </div>
              </div>

              {/* Section 7 — Prescriber Certification */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "var(--crm-primary-80, #6b5ecd)" }}>7</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescriber Certification</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>Signed</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Prescriber Signature" value="Sarah Chen, MD" />
                  <FieldRow label="Dispense As Written" value="Yes" />
                  <FieldRow label="Date" value={dateFromToday(1).toLocaleDateString()} />
                </div>
              </div>

            </div>

            {/* Right panel — original PDF */}
            <div className="flex flex-col" style={{ flex: 1 }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="text-[12px] font-semibold text-[#3e3e3c]">Original Fax — {enrollmentFormDocument().fileName}</span>
                <a
                  href={enrollmentFormDocument().file}
                  download={enrollmentFormDocument().fileName}
                  className="text-[11px] px-2 py-1 rounded border border-[#dddbda] bg-white text-[var(--crm-primary, #0176d3)] hover:bg-[var(--crm-primary-30, #f0f7ff)] transition-colors"
                >
                  Download
                </a>
              </div>
              <object
                data={enrollmentFormDocument().file}
                type="application/pdf"
                className="flex-1 w-full"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[#706e6b]" style={{ background: "#f9f9f9" }}>
                  <FileText size={40} className="opacity-30" />
                  <div className="text-[13px] font-medium">PDF preview not available</div>
                  <div className="text-[11px]">Add <code className="bg-[#f0f0f0] px-1 rounded">{enrollmentFormDocument().file}</code> under <code className="bg-[#f0f0f0] px-1 rounded">public/</code> to enable preview</div>
                </div>
              </object>
            </div>

          </div>
        </div>
          ) : null}
        </>
      ) : activeStage ? (
        activeStage.id === "CO-14281" ? (
          /* ── Cash Offer Detail View (COA flow) ────────────────────────── */
          <div className="p-4 max-w-5xl">
            <div className="border border-[#dddbda] rounded">
              <div
                className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
                style={{ background: SF_SECTION_BG, minHeight: 36 }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 24, height: 24, background: paymentVerified ? "#2e844a" : FC_BLUE, borderRadius: 5 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M7 12.5l3 3 7-7"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">
                  Cash Offer — {activeStage.id}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Cash Offer Details */}
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-2 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Cash Offer Details</span>
                  </div>
                  <div className="space-y-0">
                    <FieldRow label="Offer Status" value={cashOfferStatus === "none" ? "Not Started" : cashOfferStatus === "sent" ? "Sent" : "Paid"} />
                    <FieldRow label="Payment Status" value={paymentVerified ? "Verified" : "Pending Verification"} />
                    <FieldRow label="Ship Date" value={patientShipDate ? new Date(patientShipDate).toLocaleDateString() : "Not set"} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 items-center">
                  {/* CoA_Coverage (Scenario 3) never submits a PA, so this
                      button's original "Send Cash Offer" gate — which
                      requires paStatus === "denied" — can never pass;
                      that's a CoA_DTP/Copay-only precondition (cash offer
                      there only exists after a PA denial). CoA_Coverage's price
                      is shown straight to the patient in-app (PADenied.tsx's
                      isCoverageFlow branch) with no CRM "send" action at all —
                      there's no SEND_CASH_OFFER handler in workflows/coassist/ for
                      this button to even dispatch to — so skip it for this
                      flow and show a status label instead. */}
                  {!action("cash_offer.send") ? (
                    <span className="text-[12px] font-semibold px-2.5 py-1.5 rounded" style={{ background: "#f3f2f2", color: "#3e3e3c" }}>
                      {biStatus === "complete" ? "Cash price presented to patient in-app" : "Awaiting Benefits Investigation"}
                    </span>
                  ) : (
                    <button
                      onClick={() => send(action("cash_offer.send")!)}
                      disabled={!action("cash_offer.send")!.enabled}
                      className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: action("cash_offer.send")!.enabled ? FC_BLUE : "#ccc" }}
                    >
                      Send Cash Offer
                    </button>
                  )}
                  <button
                    onClick={() => send(action("cash_offer.verify")!)}
                    disabled={!action("cash_offer.verify")!.enabled}
                    className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: action("cash_offer.verify")!.enabled ? FC_BLUE : "#ccc" }}
                  >
                    Verify Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : isCoaFlow && activeStage.id === "PA-14274" && paStatus === "denied" ? (
          /* ── COA PA Denial Detail View (mirrors approval structure) ──────── */
          <div>
            {/* PA Record Header */}
            <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
              <div className="text-[11px] text-[#706e6b] mb-0.5">Prior Authorization Denial</div>
              <div className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                  >
                    PA
                  </div>
                  <h1 className="text-[20px] font-bold text-[#3e3e3c]">PA-14274</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold px-3 py-1 rounded" style={{ background: "#fee2e2", color: "#dc2626" }}>
                    ✕ Denied
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information section */}
              <div className="flex-1 min-w-0 p-4 space-y-4">
                {/* Information section */}
                <Section title="Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Patient" value={patientName} isLink />
                      <FieldRow label="Case" value="00056249" isLink />
                      <FieldRow label="Denial Reason" value="Medical necessity criteria not met" />
                      <FieldRow label="Stage Age (Business Hours)" value="1 hour, 45 minutes" />
                    </div>
                    <div>
                      <FieldRow label="Status" value="Denied" />
                      <FieldRow label="Sub-Status" value="Denied — Appeal Eligible" />
                      <FieldRow label="No Status Change Needed" value="—" />
                      <FieldRow label="Owner" value="Product Owner" />
                    </div>
                  </div>
                </Section>

                {/* Prior Authorization Information section */}
                <Section title="Prior Authorization Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Authorization Number" value="PA-2026-001234" />
                      <FieldRow label="Call Reference Number" value="REF-789456" />
                      <FieldRow label="Initiation Source" value="Fax" />
                      <FieldRow label="External Comments" value="Denied — medical necessity not established" />
                      <FieldRow label="Internal Comments" value="PA denied by payer; patient eligible for cash pay program" />
                      <FieldRow label="Payer Notes" value="Appeal rights available within 60 days" />
                    </div>
                    <div>
                      <FieldRow label="Prior Authorization ID" value="SELECTED_Template_51" />
                      <FieldRow label="Last PA Fax Sent Date" value={dateFromToday(-3).toLocaleDateString()} />
                      <FieldRow label="Denial Date" value={new Date().toLocaleDateString()} />
                      <FieldRow label="Appeal Deadline" value={dateFromToday(57).toLocaleDateString()} />
                      <FieldRow label="PA Requirements Communicated" value="Yes" />
                      <FieldRow label="PA Requirement Communicated Date/Time" value={`${new Date().toLocaleDateString()}, 10:30 AM`} />
                    </div>
                  </div>
                </Section>

                {/* Call Details section */}
                <Section title="Call Authorization Details">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Prior Authorization Fax #" value="1-800-PA-RECEIVED" />
                      <FieldRow label="Prior Authorization Phone #" value="(407) 885-9999" />
                    </div>
                    <div>
                      <FieldRow label="Auth Decision (Fax #)" value="Denied" />
                    </div>
                  </div>
                </Section>

                {/* Info Box */}
                <div className="border-l-4 p-4 rounded" style={{ borderColor: "#F59E0B", background: "#FEF3C7" }}>
                  <p className="text-[13px] font-semibold mb-2" style={{ color: "#92400E" }}>Patient Eligibility Update</p>
                  <p className="text-[12px]" style={{ color: "#92400E" }}>
                    Patient is eligible for cash pay program — proceed to Cash Offer stage to send offer and collect payment.
                  </p>
                </div>
              </div>

              {/* Right: Denial Status Panel */}
              <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Denial Status</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#dc2626" }}>
                        ✕
                      </div>
                      <div>
                        <div className="text-[11px] text-[#706e6b]">Status</div>
                        <div className="text-[13px] font-semibold text-[#3e3e3c]">Denied</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Denied By</div>
                      <div className="text-[13px] text-[#3e3e3c]">Payer — BlueCross BlueShield</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Denial Date</div>
                      <div className="text-[13px] text-[#3e3e3c]">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Appeal Deadline</div>
                      <div className="text-[13px] text-[#3e3e3c]">{dateFromToday(57).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : !isCoaFlow && activeStage.id === "PA-14274" && paStatus === "denied" ? (
          /* ── PA Denial Detail View (mirrors approval structure) ────────────
             WF1/WF4/WF5's denial path — CoA_DTP has its own version above
             (cash-pay offer instead of an appeal, its own record data).
             iAssist_PAP (WF5) is the one flow with a real appealStatus field
             (see workflows/iassist/rules.ts) — the info box below and the right
             rail react to it live; every other flow leaves appealStatus at
             'none' forever, so they always see the "recommended" copy. */
          <div>
            {/* PA Record Header */}
            <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
              <div className="text-[11px] text-[#706e6b] mb-0.5">Prior Authorization Denial</div>
              <div className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                  >
                    PA
                  </div>
                  <h1 className="text-[20px] font-bold text-[#3e3e3c]">PA-14274</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold px-3 py-1 rounded" style={{ background: "#fee2e2", color: "#dc2626" }}>
                    ✕ Denied
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information section */}
              <div className="flex-1 min-w-0 p-4 space-y-4">
                {/* Information section */}
                <Section title="Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Patient" value={patientName} isLink />
                      <FieldRow label="Case" value={caseNumber} isLink />
                      <FieldRow label="Denial Reason" value="Medical necessity criteria not met" />
                      <FieldRow label="Stage Age (Business Hours)" value="1 hour, 45 minutes" />
                    </div>
                    <div>
                      <FieldRow label="Status" value="Denied" />
                      <FieldRow label="Sub-Status" value={appealStatus === "approved" ? "Denied — Appeal Approved" : appealStatus === "initiated" ? "Denied — Appeal Filed" : "Denied — Appeal Eligible"} />
                      <FieldRow label="No Status Change Needed" value="—" />
                      <FieldRow label="Owner" value="Product Owner" />
                    </div>
                  </div>
                </Section>

                {/* Prior Authorization Information section */}
                <Section title="Prior Authorization Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Authorization Number" value="PA-2026-001234" />
                      <FieldRow label="Call Reference Number" value="REF-789456" />
                      <FieldRow label="Initiation Source" value="Fax" />
                      <FieldRow label="External Comments" value="Denied — medical necessity not established" />
                      <FieldRow label="Internal Comments" value={appealStatus === "approved" ? "PA denied by payer; appeal filed and approved on review" : appealStatus === "initiated" ? "PA denied by payer; appeal filed and awaiting response" : "PA denied by payer; appeal recommended"} />
                      <FieldRow label="Payer Notes" value="Appeal rights available within 60 days" />
                    </div>
                    <div>
                      <FieldRow label="Prior Authorization ID" value="SELECTED_Template_51" />
                      <FieldRow label="Last PA Fax Sent Date" value={dateFromToday(-3).toLocaleDateString()} />
                      <FieldRow label="Denial Date" value={new Date().toLocaleDateString()} />
                      <FieldRow label="Appeal Deadline" value={dateFromToday(57).toLocaleDateString()} />
                      <FieldRow label="PA Requirements Communicated" value="Yes" />
                      <FieldRow label="PA Requirement Communicated Date/Time" value={`${new Date().toLocaleDateString()}, 10:30 AM`} />
                    </div>
                  </div>
                </Section>

                {/* Call Details section */}
                <Section title="Call Authorization Details">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Prior Authorization Fax #" value="1-800-PA-RECEIVED" />
                      <FieldRow label="Prior Authorization Phone #" value="(407) 885-9999" />
                    </div>
                    <div>
                      <FieldRow label="Auth Decision (Fax #)" value="Denied" />
                    </div>
                  </div>
                </Section>

                {/* Info Box — reacts live to appealStatus (iAssist_PAP/WF5's
                    own field, see workflows/iassist/rules.ts); every other flow
                    leaves appealStatus at 'none' so it always shows the
                    "recommended" copy below. */}
                {appealStatus === "approved" ? (
                  <div className="border-l-4 p-4 rounded" style={{ borderColor: "#2e844a", background: "var(--crm-primary-30, #e8f4ef)" }}>
                    <p className="text-[13px] font-semibold mb-2" style={{ color: "#1a4d2a" }}>Appeal Approved</p>
                    <p className="text-[12px]" style={{ color: "#1a4d2a" }}>
                      The payer overturned this denial on appeal. See the Appeals stage for the full outcome.
                    </p>
                  </div>
                ) : appealStatus === "initiated" ? (
                  <div className="border-l-4 p-4 rounded" style={{ borderColor: "var(--crm-primary, #0176d3)", background: "var(--crm-primary-30, #eef4ff)" }}>
                    <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--crm-primary-dark, #014486)" }}>Appeal Filed</p>
                    <p className="text-[12px]" style={{ color: "var(--crm-primary-dark, #014486)" }}>
                      An appeal has been submitted on this denial. See the Appeals stage for status — fulfillment has moved forward while the payer reviews it.
                    </p>
                  </div>
                ) : (
                  <div className="border-l-4 p-4 rounded" style={{ borderColor: "#F59E0B", background: "#FEF3C7" }}>
                    <p className="text-[13px] font-semibold mb-2" style={{ color: "#92400E" }}>Appeal Recommended</p>
                    <p className="text-[12px]" style={{ color: "#92400E" }}>
                      Prior authorization was denied. File an appeal from the Appeals stage to continue toward fulfillment.
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Denial Status Panel */}
              <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Denial Status</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#dc2626" }}>
                        ✕
                      </div>
                      <div>
                        <div className="text-[11px] text-[#706e6b]">Status</div>
                        <div className="text-[13px] font-semibold text-[#3e3e3c]">Denied</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Denied By</div>
                      <div className="text-[13px] text-[#3e3e3c]">Payer — {payer}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Denial Date</div>
                      <div className="text-[13px] text-[#3e3e3c]">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">{appealStatus !== "none" ? "Appeal Status" : "Appeal Deadline"}</div>
                      <div className="text-[13px] text-[#3e3e3c]">{appealStatus === "approved" ? "Approved" : appealStatus === "initiated" ? "Filed — Awaiting Response" : dateFromToday(57).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeStage.id === "PA-14274" && paStatus === "approved" ? (
          /* ── PA Approval Detail View (post-approval) ──────────────────────── */
          <div>
            {/* PA Record Header */}
            <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
              <div className="text-[11px] text-[#706e6b] mb-0.5">Prior Authorization Approval</div>
              <div className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg, #2e844a 0%, #1a4d2a 100%)" }}
                  >
                    PA
                  </div>
                  <h1 className="text-[20px] font-bold text-[#3e3e3c]">PA-14274</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold px-3 py-1 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>
                    ✓ Approved
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information section */}
              <div className="flex-1 min-w-0 p-4 space-y-4">
                {/* Information section */}
                <Section title="Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Patient" value={patientName} isLink />
                      <FieldRow label="Case" value="00056249" isLink />
                      <FieldRow label="Prescriber Notes" value="Requires prior authorization for coverage" />
                      <FieldRow label="Stage Age (Business Hours)" value="2 hours, 15 minutes" />
                    </div>
                    <div>
                      <FieldRow label="Status" value="Approved" />
                      <FieldRow label="Sub-Status" value="Approved" />
                      <FieldRow label="No Status Change Needed" value="—" />
                      <FieldRow label="Owner" value="Product Owner" />
                    </div>
                  </div>
                </Section>

                {/* Prior Authorization Information section */}
                <Section title="Prior Authorization Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Authorization Number" value="PA-2026-001234" />
                      <FieldRow label="Call Reference Number" value="REF-789456" />
                      <FieldRow label="Initiation Source" value="Fax" />
                      <FieldRow label="External Comments" value="Approved for 12 months coverage" />
                      <FieldRow label="Internal Comments" value="Standard PA approved per medical necessity" />
                      <FieldRow label="Payer Notes" value="No specific restrictions noted" />
                    </div>
                    <div>
                      <FieldRow label="Prior Authorization ID" value="SELECTED_Template_51" />
                      <FieldRow label="Last PA Fax Sent Date" value={dateFromToday(0).toLocaleDateString()} />
                      <FieldRow label="Effective Date" value={dateFromToday(0).toLocaleDateString()} />
                      <FieldRow label="Expiration Date" value={dateFromToday(365).toLocaleDateString()} />
                      <FieldRow label="PA Requirements Communicated" value="Yes" />
                      <FieldRow label="PA Requirement Communicated Date/Time" value={`${dateFromToday(0).toLocaleDateString()}, 10:30 AM`} />
                    </div>
                  </div>
                </Section>

                {/* Call Details section (if applicable) */}
                <Section title="Call Authorization Details">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Prior Authorization Fax #" value="1-800-PA-RECEIVED" />
                      <FieldRow label="Prior Authorization Phone #" value="(407) 885-9999" />
                    </div>
                    <div>
                      <FieldRow label="Auth Approval (Fax #" value="Approved" />
                    </div>
                  </div>
                </Section>
              </div>

              {/* Right: Approval Status Panel */}
              <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Approval Status</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#2e844a" }}>
                        ✓
                      </div>
                      <div>
                        <div className="text-[11px] text-[#706e6b]">Status</div>
                        <div className="text-[13px] font-semibold text-[#3e3e3c]">Approved</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Approved By</div>
                      <div className="text-[13px] text-[#3e3e3c]">Provider Portal</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Approval Date</div>
                      <div className="text-[13px] text-[#3e3e3c]">{paApprovedAt ? new Date(paApprovedAt).toLocaleDateString() : dateFromToday(0).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Valid Until</div>
                      <div className="text-[13px] text-[#3e3e3c]">{dateFromToday(365).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeStage.id === "A-14275" && appealStatus === "approved" ? (
          /* ── Appeal Approval Detail View (post-payer-response) ────────────
             Mirrors the PA Approval Detail View's structure above — same
             record-header/Information/right-rail shape, relabeled for the
             Appeals stage's own resolved outcome. Only reachable for
             iAssist_PAP (WF5); see appealStage's 'approved' branch and the
             VIEW_STAGE effect above (activeTopTab === 'A-14275'). */
          <div>
            {/* Appeal Record Header */}
            <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
              <div className="text-[11px] text-[#706e6b] mb-0.5">Appeal Approval</div>
              <div className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg, #2e844a 0%, #1a4d2a 100%)" }}
                  >
                    A
                  </div>
                  <h1 className="text-[20px] font-bold text-[#3e3e3c]">A-14275</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold px-3 py-1 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>
                    ✓ Approved
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information section */}
              <div className="flex-1 min-w-0 p-4 space-y-4">
                {/* Information section */}
                <Section title="Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Patient" value={patientName} isLink />
                      <FieldRow label="Case" value={caseNumber} isLink />
                      <FieldRow label="Appeal Reason" value="Prior authorization denial — medical necessity" />
                      <FieldRow label="Stage Age (Business Hours)" value="2 hours, 30 minutes" />
                    </div>
                    <div>
                      <FieldRow label="Status" value="Approved" />
                      <FieldRow label="Sub-Status" value="Approved on Appeal" />
                      <FieldRow label="No Status Change Needed" value="—" />
                      <FieldRow label="Owner" value="Product Owner" />
                    </div>
                  </div>
                </Section>

                {/* Appeal Information section */}
                <Section title="Appeal Information">
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Appeal Number" value="APL-2026-000842" />
                      <FieldRow label="Related Authorization" value="PA-2026-001234" isLink />
                      <FieldRow label="Submission Source" value="Action Factory — Automated" />
                      <FieldRow label="External Comments" value="Appeal approved — original denial overturned" />
                      <FieldRow label="Internal Comments" value="Payer reversed decision on clinical review" />
                    </div>
                    <div>
                      <FieldRow label="Submitted Date" value={new Date().toLocaleDateString()} />
                      <FieldRow label="Payer Response Date" value={new Date().toLocaleDateString()} />
                      <FieldRow label="Payer" value={payer} />
                      <FieldRow label="Coverage Effective" value={dateFromToday(0).toLocaleDateString()} />
                      <FieldRow label="Coverage Expiration" value={dateFromToday(365).toLocaleDateString()} />
                      {/* Cosmetic flavor text only — matches the "Appeal
                          result emailed to HCP" narrative beat, no actual
                          inbox UI exists for this (see Field Portal's own
                          generated-email surface for the patient-facing
                          equivalent). */}
                      <FieldRow label="HCP Notified" value="Sarah Chen, MD — notified via email" />
                    </div>
                  </div>
                </Section>

                <div className="border-l-4 p-4 rounded" style={{ borderColor: "#2e844a", background: "var(--crm-primary-30, #e8f4ef)" }}>
                  <p className="text-[13px] font-semibold mb-2" style={{ color: "#1a4d2a" }}>Appeal Approved — Fulfillment Continuing</p>
                  <p className="text-[12px]" style={{ color: "#1a4d2a" }}>
                    The payer reversed the original Prior Authorization denial on appeal. The prescriber has been notified by email, and dispatch to the patient's site of care already moved forward when the appeal was filed — no further action is needed on this stage.
                  </p>
                </div>
              </div>

              {/* Right: Approval Status Panel */}
              <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Approval Status</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#2e844a" }}>
                        ✓
                      </div>
                      <div>
                        <div className="text-[11px] text-[#706e6b]">Status</div>
                        <div className="text-[13px] font-semibold text-[#3e3e3c]">Approved</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Approved By</div>
                      <div className="text-[13px] text-[#3e3e3c]">Payer — {payer}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Decision Date</div>
                      <div className="text-[13px] text-[#3e3e3c]">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Coverage Effective</div>
                      <div className="text-[13px] text-[#3e3e3c]">{dateFromToday(0).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeStage.id === "BI-14273" && biStatus === "complete" ? (
          /* ── BIR Detail View (post-BI completion) ──────────────────────── */
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
                {isPapFlow && biResult === "no_insurance" && (
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
                transferProvider="Advanced Diabetes Supply"
                onOpenProductDetail={() => setProductDetailModalOpen(true)}
              />
            ) : (
            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information + tables */}
              <div className="flex-1 min-w-0 p-4 space-y-4">

                {/* Information section — iAssist flows get the Patient
                    Details / Insurance Information / Member Information
                    layout populated from the same BlueCross BlueShield of
                    Florida facts used in the Summary of Benefits PDF; every
                    other flow keeps the original single "Information" box. */}
                {isIAssistFlow ? (
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
                      <FieldRow label="Insured?" value={isPapFlow ? "No" : "Yes"} />
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
                      <FieldRow label="Payer Type" value={isPapFlow ? "No Insurance" : "Commercial"} />
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
                      <SfLink onClick={() => setProductDetailModalOpen(true)}>BIPC-0455</SfLink>
                    </div>
                    <div className="px-3 py-2 border-b border-[#dddbda]">
                      <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Product</div>
                      <SfLink>{drugName}</SfLink>
                    </div>
                    <div className="px-3 py-2 border-b border-[#dddbda]">
                      <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Status</div>
                      <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No Coverage" : "Covered"}</div>
                    </div>
                    <div className="px-3 py-2 border-b border-[#dddbda]">
                      <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">PA Required?</div>
                      <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No" : "Yes"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        ) : activeStage.id === "TP-14277" ? (
        /* ── Triage to Pharmacy Detail View ─────────────────────────────── */
        <div className="p-4 max-w-5xl">
          <div className="border border-[#dddbda] rounded">
            <div
              className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
              style={{ background: SF_SECTION_BG, minHeight: 36 }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 24, height: 24, background: dispatchStatus === "none" || dispatchStatus === "pending_selection" ? "#9a9a9a" : FC_BLUE, borderRadius: 5 }}
              >
                <Zap size={12} className="text-white" fill="white" />
              </div>
              <span className="text-[13px] font-semibold text-[#3e3e3c]">
                {activeStage.name} {activeStage.id}
              </span>
              {/* Shown while the machine accepts FILL_RX. A flow that dispatches on its own when a site of care is
                  picked (the free drug program) never reaches a state where it does. */}
              {action("triage.dispatch") && (
                <button
                  onClick={() => send(action("triage.dispatch")!)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  Triage to Pharmacy
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6 px-4 pt-4 pb-4">
              {/* Left column: Address and Pharmacy Details */}
              <div className="col-span-2 space-y-4">
                {/* Address Dropdown */}
                <div>
                  <label className="text-[11px] text-[#706e6b] mb-2 block uppercase tracking-wide font-medium">Shipping TO Address</label>
                  <div className="relative">
                    <select className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] text-[#3e3e3c] bg-white hover:bg-[#f3f3f3]">
                      <option value="default">{deliveryAddress || "Select an address"}</option>
                    </select>
                  </div>
                </div>

                {/* Pharmacy Details Section — relabeled for WF5, which
                    dispatches to a site of care instead of a pharmacy. */}
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-2 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">{isIAssistPapFlow ? "Site of Care Details" : "Triage Pharmacy Details"}</span>
                  </div>
                  <div className="space-y-0">
                    <FieldRow label={isIAssistPapFlow ? "Site of Care Name" : "Pharmacy Name"} value={selectedPharmacy?.name || ""} />
                    <FieldRow label="Address" value={selectedPharmacy?.address || ""} />
                    <FieldRow label="City" value={selectedPharmacy?.city || ""} />
                    <FieldRow label="State" value={selectedPharmacy?.state || ""} />
                    <FieldRow label="Zip" value={selectedPharmacy?.zip || ""} />
                    <FieldRow label="Phone" value={selectedPharmacy?.phone || ""} />
                  </div>
                </div>
              </div>

              {/* Right column: Pharmacy/Site of Care Selection Card */}
              <div>
                <div className="border border-[#dddbda] rounded flex flex-col">
                  <div className="px-4 py-3 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">{isIAssistPapFlow ? "Select Site of Care" : "Select Triage Pharmacy"}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 gap-4">
                    {isIAssistPapFlow ? (
                      // WF5 dispatches the instant a site of care is picked —
                      // no separate "Triage to Pharmacy" click, no
                      // Processing/Shipping cosmetic states (those all belong
                      // to the Rx Processing/Shipped/Delivered chain this
                      // flow doesn't have — see tpStage above).
                      selectedPharmacy ? (
                        <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)" }}>
                          <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                            Dispatched — Keanu to Facility
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPharmacyModalOpen(true)}
                          className="w-full px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ background: FC_BLUE }}
                        >
                          Select Site of Care
                        </button>
                      )
                    ) : (pharmacyStatus === "shipped" || pharmacyStatus === "delivered" || triageDispatched) ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)" }}>
                        <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                          Dispatched
                        </span>
                      </div>
                    ) : dispatchStatus === "dispatched" ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "var(--crm-primary-30, #e8f0fa)" }}>
                        <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                          Transferring to pharmacy…
                        </span>
                      </div>
                    ) : pharmacyStatus === "processing" ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "var(--crm-primary-30, #e8f0fa)" }}>
                        <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                          Processing…
                        </span>
                      </div>
                    ) : pharmacyStatus === "ready" ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "var(--crm-primary-30, #e8f0fa)" }}>
                        <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                          Shipping…
                        </span>
                      </div>
                    ) : isCoaFlow || (isCoverageFlow && !isCoverageRetailFlow && !!selectedPharmacy) ? (
                      // Coverage cash pay (No Coverage) also lands here: the scenario
                      // sets the pharmacy when the patient picks self-pay, so
                      // there is nothing to choose. The button would only
                      // hesitate the presenter before "Triage to Pharmacy".
                      // CoA_DTP's pharmacy is auto-assigned at pricing selection
                      // (see coaDtp.ts) — there's nothing to choose here, so no
                      // CTA. Dispatching is done from the "Triage to Pharmacy"
                      // button in the header above instead.
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "#f5f5f5" }}>
                        <span className="text-[12px] font-semibold text-[#706e6b]">
                          Pharmacy assigned — ready to dispatch
                        </span>
                      </div>
                    ) : isCoverageRetailFlow ? (
                      // CoA_Coverage Scenario 1 — the patient picks their own
                      // network pharmacy on NetworkPharmacySelection.tsx
                      // (SELECT_PHARMACY, only valid once the PA chain
                      // reaches paApprovedOtpVerified — see workflows/coassist/), not
                      // the CRM agent. The generic "Choose Pharmacy" button
                      // below let an agent pick one from here instead — but
                      // the machine isn't in a state that accepts
                      // SELECT_PHARMACY that early (e.g. right after a
                      // "Reset to Pharmacy Coverage Confirmed," before the PA
                      // chain has run), so the click silently did nothing and
                      // left this section blank for the rest of the case.
                      // Kept as a real (disabled) button rather than swapped
                      // out for plain text — same slot, same shape as the
                      // generic branch below, just inert — so the form
                      // visibly stays prepopulated from the patient's own
                      // selection (Triage Pharmacy Details, left column)
                      // without implying there's a CRM action left to take.
                      <button
                        disabled
                        title={selectedPharmacy ? "Already selected by the patient — nothing to do here." : "The patient selects their own pharmacy on this flow; this isn't an available CRM action."}
                        className="w-full px-4 py-2 rounded text-[13px] font-semibold text-[#9a9a9a] bg-[#f3f3f3] border border-[#dddbda] cursor-not-allowed"
                      >
                        {selectedPharmacy ? "Pharmacy selected by patient" : "Awaiting pharmacy selection by patient"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setPharmacyModalOpen(true)}
                        disabled={isFreeDrug && workflowData.infusionDate === null}
                        title={isFreeDrug && workflowData.infusionDate === null ? "Triage after the patient confirms the appointment date." : undefined}
                        className="w-full px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: FC_BLUE }}
                      >
                        Choose Pharmacy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata in footer */}
            <div className="grid grid-cols-2 gap-x-6 px-4 pt-2 pb-2 border-t border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <FieldRow label="Status" value={`${activeStage.statusLabel} – ${activeStage.statusDetail}`} />
              <FieldRow
                label="Last Updated"
                value={
                  activeStage.lastUpdated
                    ? `${activeStage.lastUpdated} ${activeStage.lastUpdatedAgo}`
                    : ""
                }
              />
            </div>
          </div>

          {/* Pharmacy Selection Modal */}
          {pharmacyModalOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/50" onClick={() => {
                setPharmacyModalOpen(false);
                setSelectedPharmacyType(null);
                setPreferredPharmacy(null);
                setPayerPharmacy(null);
                setProgramPharmacy(null);
                setDispenserPharmacy(null);
              }} />
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="bg-white border border-[#dddbda] rounded shadow-xl" style={{ width: 600, maxHeight: "80vh" }}>
                  <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
                    <h2 className="text-[16px] font-semibold text-[#3e3e3c]">Select Triage Pharmacy</h2>
                    <button onClick={() => {
                      setPharmacyModalOpen(false);
                      setSelectedPharmacyType(null);
                      setPreferredPharmacy(null);
                      setPayerPharmacy(null);
                      setProgramPharmacy(null);
                      setDispenserPharmacy(null);
                    }} className="p-1 hover:bg-[#f3f3f3] rounded">
                      <X size={18} className="text-[#706e6b]" />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: "calc(80vh - 80px)" }}>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Patient Preferred Pharmacy</label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "preferred"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = pharmacyOptions.find(p => p.name === e.target.value);
                            if (pharm) {
                              setPreferredPharmacy(pharm);
                              setPayerPharmacy(null);
                              setProgramPharmacy(null);
                              setDispenserPharmacy(null);
                              setSelectedPharmacyType("preferred");
                            }
                          } else {
                            setPreferredPharmacy(null);
                            if (selectedPharmacyType === "preferred") setSelectedPharmacyType(null);
                          }
                        }}
                        value={preferredPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {pharmacyOptions.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Payer Mandated Pharmacy</label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "payer"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = pharmacyOptions.find(p => p.name === e.target.value);
                            if (pharm) {
                              setPayerPharmacy(pharm);
                              setPreferredPharmacy(null);
                              setProgramPharmacy(null);
                              setDispenserPharmacy(null);
                              setSelectedPharmacyType("payer");
                            }
                          } else {
                            setPayerPharmacy(null);
                            if (selectedPharmacyType === "payer") setSelectedPharmacyType(null);
                          }
                        }}
                        value={payerPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {pharmacyOptions.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Program Mandated Pharmacy</label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "program"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = pharmacyOptions.find(p => p.name === e.target.value);
                            if (pharm) {
                              setProgramPharmacy(pharm);
                              setPreferredPharmacy(null);
                              setPayerPharmacy(null);
                              setDispenserPharmacy(null);
                              setSelectedPharmacyType("program");
                            }
                          } else {
                            setProgramPharmacy(null);
                            if (selectedPharmacyType === "program") setSelectedPharmacyType(null);
                          }
                        }}
                        value={programPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {pharmacyOptions.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">
                        {isIAssistPapFlow ? "Office Dispense — Site of Care" : "Office Dispense"}
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "dispenser"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = officeDispenseOptions.find(p => p.name === e.target.value);
                            if (pharm) {
                              setDispenserPharmacy(pharm);
                              setPreferredPharmacy(null);
                              setPayerPharmacy(null);
                              setProgramPharmacy(null);
                              setSelectedPharmacyType("dispenser");
                            }
                          } else {
                            setDispenserPharmacy(null);
                            if (selectedPharmacyType === "dispenser") setSelectedPharmacyType(null);
                          }
                        }}
                        value={dispenserPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {officeDispenseOptions.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
                    <button
                      onClick={() => {
                        setPharmacyModalOpen(false);
                        setSelectedPharmacyType(null);
                        setPreferredPharmacy(null);
                        setPayerPharmacy(null);
                        setProgramPharmacy(null);
                        setDispenserPharmacy(null);
                      }}
                      className="px-4 py-2 border border-[#dddbda] rounded text-[13px] font-semibold text-[#3e3e3c] hover:bg-[#f3f3f3] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const selected = preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy;
                        if (selected) {
                          dispatch('SELECT_PHARMACY', { portal: 'crm', pharmacy: selected });
                          setPharmacyModalOpen(false);
                          setSelectedPharmacyType(null);
                          setPreferredPharmacy(null);
                          setPayerPharmacy(null);
                          setProgramPharmacy(null);
                          setDispenserPharmacy(null);
                        }
                      }}
                      className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: FC_BLUE, opacity: (preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy) ? 1 : 0.5 }}
                      disabled={!(preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy)}
                    >
                      Save Selection
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
        ) : activeStage?.id === "PS-14278" ? (
        /* ── Pharmacy Status Tab (PS-14278) ──────────────────────────────── */
        <div className="p-4 max-w-3xl">
          <div className="border border-[#dddbda] rounded">
            <div
              className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
              style={{ background: SF_SECTION_BG, minHeight: 36 }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 24, height: 24, background: FC_BLUE, borderRadius: 5 }}
              >
                <Zap size={12} className="text-white" fill="white" />
              </div>
              <span className="text-[13px] font-semibold text-[#3e3e3c]">
                Pharmacy Status PS-14278
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
              <div>
                <FieldRow label="Pharmacy" value={selectedPharmacy?.name ?? "Not yet selected"} />
                <FieldRow
                  label="Status"
                  value={
                    pharmacyStatus === "none" ? "Awaiting dispatch" :
                    pharmacyStatus === "processing" ? "Preparing medication" :
                    pharmacyStatus === "shipped" ? "In transit" :
                    pharmacyStatus === "delivered" ? "Delivered" :
                    pharmacyStatus
                  }
                />
              </div>
              <div>
                <FieldRow label="Stage Type" value="Pharmacy Status" />
                <FieldRow label="Stage ID" value="PS-14278" />
              </div>
            </div>

            <div
              className="px-4 pb-4 border-t border-[#dddbda] pt-3"
              style={{ background: SF_SECTION_BG }}
            >
              <p className="text-[11px] text-[#706e6b] mb-2 font-medium">
                ADVANCE PHARMACY STATUS
              </p>

              {(pharmacyStatus === "none" || pharmacyStatus === "processing") && (
                <div className="flex items-center gap-2 py-2">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "#e8a900" }}
                  />
                  <span className="text-[12px] text-[#706e6b]">
                    {pharmacyStatus === "none"
                      ? "Awaiting pharmacy dispatch from Triage tab"
                      : "Rx in transit to triage pharmacy…"}
                  </span>
                </div>
              )}

              {action("pharmacy.received") && (
                <button
                  onClick={() => send(action("pharmacy.received")!)}
                  className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-2"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark as Received at Pharmacy
                </button>
              )}

              {action("pharmacy.shipped") && (
                <button
                  onClick={() => send(action("pharmacy.shipped")!)}
                  className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  Mark as Shipped
                </button>
              )}

              {action("pharmacy.delivered") && (
                <button
                  onClick={() => send(action("pharmacy.delivered")!)}
                  className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#2e844a" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark as Delivered
                </button>
              )}

              {pharmacyStatus === "delivered" && (
                <div className="flex items-center gap-2 py-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "var(--crm-primary-30, #e8f4ef)" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2e844a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                    Medication delivered
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
        /* ── Stage Detail View (generic) ─────────────────────────────────── */
        <div className="p-4 max-w-3xl">
          <div className="border border-[#dddbda] rounded">
            <div
              className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
              style={{ background: SF_SECTION_BG, minHeight: 36 }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 24, height: 24, background: activeStage.isNotStarted ? "#9a9a9a" : FC_BLUE, borderRadius: 5 }}
              >
                <Zap size={12} className="text-white" fill="white" />
              </div>
              <span className="text-[13px] font-semibold text-[#3e3e3c]">
                {activeStage.id === "BI-14273" ? "Benefit Investigation Result" : activeStage.name} {activeStage.id}
              </span>
              {action("bi.check_status") && (
                <button
                  onClick={() => send(action("bi.check_status")!)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Check Status
                </button>
              )}
              {action("pap.approve") && (
                <button
                  onClick={() => send(action("pap.approve")!)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Approve Application
                </button>
              )}
              {action("pap.approved") && (
                <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>
                  Approved
                </span>
              )}
              {action("provider_transfer.notify") && (
                <button
                  onClick={() => send(action("provider_transfer.notify")!)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Notify Provider
                </button>
              )}
              {action("provider_transfer.transferred") && (
                <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>
                  Transferred
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
              <div>
                <FieldRow label="Status" value={`${activeStage.statusLabel} – ${activeStage.statusDetail}`} />
                {activeStage.fields.map((f) => (
                  <FieldRow key={f.label} label={f.label} value={f.value ?? "No Data Available"} />
                ))}
              </div>
              <div>
                <FieldRow label="Stage Type" value={activeStage.name} />
                <FieldRow label="Stage ID" value={activeStage.id} />
                <FieldRow label="Service Type" value="Onboarding" />
                <FieldRow label="Sequence" value="1" />
                <FieldRow
                  label="Last Updated"
                  value={
                    activeStage.lastUpdated
                      ? `${activeStage.lastUpdated} ${activeStage.lastUpdatedAgo}`
                      : "No Data Available"
                  }
                />
              </div>
            </div>
          </div>
        </div>
        )
      ) : null}
      {/* ── Onboarding Case Record (shown when keanu + onboarding sub-tab) ─ */}
      {activeTopTab === "keanu" && activePatientSubTab === "onboarding" && (
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
                  title={`Stages (${STAGES_LIVE.length})`}
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
                      {STAGES_LIVE.length} items • Sorted by Created Date • Updated a few seconds ago
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
                          {STAGES_LIVE.map((stage, i) => {
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
                      {STAGES_LIVE.map((stage) => (
                        <StageCard key={stage.id} stage={stage} onHeaderClick={handleOpenStage} />
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
                          <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#706e6b]">{isCoaFlow ? "Delays Prior Authorization submission" : "Benefits Investigation has not yet run"}</td>
                          <td className="px-3 py-2.5 border-b border-[#dddbda]">
                            {caseAction("enroll") && (
                              <button
                                onClick={() => send(caseAction("enroll")!)}
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
                        : () => { openEnrollmentFormTab(); setActivePatientSubTab("enrollment-form"); };
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
                          <td className="px-3 py-2"><SfLink onClick={() => setOpenCopayClaimId(c.id)}>{c.id}</SfLink></td>
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
      )}

      {/* Copay claim detail: opens from a claim number on the Copay tab. */}
      {openCopayClaim && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpenCopayClaimId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white border border-[#dddbda] rounded shadow-xl pointer-events-auto" style={{ width: 520, maxHeight: "90vh" }}>
              <div className="px-5 py-3 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
                <span className="text-[14px] font-semibold text-[#3e3e3c]">Copay Claim {openCopayClaim.id}</span>
                <button onClick={() => setOpenCopayClaimId(null)} className="text-[#706e6b] hover:text-[#3e3e3c] text-[18px] leading-none" aria-label="Close">×</button>
              </div>
              <div className="grid grid-cols-2 gap-x-6 px-5 py-2">
                <div>
                  <FieldRow label="Claim Number" value={openCopayClaim.id} />
                  <FieldRow label="Status" value={openCopayClaim.status === "in_review" ? "In review" : openCopayClaim.status === "paid" ? "Paid" : "Rejected"} />
                  <FieldRow label="Patient" value={patientName} />
                  <FieldRow label="Program" value={BRAND.program.name} />
                </div>
                <div>
                  <FieldRow label="Member ID" value={copayMemberId(patientName, BRAND.program.name)} />
                  <FieldRow label="Benefit Type" value="Medical drug" />
                  <FieldRow label="Date of Service" value={ymdToMdy(openCopayClaim.dateOfService)} />
                  <FieldRow label="Submitted" value={`${ymdToMdy(openCopayClaim.submittedAt.slice(0, 10))} via iAssist`} />
                </div>
              </div>
              <div className="px-5 pb-3">
                <div className="text-[12px] text-[#706e6b] mb-1">Documents</div>
                <div className="flex gap-4 text-[13px]">
                  <a href="/docs/cms-1500.pdf" target="_blank" rel="noreferrer" className="hover:underline" style={{ color: SF_BLUE }}>CMS-1500</a>
                  <a href="/docs/eob.pdf" target="_blank" rel="noreferrer" className="hover:underline" style={{ color: SF_BLUE }}>EOB</a>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-[#dddbda] flex justify-end">
                <button onClick={() => setOpenCopayClaimId(null)} className="px-4 py-1.5 border border-[#dddbda] rounded text-[13px] font-semibold text-[#3e3e3c] hover:bg-[#f3f3f3]">Close</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Product Detail Modal - rendered at root level to escape overflow constraints */}
      {productDetailModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setProductDetailModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white border border-[#dddbda] rounded shadow-xl" style={{ width: 600, maxHeight: "90vh" }}>
              <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded" style={{ width: 32, height: 32, background: "var(--crm-primary, #0070d2)" }}>
                    <span className="text-white text-[12px] font-bold">PC</span>
                  </div>
                  <h2 className="text-[16px] font-semibold text-[#3e3e3c]">BIPC-0455</h2>
                </div>
                <button onClick={() => setProductDetailModalOpen(false)} className="p-1 hover:bg-[#f3f3f3] rounded">
                  <X size={18} className="text-[#706e6b]" />
                </button>
              </div>

              <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 80px)" }}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PRODUCT</div>
                    <div className="text-[13px] text-[#3e3e3c]">{drugName}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BI PRODUCT COVERAGE NAME</div>
                    <div className="text-[13px] text-[#3e3e3c]">BIPC-0455</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PRODUCT COVERAGE STATUS</div>
                    <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No Coverage" : "Covered"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BENEFIT INVESTIGATION RESULT</div>
                    <div className="text-[13px]" style={{ color: SF_BLUE }}>BIR-0431</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PA REQUIRED?</div>
                    <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No" : "Yes"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PAYER</div>
                    <div className="text-[13px] text-[#3e3e3c]">{payer}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">CARE</div>
                    <div className="text-[13px]" style={{ color: SF_BLUE }}>00001740</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PAYER TYPE</div>
                    <div className="text-[13px] text-[#3e3e3c]">Commercial</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BENEFIT TYPE</div>
                    <div className="text-[13px] text-[#3e3e3c]">Pharmacy</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">STATUS</div>
                    <div className="text-[13px] text-[#3e3e3c]">Active</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">RANK</div>
                    <div className="text-[13px] text-[#3e3e3c]">Primary</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">INTERNAL COMMENTS</div>
                    <div className="text-[13px] text-[#3e3e3c]">—</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
