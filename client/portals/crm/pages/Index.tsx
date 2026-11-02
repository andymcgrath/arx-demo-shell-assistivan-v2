import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import { usePatientStore } from "@/store/patientStore";
import { usePersonaState, useWorkflowActor, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { dateFromToday, formatShortDate } from "@/lib/relativeDate";
import { useSelector } from "@xstate/react";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { summaryOfBenefitsDocument } from "@/brand/documents";
import { SfLink, SF_BLUE } from "../components/SfPrimitives";
import { scenarioHasModule } from "@/workflows/scenarios";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { stageSignalFor } from "@/engine/workflow/stages";
import { stageMapFor } from "@/workflows/stageMaps";
import { buildCrmStages } from "../stages/buildStages";
import type { Stage } from "../stages/types";
import { caseDocuments } from "@/brand/caseDocuments";
import { FileText, X } from "lucide-react";
import { RecordStageView } from "../components/RecordStageView";
import { stageRecord } from "../stages/records";
import { CASE_HOME, crmActions, type CrmAction, type CrmCan } from "../stages/actions";
import { type RelatedDocument, FAX_DOCUMENTS, PA_FORM_DOCUMENT } from "../caseData";
import { CaseListView } from "../components/CaseListView";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { EnrollmentFormView } from "../components/EnrollmentFormView";
import { CashOfferDetail } from "../components/CashOfferDetail";
import { BiDetail } from "../components/BiDetail";
import { TriageDetail } from "../components/TriageDetail";
import { PharmacyStatusDetail } from "../components/PharmacyStatusDetail";
import { StageDetail } from "../components/StageDetail";
import { CrmTabStrip, HOME_TAB } from "../components/CrmTabStrip";
import { CaseHome } from "../components/CaseHome";
import { CopayClaimModal } from "../components/CopayClaimModal";



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
      // The flow comes from the workflow data this page renders. The demo store's copy is updated first by a reset,
      // so it can name the next flow while the data is still the last one's.
      const facts = scenarioFacts(workflowData.flowType);
      if (facts.hasPricingFork || facts.isCoverageScenario) {
        setHubView("detail");
      }
    }
  }, [enrollmentStatus, workflowData.flowType, navigate]);

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
  const patientFirstName = patientName.split(" ")[0] ?? patientName;
  const patientLastName = patientName.split(" ").slice(1).join(" ") || patientName;
  // deliveryAddress is stored as a single "Street, City, State ZIP" string —
  // split it into the pieces the mock enrollment form displays separately.
  const [deliveryAddressStreet, ...deliveryAddressRest] = deliveryAddress.split(", ");
  const deliveryAddressCityStateZip = deliveryAddressRest.join(", ");

  const flowType = workflowData.flowType;
  const biStatus = workflowData.biStatus;
  const paStatus = workflowData.paStatus;
  const paApprovedAt = workflowData.paApprovedAt;
  const dispatchStatus = workflowData.dispatchStatus;
  const facts = scenarioFacts(flowType);

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
    ...(facts.isFax ? FAX_DOCUMENTS : []),
    ...(PA_FORM_DOCUMENT && !facts.isNoPaIntake ? [PA_FORM_DOCUMENT] : []),
    ...sobDocuments,
  ];
  const [productDetailModalOpen, setProductDetailModalOpen] = useState(false);
  const copayClaimsNow = workflowData.copayClaims ?? [];
  const [openCopayClaimId, setOpenCopayClaimId] = useState<string | null>(null);
  const openCopayClaim = copayClaimsNow.find((c) => c.id === openCopayClaimId) ?? null;
  // Stores IDs, not Stage objects — a Stage object snapshot from the moment
  // a tab was opened would go stale the instant workflowData changed again
  // (e.g. EA-14272 opened before patient consent, still showing "Pending"
  // afterward). The tab strip below re-looks each ID up in the live
  // STAGES_LIVE array every render, same pattern as `activeStage`.
  const [openStageTabs, setOpenStageTabs] = useState<string[]>([]);
  const [activeTopTab, setActiveTopTab] = useState<string>(HOME_TAB);
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
  // themselves in this session. Snapping back to the HOME_TAB home tab on
  // every reset (mirroring ResetToHome/StateDrivenNav's own resetNonce
  // pattern) means that effect can only fire from a deliberate, fresh click
  // into the tab afterward, not as a side effect of the reset itself.
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const lastResetNonceRef = useRef(resetNonce);
  useEffect(() => {
    if (resetNonce === lastResetNonceRef.current) return;
    lastResetNonceRef.current = resetNonce;
    setOpenStageTabs([]);
    setActiveTopTab(HOME_TAB);
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
  // looking at. The machine owns the delay and the outcome. Leaving a stage cancels a pending reveal.
  //
  // Which stage sends which signal, and while what holds, is in the workflow's stage map
  // (workflows/<name>/stages.ts, `signal` and `signalWhen`): BI while it runs, the PA while it is
  // submitted, the appeal while it is filed, and the provider transfer while the medical benefit covered.
  // The signal carries nothing else. The `bi` fork's choice, which lives in the machine, decides the branch.
  const stageSignal = activeTopTab ? stageSignalFor(stageMapFor(workflowData.flowType), activeTopTab, workflowData) : null;
  useEffect(() => {
    if (!stageSignal) return;
    dispatch('VIEW_STAGE', { portal: 'crm', stage: stageSignal });
    return () => dispatch('LEAVE_STAGE', { portal: 'crm', stage: stageSignal });
  }, [stageSignal, dispatch]);

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
    if (activeTopTab === stageId) setActiveTopTab(HOME_TAB);
  };

  const activeStage = STAGES_LIVE.find((s) => s.id === activeTopTab);

  // The buttons and badges on the open stage. `enabled` is the machine's own answer (stages/actions.ts).
  const can: CrmCan = (e) => actor.getSnapshot().can(e as any);
  const stageActions = activeStage ? crmActions(workflowData, activeStage.id, can) : [];
  const action = (id: string) => stageActions.find((a) => a.id === id);
  // The record view of a resolved PA or appeal (stages/records.ts), drawn by one shell.
  const record = activeStage ? stageRecord(activeStage.id, workflowData, { patientName, caseNumber, payer }, facts.hasPricingFork) : null;
  const caseActions = crmActions(workflowData, CASE_HOME, can);
  const caseAction = (id: string) => caseActions.find((a) => a.id === id);
  const send = (a: CrmAction) => a.event && dispatch(a.event.type, { portal: a.event.portal });

  if (facts.hasPricingFork && hubView === "list") {
    return (
      <CaseListView
        caseNumber={enrollmentStatus !== "none" ? caseNumber : null}
        onOpenCase={() => setHubView("detail")}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Salesforce Sans', Arial, sans-serif", fontSize: 13 }}
    >
      {facts.hasPricingFork && (
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
      <CrmTabStrip
        activeTab={activeTopTab}
        patientName={patientName}
        patientDob={patientDob}
        stages={STAGES_LIVE}
        openStageIds={openStageTabs}
        onSelect={(tabId) => {
          setActiveTopTab(tabId);
          scrollToTop();
        }}
        onCloseStage={handleCloseStageTab}
      />

      {/* ── Content area (conditional on active Row 1 tab) ──────────────────── */}
      {activeTopTab === HOME_TAB ? (
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
        <EnrollmentFormView
          patientName={patientName}
          patientFirstName={patientFirstName}
          patientLastName={patientLastName}
          patientDob={patientDob}
          phone={phone}
          deliveryAddressStreet={deliveryAddressStreet}
          deliveryAddressCityStateZip={deliveryAddressCityStateZip}
          patientEmail={patientEmail}
          drugName={drugName}
          dosageForm={dosageForm}
          npi={npi}
        />
          ) : null}
        </>
      ) : activeStage ? (
        activeStage.id === "CO-14281" ? (
          /* ── Cash Offer Detail View (COA flow) ────────────────────────── */
          <CashOfferDetail workflowData={workflowData} stage={activeStage} action={action} onAction={send} />
        ) : record ? (
          <RecordStageView content={record} />
        ) : activeStage.id === "BI-14273" && biStatus === "complete" ? (
          /* ── BIR Detail View (post-BI completion) ──────────────────────── */
          <BiDetail workflowData={workflowData} patientName={patientName} drugName={drugName} caseNumber={caseNumber} phone={phone} payer={payer} onOpenProductDetail={() => setProductDetailModalOpen(true)} />
        ) : activeStage.id === "TP-14277" ? (
        /* ── Triage to Pharmacy Detail View ─────────────────────────────── */
        <TriageDetail
          workflowData={workflowData}
          stage={activeStage}
          action={action}
          onAction={send}
          deliveryAddress={deliveryAddress}
          triageDispatched={triageDispatched}
          onSelectPharmacy={(pharmacy) => dispatch("SELECT_PHARMACY", { portal: "crm", pharmacy })}
        />
        ) : activeStage?.id === "PS-14278" ? (
        /* ── Pharmacy Status Tab (PS-14278) ──────────────────────────────── */
        <PharmacyStatusDetail workflowData={workflowData} action={action} onAction={send} />
        ) : (
        /* ── Stage Detail View (generic) ─────────────────────────────────── */
        <StageDetail stage={activeStage} action={action} onAction={send} />
        )
      ) : null}
      {/* ── Onboarding Case Record (shown on the home tab + onboarding sub-tab) ─ */}
      {activeTopTab === HOME_TAB && activePatientSubTab === "onboarding" && (
        <CaseHome
        workflowData={workflowData}
        patientName={patientName}
        caseNumber={caseNumber}
        stages={STAGES_LIVE}
        relatedDocuments={relatedDocuments}
        caseAction={caseAction}
        onAction={send}
        onOpenStage={handleOpenStage}
        onOpenEnrollmentForm={() => {
          openEnrollmentFormTab();
          setActivePatientSubTab("enrollment-form");
        }}
        onOpenCopayClaim={setOpenCopayClaimId}
      />
      )}

      {/* Copay claim detail: opens from a claim number on the Copay tab. */}
      {openCopayClaim && <CopayClaimModal claim={openCopayClaim} onClose={() => setOpenCopayClaimId(null)} patientName={patientName} />}

      {/* Product Detail Modal - rendered at root level to escape overflow constraints */}
      {productDetailModalOpen && (
        <ProductDetailModal onClose={() => setProductDetailModalOpen(false)} drugName={drugName} noPaIntake={facts.isNoPaIntake} payer={payer} />
      )}
    </div>
  );
}
