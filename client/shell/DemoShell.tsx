/**
 * DemoShell — presenter-controlled layout for the ArxConnect demo
 *
 * Layout modes
 * ────────────
 *  Single   one portal, full width
 *  Split 2  two portals side-by-side (each 50 %)
 *  Split 3  three portals side-by-side (~33 % each)
 *
 * Each portal panel is an isolated scroll container. The key trick:
 *   transform: translateZ(0)
 * on the panel forces any position:fixed child (e.g. the patient portal's
 * fixed header) to be positioned relative to the panel, not the viewport.
 * This keeps the shell chrome consistent across all views.
 *
 * State is always shared — all panels read from the same Zustand store, so
 * switching a panel from Patient to Analytics shows the same workflow step.
 */
import { SHOW_PATIENT_EVENT, START_OVER_EVENT } from "@/portals/web/events";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDemoStore, type FlowType } from "@/store/demoStore";
import { usePatientStore } from "@/store/patientStore";
import { usePresPapStore } from "@/store/presPapStore";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { usePersonaState, useWorkflowActor } from "@/engine/WorkflowProvider";
import { getWorkflowActor, switchWorkflow, resetAllWorkflowSnapshots, getActiveFlowType } from "@/engine/actorSingleton";
import { useSelector } from "@xstate/react";
import {
  RefreshCw, Undo2, ChevronDown,
  LayoutTemplate, LayoutPanelLeft, LayoutGrid,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_OPTIONS } from "./flowOptions";
import { stepBarModel } from "./stepBar";
import { applyDemoChoices, startDemo } from "./demos";
import { usePatientToastStore } from "@/store/patientToastStore";
import { coassistStageEvents, type CoassistLadderFlow } from "./coassistLadders";
import { forkStageList } from "@/engine/workflow/forks";
import { biForkFor } from "@/workflows/coassist/forks";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { iassistStageEvents, type IassistLadderFlow } from "./iassistLadders";
import { scenarioHasModule } from "@/workflows/scenarios";
import { isTransferScenario, transferStageEvents, TRANSFER_STAGE_LABELS } from "./transferLadders";
import { isBuyAndBillScenario, buyAndBillStageEvents, BUY_AND_BILL_STAGE_LABELS, isFreeDrugScenario, freeDrugStageEvents, FREE_DRUG_STAGE_LABELS } from "./buyAndBillLadders";
import { faxStageEvents } from "./faxLadders";

// ── Portal registry ───────────────────────────────────────────────────────────

import CrmPortal      from "@/portals/crm/index";
import ClientPortal   from "@/portals/client/index";
import { BRAND, findDemo } from "@/brand";
import PatientPortal  from "@/portals/patient/index";
import AnalyticsPortal from "@/portals/analytics/index";
import InsightsPortal from "@/portals/insights/index";
import FieldPortal    from "@/portals/field/index";
import ProviderPortal from "@/portals/provider/index";
import IAssistPortal from "@/portals/iassist/index";
import RulesPortal from "@/portals/rules/index";
import WebPortal from "@/portals/web/index";
import GatewayPortal from "@/portals/gateway/index";

export type PortalId = "crm" | "client" | "patient" | "analytics" | "insights" | "field" | "provider" | "iassist" | "rules" | "web" | "gateway";

// NOTE: the iAssist portal tab's URL slug is "iassist-hub", NOT "iassist".
// "/iassist" is a separate, pre-existing top-level deep-link route (see
// IAssistRedirect in App.tsx) that selects the iAssist flow and redirects
// here. If this slug were "iassist" it would collide with that route — any
// navigate("/iassist") from the tab/dropdown/reset below would get
// intercepted by App.tsx's <Route path="/iassist"> before ever reaching
// DemoShell, permanently bouncing back through IAssistRedirect instead of
// rendering the portal (this is exactly what caused the iAssist tab to
// "reload to HUB" when clicked).
export const PORTAL_SLUG: Record<PortalId, string> = {
  crm: "hub",
  client: "client",
  patient: "patient",
  analytics: "analytics",
  insights: "insights",
  field: "field",
  provider: "provider",
  iassist: "iassist-hub",
  rules: "rules",
  web: "web",
  gateway: "gateway",
};

const SLUG_TO_PORTAL: Record<string, PortalId> = {
  hub: "crm",
  client: "client",
  patient: "patient",
  analytics: "analytics",
  insights: "insights",
  field: "field",
  provider: "provider",
  "iassist-hub": "iassist",
  rules: "rules",
  web: "web",
  gateway: "gateway",
};

/**
 * Canonical opening screen per workflow — single source of truth.
 * Used both when switching to a flow (dropdown) and when resetting while on
 * that flow, so the two always agree. Previously this was two independent,
 * inconsistent one-offs: a CoA_DTP-only check in the flow dropdown's
 * onChange, and a hardcoded "/provider" redirect for iAssist in App.tsx's
 * IAssistRedirect (which only fired via the /iassist deep link, not the
 * dropdown). Update this map — not scattered `if (flowType === ...)`
 * checks — if a workflow's starting portal ever needs to change.
 */
export const FLOW_START_PORTAL: Record<FlowType, PortalId> = {
  Fax_QS_PA_Approved: "crm",
  Fax_PAP_Audit: "crm",
  CoA_DTP: "provider",
  // CoA_Copay (WF4) is currently a direct copy of CoA_DTP (WF3) — same
  // starting portal, see coaCopay.ts.
  CoA_Copay: "provider",
  // CoA_Web_Copay: a client-managed web page starts the case (source `web`). There is no provider or CRM.
  CoA_Web_Copay: "web",
  // CoA_HCP_Enroll: the client's HCP web page starts the case (source `web`). No CRM.
  CoA_HCP_Enroll: "web",
  // CoA_Coverage (medical-benefit coverage, no PA/pricing/fulfillment) — same starting
  // portal as CoA_DTP/CoA_Copay, see workflows/coassist/.
  CoA_Coverage: "provider",
  CoA_Medical_Transfer: "provider",
  CoA_PAP: "provider",
  CoA_APA_Specialty: "provider",
  // "provider" is hidden for iAssist flows (see getPortals below) — the
  // dedicated "iassist" tab is this flow's dashboard/home, so that's what
  // switching to this flow, resetting it, or deep-linking via /iassist
  // should land on.
  iAssist_PA_Approved: "iassist",
  // iAssist_PAP (WF5) is a structural clone of WF4 — same starting portal.
  iAssist_PAP: "iassist",
  iAssist_Medical_Transfer: "iassist",
  iAssist_Buy_And_Bill: "iassist",
  iAssist_Buy_And_Bill_PAP: "iassist",
  // WF6's shared patient/provider web experience starts on the provider
  // portal's own home screen (PesHome) — the provider is the one who starts
  // a referral, and the role-selection home screen routes from there.
  PrES_PAP: "provider",
};

function getProviderPortalLabel(flowType: string): string {
  return "Provider";
}

// Nav tab order (and the per-panel portal-selector dropdown order, which
// reuses this same list via getPortals) — Workforce (analytics) intentionally
// sits after Field now, for every workflow, per request. "insights" (tab
// label "Analytics") is a newer, separate placeholder tab — sits directly to
// the left of Workforce, visible in every workflow.
const PORTALS_BASE: { id: PortalId; color: string }[] = [
  // The client's web page and the gateway view exist only in a web-source scenario (see getPortals).
  { id: "web",       color: "#2563eb" },
  { id: "crm",       color: "#0176d3" },
  // "Client" — a straight duplicate of the HUB/CRM tab (same portal
  // component, same shared workflow state), placed directly to its right.
  // Kept as its own PortalId/component (see client/portals/client/) rather
  // than reusing CrmPortal directly, so it can diverge later without
  // touching the original HUB/CRM tab.
  { id: "client",    color: "#0ea5e9" },
  { id: "patient",   color: "#16a34a" },
  { id: "gateway",   color: "#475569" },
  { id: "provider",  color: "#7c3aed" },
  { id: "iassist",   color: "#d97706" },
  { id: "field",     color: "#14b8a6" },
  { id: "insights",  color: "#2563eb" },
  { id: "analytics", color: "#d97706" },
  // New Salesforce-Lightning "Product Mgmt" / Action Factory demo — Salesforce
  // blue to visually hint what it is. Visible in every workflow (no
  // flowType-based filtering below), same as "insights".
  { id: "rules",     color: "#0070d2" },
];

function getPortals(flowType: string) {
  // Covers both WF4 (iAssist_PA_Approved) and WF5 (iAssist_PAP) — the latter
  // is a structural clone of the former, same tab layout.
  const { isIassistSource: isIAssistFlow, isFaxPap: isPapFlow, isWebSource, isHcpEnrollment } = scenarioFacts(flowType);
  // Deliberately scoped to WF2 only (not PrES_PAP/WF5) — WF5 has its own
  // provider-facing PrES intake placeholder (see provider/index.tsx's
  // PresPapProviderExperience) and needs the tab visible, unlike WF2 which
  // has no provider screen at all.

  return PORTALS_BASE.filter(p => {
    // A web-source scenario starts on the client's web page and calls AssistRx through the gateway. The client owns the
    // CRM, so the HUB/CRM, Client, Provider, and Rules tabs are hidden. Every other scenario hides the web and gateway tabs.
    // The gateway view shows ABV and APA calls. An HCP enrollment makes neither, so it has no gateway tab.
    if (p.id === "gateway") return isWebSource && !isHcpEnrollment;
    if (p.id === "web") return isWebSource;
    if (isWebSource && (p.id === "crm" || p.id === "client" || p.id === "provider" || p.id === "rules")) return false;
    // Show provider for workflows 1, 3, and 5, hide for workflow 4 (iAssist —
    // it has its own dedicated "iAssist" tab instead) and workflow 2
    // (Fax_PAP_Audit never requires a traditional PA, so there's no
    // provider-facing screen for this flow at all — see isPapFlow's use
    // elsewhere in this file, e.g. the step-bar labels/reset ladder).
    if (p.id === "provider" && (isIAssistFlow || isPapFlow)) return false;
    // Show iAssist only for workflow 4
    if (p.id === "iassist" && !isIAssistFlow) return false;
    // "Client" tab — a one-off built for a single client. It shows only when the
    // brand opts in (`showClientTab` in brand.json, off by default) and only in the
    // iAssist workflows (5. iAssist and 6. iAssist Appeal, see FLOW_OPTIONS in
    // flowOptions.ts), the same isIAssistFlow flag the "iassist" tab uses.
    if (p.id === "client" && !(BRAND.showClientTab === true && isIAssistFlow)) return false;
    return true;
  }).map(p => {
    if (p.id === "provider") {
      return { ...p, id: p.id as PortalId, label: getProviderPortalLabel(flowType) };
    }
    const baseLabels: Record<PortalId, string> = {
      crm: "HUB / CRM",
      client: "Client",
      patient: "Patient",
      provider: getProviderPortalLabel(flowType),
      iassist: "iAssist",
      analytics: "Workforce",
      insights: "Analytics",
      field: "Field",
      rules: "Rules",
      web: "Client web page",
      gateway: "Gateway",
    };
    return { ...p, id: p.id as PortalId, label: baseLabels[p.id] };
  });
}

/** Renders the portal component for the given id */
function PortalComponent({ id, flowType }: { id: PortalId; flowType?: string }) {
  switch (id) {
    case "crm":       return <CrmPortal />;
    case "client":    return <ClientPortal />;
    case "patient":   return <PatientPortal />;
    case "analytics": return <AnalyticsPortal />;
    case "insights":  return <InsightsPortal />;
    case "field":     return <FieldPortal />;
    case "provider":  return <ProviderPortal key={flowType} />;
    case "iassist":   return <IAssistPortal branded={false} />;
    case "rules":     return <RulesPortal />;
    case "web":       return <WebPortal />;
    case "gateway":   return <GatewayPortal />;
  }
}

// ── Layout types ──────────────────────────────────────────────────────────────

type LayoutMode = "1up" | "2up" | "3up";

interface PanelState {
  portal: PortalId;
}

const DEFAULT_PANELS: Record<LayoutMode, PanelState[]> = {
  "1up": [{ portal: "crm" }],
  "2up": [{ portal: "crm" }, { portal: "patient" }],
  "3up": [{ portal: "crm" }, { portal: "patient" }, { portal: "provider" }],
};

// ── Step progress bar ─────────────────────────────────────────────────────────

function StepBar() {
  const flowType     = useDemoStore((s) => s.flowType);
  const { workflowData } = usePersonaState('crm');
  const { labels: STEP_LABELS, stepDone, workflowStep, paRingApplies, rxRingsOff, rxProcessingStepN, rxShippedStepN } = stepBarModel(flowType, workflowData);

  const biStatus        = workflowData.biStatus;
  const paStatus        = workflowData.paStatus;
  const appealStatus    = workflowData.appealStatus;
  const pharmacyStatus  = workflowData.pharmacyStatus;
  const biRunning       = biStatus === "running";
  const paProcessing    = paStatus === "submitted" && paRingApplies;
  // appealStatus never leaves 'none' except for iAssist_PAP (see engine/types.ts). The dedicated "Appeal" step
  // is n=5 while the appeal is sent and the payer has not responded.
  const appealPending   = appealStatus === "initiated";
  const appealStepN     = 5;
  // A bar that ends at Triage to Pharmacy has no Rx Processing or Rx Shipped steps, so the Rx rings stay off.
  const rxInTransit     = pharmacyStatus === "processing" && !rxRingsOff;
  const rxProcessing    = pharmacyStatus === "ready" && !rxRingsOff;
  const rxShipping      = pharmacyStatus === "shipped" && !rxRingsOff;
  // Benefits Investigation sits at n=3 on every flow's bar.
  const biRunningStepN    = 3;


  return (
    <div className="flex items-center gap-0 px-6 py-2">
      {STEP_LABELS.map((label, i) => {
        const n      = i + 1;
        const done   = stepDone ? stepDone[i] : workflowStep > n;
        // With independent per-step completion, "active" (the single
        // highlighted step) is the earliest one not yet done — later steps
        // that raced ahead (e.g. PA already submitted, or now CoA's BI
        // completing before consent) get their own pulsing-ring treatment
        // below instead of the bold "active" ring.
        const active = stepDone
          ? !stepDone[i] && stepDone.slice(0, i).every(Boolean)
          : workflowStep === n;
        // Connector between step 2→3 pulses while BI is running; step 3→4 while PA is processing; step 4→5 (WF5 only) while the appeal is pending a payer response; the connector leading into Rx Processing pulses while rx is processing; the one leading into Rx Shipped pulses while shipping.
        const connectorRunning = (biRunning && n === biRunningStepN - 1) || (paProcessing && n === 3) || (appealPending && n === appealStepN - 1) || ((rxInTransit || rxProcessing) && n === rxProcessingStepN - 1) || (rxShipping && n === rxShippedStepN - 1);
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-0.5 relative">
              {/* Pulsing ring behind the BI dot while BI runs */}
              {biRunning && n === biRunningStepN && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the step-4 dot while PA is processing */}
              {paProcessing && n === 4 && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the Appeal dot while awaiting payer response */}
              {appealPending && n === appealStepN && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the Rx Processing dot while rx is in transit */}
              {rxInTransit && n === rxProcessingStepN && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the Rx Processing dot while rx is processing */}
              {rxProcessing && n === rxProcessingStepN && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the Rx Shipped dot while rx is shipping */}
              {rxShipping && n === rxShippedStepN && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              <div
                className={cn(
                  "relative w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all",
                  done   && "bg-white text-[#0f172a] border-white",
                  active && "bg-white/30 text-white border-white scale-110",
                  biRunning && n === biRunningStepN && "border-white/60 text-white/60",
                  paProcessing && n === 4 && "border-white/60 text-white/60",
                  appealPending && n === appealStepN && "border-white/60 text-white/60",
                  (rxInTransit || rxProcessing) && n === rxProcessingStepN && "border-white/60 text-white/60",
                  rxShipping && n === rxShippedStepN && "border-white/60 text-white/60",
                  !done && !active && !(biRunning && n === biRunningStepN) && !(paProcessing && n === 4) && !(appealPending && n === appealStepN) && !((rxInTransit || rxProcessing) && n === rxProcessingStepN) && !(rxShipping && n === rxShippedStepN) && "bg-transparent text-white/40 border-white/25"
                )}
              >
                {done ? "✓" : n}
              </div>
              <span
                className={cn(
                  "text-[9px] whitespace-nowrap hidden md:block",
                  active && "text-white font-semibold",
                  done   && "text-white/70",
                  biRunning && n === biRunningStepN && "text-white/60 animate-pulse",
                  paProcessing && n === 4 && "text-white/60 animate-pulse",
                  appealPending && n === appealStepN && "text-white/60 animate-pulse",
                  (rxInTransit || rxProcessing) && n === rxProcessingStepN && "text-white/60 animate-pulse",
                  rxShipping && n === rxShippedStepN && "text-white/60 animate-pulse",
                  !done && !active && !(biRunning && n === biRunningStepN) && !(paProcessing && n === 4) && !(appealPending && n === appealStepN) && !((rxInTransit || rxProcessing) && n === rxProcessingStepN) && !(rxShipping && n === rxShippedStepN) && "text-white/30"
                )}
              >
                {biRunning && n === biRunningStepN ? "Running…" : paProcessing && n === 4 ? "Pending…" : appealPending && n === appealStepN ? "Awaiting Response…" : rxInTransit && n === rxProcessingStepN ? "In Transit…" : rxProcessing && n === rxProcessingStepN ? "Processing…" : rxShipping && n === rxShippedStepN ? "Shipping…" : label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-1 mb-3 transition-all overflow-hidden relative",
                  done ? "bg-white/60" : "bg-white/15"
                )}
              >
                {connectorRunning && (
                  <span
                    className="absolute inset-0 animate-[shimmer_1.5s_ease-in-out_infinite]"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
                      animation: "shimmer 1.5s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── PatientPhoneToast — confirmation banner confined to the iPhone mockup ────
//
// Reads patientToastStore (see that file's docblock) rather than sonner's
// toast() so the message can't leak out and float over the rest of the demo
// shell — the whole point of this component. Lives here in Panel/DemoShell
// (not in the routed page that requests it, e.g. CopayEnroll.tsx) because
// this tree stays mounted across in-portal navigation, so the banner
// survives the redirect back to Benefit Pricing instead of unmounting with
// the page that triggered it.

function PatientPhoneToast() {
  const message = usePatientToastStore((s) => s.message);
  const clear = usePatientToastStore((s) => s.clear);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const hideTimer = setTimeout(() => setVisible(false), 2200);
    const clearTimer = setTimeout(() => clear(), 2500);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [message, clear]);

  if (!message) return null;

  return (
    <div
      className={cn(
        "absolute left-3 right-3 top-16 z-[60] flex items-center gap-2 rounded-lg border px-3.5 py-2.5 shadow-lg transition-all duration-300",
        "border-green-200 bg-green-50 text-green-800",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
    >
      <CheckCircle className="h-4 w-4 flex-shrink-0" />
      <span className="text-[13px] font-medium leading-snug">{message}</span>
    </div>
  );
}

// ── Panel — isolated scroll container ────────────────────────────────────────

interface PanelProps {
  portal: PortalId;
  onChangePortal: (id: PortalId) => void;
  showSelector: boolean;   // only in multi-panel modes
  headerHeight: number;
  flowType: string;
}

function Panel({ portal, onChangePortal, showSelector, headerHeight, flowType }: PanelProps) {
  const portals = getPortals(flowType);
  const info = portals.find((p) => p.id === portal);

  // If portal is no longer available in this flow, don't render
  if (!info) return null;

  // WF5 (PrES_PAP) renders as a plain web page everywhere else (see the
  // comment below), but the Fulfillment Center's "application update" SMS
  // is meant to look exactly like the phone-mockup SMS screens every other
  // flow uses (PapUpdateSms.tsx etc.) — same iPhone frame, not a card on a
  // web page. usePersonaState('patient') reads the same shared workflowData
  // regardless of which persona string is passed, so this doesn't need
  // threading through as a prop. The window this covers (papSmsSent &&
  // !papSmsVerified) corresponds exactly to WorkflowEngine.ts's PrES_PAP
  // branch returning '/pes-pap-update-sms' — nothing else briefly flips
  // into the phone frame by accident.
  const { workflowData } = usePersonaState('patient');
  const showPesPapUpdateSmsPhone =
    scenarioFacts(flowType).isPres && workflowData.papSmsSent && !workflowData.papSmsVerified;

  return (
    <div className="flex flex-col flex-1 min-w-0 border-r border-slate-700/50 last:border-r-0">
      {/* Per-panel portal selector (multi-panel mode only) */}
      {showSelector && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/50 shrink-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: info.color }}
          />
          <select
            value={portal}
            onChange={(e) => onChangePortal(e.target.value as PortalId)}
            className="flex-1 text-[11px] bg-transparent text-white/80 border-0 focus:outline-none cursor-pointer"
          >
            {portals.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1e293b] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/*
       * Isolated scroll container.
       * `transform: translateZ(0)` creates a new stacking context — any
       * position:fixed descendant (e.g. the patient portal's fixed Header)
       * is painted relative to this box, not the viewport.
       * This keeps the shell chrome always visible at the top.
       */}
      {/*
       * PrES_PAP (WF5) is the one patient flow given a plain web-based
       * layout instead of the iPhone mockup below — its screens were built
       * wide (see EnrollmentShell's `wide` prop) to read as a desktop web
       * app, matching CRM/Provider/Field, rather than a native mobile
       * screen. All other flows keep the phone frame unchanged. The one
       * exception is the PAP "application update" SMS screen
       * (showPesPapUpdateSmsPhone, computed above) — that one screen still
       * uses the phone frame, matching every other flow's SMS screens.
       */}
      {/* The client's web page is a mobile page, so it sits in the same phone frame as the patient experience. The HCP site is a desktop page, so it does not. */}
      {(portal === "web" && !scenarioFacts(flowType).isHcpEnrollment) || (portal === "patient" && (!scenarioFacts(flowType).isPres || showPesPapUpdateSmsPhone)) ? (
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden flex items-start justify-center py-8 bg-slate-200"
          style={{
            height: `calc(100vh - ${headerHeight}px)`,
          }}
        >
          <div className="i17pro">
            {/* Physical buttons */}
            <div className="i17pro__btn i17pro__btn--action" />
            <div className="i17pro__btn i17pro__btn--vol-up" />
            <div className="i17pro__btn i17pro__btn--vol-down" />
            <div className="i17pro__btn i17pro__btn--power" />
            <div className="i17pro__btn i17pro__btn--camera-ctrl" />

            {/*
             * Screen — translateZ(0) stays: it's load-bearing for the fixed
             * header's stacking context (see box comment above). willChange
             * is dropped: this panel sits `display:none` for most of the
             * session while other tabs are active, and a will-change-promoted
             * layer that's been hidden a long time can flash a stale cached
             * frame (this element's very first paint, back when the actor
             * was still in its default/pre-enrollment state — i.e. the
             * lock-screen route) for a frame before repainting current
             * content when the tab is reactivated. Dropping the hint avoids
             * that flash; the stacking context itself is unaffected.
             */}
            <div className="i17pro__screen" style={{ transform: "translateZ(0)" }}>
              {/* Status bar + Dynamic Island */}
              <div className="i17pro__statusbar" aria-hidden="true">
                <span className="i17pro__time">9:41</span>
                <div className="i17pro__island" />
                <div className="i17pro__icons">
                  <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
                    <rect x="0" y="4" width="3" height="8" rx="1" opacity="0.4"/>
                    <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" opacity="0.6"/>
                    <rect x="9" y="1" width="3" height="11" rx="1" opacity="0.8"/>
                    <rect x="13.5" y="0" width="3" height="12" rx="1"/>
                  </svg>
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                    <path d="M8 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
                    <path d="M8 5.5a5.5 5.5 0 0 1 3.9 1.6l1.1-1.1A7 7 0 0 0 8 4a7 7 0 0 0-5 2l1.1 1.1A5.5 5.5 0 0 1 8 5.5z"/>
                    <path d="M8 2A9 9 0 0 1 14.4 4.4L15.5 3.3A10.5 10.5 0 0 0 8 1 10.5 10.5 0 0 0 .5 3.3l1.1 1.1A9 9 0 0 1 8 2z" opacity="0.5"/>
                  </svg>
                  <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                    <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35"/>
                    <rect x="1.5" y="1.5" width="18" height="9" rx="2.5" fill="currentColor"/>
                    <path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" fillOpacity="0.4"/>
                  </svg>
                </div>
              </div>

              {/* Confirmation banner for the patient phone mockup — see
                  patientToastStore.ts for why this isn't sonner's toast().
                  Sits between the status bar and the content so it never
                  covers the Dynamic Island, and is clipped to the screen's
                  rounded corners by .i17pro__screen's own overflow:hidden. */}
              <PatientPhoneToast />

              {/* Portal content */}
              <div className="i17pro__content">
                <PortalComponent id={portal} flowType={flowType} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden bg-white"
          style={{
            height: `calc(100vh - ${headerHeight}px)`,
            transform: "translateZ(0)",
          }}
        >
          <PortalComponent id={portal} flowType={flowType} />
        </div>
      )}
    </div>
  );
}

// ── DemoShell ─────────────────────────────────────────────────────────────────

export default function DemoShell() {
  const { flowType, demoId, resetDemo, changeFlow } = useDemoStore();
  // Covers WF4 and WF5 — see getPortals/StepBar above. Only used below for
  // tab-visibility-adjacent behavior; the reset ladder and stage-button
  // labels branch on isIAssistPapFlow specifically where WF5's denied-PA
  // path actually diverges from WF4's approved-PA path.
  const facts = scenarioFacts(flowType);
  const isIAssistFlow = facts.isIassistSource;
  // WF5 (iAssist_PAP) — structural clone of WF4, but the demo's PA resolves
  // to Denied instead of Approved (see engine/types.ts's FlowType comment),
  // so its reset ladder and stage-button labels need their own short list
  // instead of reusing WF4's approved-path one below.
  const isIAssistPapFlow = facts.isIassistAppeal;
  // PrES_PAP (WF6) shares WF2's ladder here — its dedicated machine
  // (presPap.ts) accepts the identical event sequence, so the same
  // stage-jump steps apply. See STEP_LABELS_PAP_AUDIT/getPortals above for
  // where WF5 intentionally does NOT follow WF2 (its provider tab stays
  // visible).
  const isPapFlow = facts.isNoPaIntake;
  // CoA_Coverage — its own resetActorToStage branch below (this file's StepBar()
  // component above has its own separate isCoverageFlow local, unrelated scope).
  const isCoverageFlow = facts.isCoverageScenario;
  // CoA_DTP/CoA_Copay — own resetActorToStage branch below too (see the
  // generic block's header comment for why this used to silently break past
  // Prior Authorization for both flows). Same isCoaFlow local StepBar()
  // above already has, unrelated scope.
  const isCoaFlow = facts.hasPricingFork;
  const resetPatient = usePatientStore((s) => s.reset);
  // WF5's own captured-application-data store — reset alongside patientStore
  // wherever patientStore itself gets a full reset() call below (stale
  // session cleanup, "Reset All"). The stage-jump ladder buttons don't call
  // resetPatient() either, only clear its sessionStorage key — presPapStore
  // mirrors that same behavior there for consistency.
  const resetPresPap = usePresPapStore((s) => s.reset);
  // Only ever called from WF5's own "Reset All" (see isIAssistPapFlow guard
  // below) — rulesPortalStore's profile/cases back a totally separate,
  // unrelated Enrollment demo (see that store's header comment), so this
  // must NOT be a blanket resetRulesPortal() call or resetting any other
  // flow would silently wipe a presenter's in-progress Welcome Kit/Call
  // walkthrough too.
  const deactivateAppealRule = useRulesPortalStore((s) => s.deactivateAppealRule);
  const [showStageReset, setShowStageReset] = useState(false);
  const actor = useWorkflowActor();
  const canUndo = useSelector(actor, (s) => (s.context._snapshots?.length ?? 0) > 0);
  // The branch picked at each fork. The stage-jump list for a flow with a fork follows it.
  const forkChoices = useSelector(actor, (s) => (s.context as any).workflowData?.choices) as Record<string, string> | undefined;

  const navigate = useNavigate();
  const location = useLocation();
  const urlSlug = location.pathname.slice(1) || "hub";
  const urlPortal: PortalId = SLUG_TO_PORTAL[urlSlug] ?? "crm";

  // Layout state
  const [layout, setLayout] = useState<LayoutMode>("1up");
  const [panels, setPanels] = useState<PanelState[]>([{ portal: urlPortal }]);

  // Measure shell header height so panels can fill the remaining viewport
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(80);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  // Safety net: sync the XState actor to whichever flowType demoStore has
  // restored from sessionStorage. getWorkflowActor() (in engine/WorkflowProvider,
  // which wraps this whole app) now already reads that same persisted
  // flowType on its very first call, so in the normal case the actor is
  // already correct by the time this runs and getActiveFlowType() matches
  // storedFlow — skip the switch entirely rather than needlessly recreating
  // the actor a second time. Only switches if something left them mismatched.
  useEffect(() => {
    const storedFlow = useDemoStore.getState().flowType;
    if (getActiveFlowType() !== storedFlow) {
      switchWorkflow(storedFlow);
    }
  }, []);

  // Clear stores on first load of new session (tab opened after session expired)
  useEffect(() => {
    const isStaleSession = !sessionStorage.getItem('arx-demo-session');
    if (isStaleSession) {
      sessionStorage.setItem('arx-demo-session', 'active');
      sessionStorage.removeItem('arx-patient-identity');
      sessionStorage.removeItem('arx-prespap-application');
      resetDemo();
      resetPatient();
      resetPresPap();
    }
  }, []);

  // When flow changes, ensure panels don't reference portals that are now filtered out
  // Also redirect URL in 1up mode if the current portal is no longer available
  // Update multi-panel state when flow changes
  useEffect(() => {
    const availablePortals = getPortals(flowType).map(p => p.id);
    setPanels((prev) =>
      prev.map((panel) => {
        if (!availablePortals.includes(panel.portal)) {
          return { portal: availablePortals[0] || "crm" };
        }
        return panel;
      })
    );
  }, [flowType]);

  // In 1up mode, redirect if current URL portal is filtered out
  useEffect(() => {
    const availablePortals = getPortals(flowType).map(p => p.id);
    if (layout === "1up" && !availablePortals.includes(urlPortal)) {
      const fallbackPortal = availablePortals[0] || "crm";
      // Replace, so Back does not return to a tab this scenario does not have.
      navigate(`/${PORTAL_SLUG[fallbackPortal]}`, { replace: true });
    }
  }, [flowType, layout, urlPortal]);

  function switchLayout(next: LayoutMode) {
    setLayout(next);
    const current = urlPortal;
    const defaults = DEFAULT_PANELS[next];
    setPanels([{ portal: current }, ...defaults.slice(1)]);
  }

  function updatePanel(index: number, portalId: PortalId) {
    if (layout === "1up" && index === 0) {
      navigate(`/${PORTAL_SLUG[portalId]}`);
    } else {
      setPanels((prev) => prev.map((p, i) => (i === index ? { portal: portalId } : p)));
    }
  }

  /** Reset All: a fresh machine and a fresh page, back on the scenario's opening screen. The web page's Start a new check uses it too. */
  function resetAll() {
    resetDemo();
    resetPatient();
    resetPresPap();
    // Wipe every OTHER flow's cached progress too, not just
    // the active one — resetDemo()/resetCurrentWorkflowActor
    // only clear the current flow's slot, so an older
    // (possibly stale or structurally outdated) snapshot for
    // another flow could otherwise survive "Reset All" and
    // silently resurface the next time someone switched to
    // it, looking like the demo had reverted.
    resetAllWorkflowSnapshots();
    switchWorkflow(flowType);
    // The fresh machine starts on the scenario's default branch. Restart the
    // selected demo on its own branch.
    const selectedDemo = findDemo(demoId);
    if (selectedDemo) applyDemoChoices(selectedDemo);
    // WF5-only: undo the "Initiate Appeal — Upon PA
    // Denial" rule's live activation (see
    // rulesPortalStore.ts) so the "no rule exists; build
    // one live" moment can be repeated from scratch on the
    // next run-through, without touching any other flow's
    // reset (that store's rule state has nothing to do
    // with WF1-4/6).
    if (isIAssistPapFlow) {
      deactivateAppealRule();
  }
  sessionStorage.removeItem('arxWorkflow_v2');
  // NOTE: do NOT removeItem('arx-demo-shell') here — resetDemo()
  // above already wrote the correct flowType into that key via
  // zustand's own persisted set(). Wiping it afterward leaves the
  // store with nothing to rehydrate from, so any reload before the
  // next write (e.g. a dev-server HMR reload) silently falls back
  // to WF1. This was the root cause of "workflow flips back to
  // WF1" reports.
  sessionStorage.removeItem('arx-patient-identity');
  sessionStorage.removeItem('arx-prespap-application');
  // Keep 'arx-demo-session'. Removing it made the next load look like a new session and reset the
  // selected scenario to the first one, so a reload after Reset All changed scenarios.
  setShowStageReset(false);
  // Reset means "start over" — return to this flow's
  // canonical opening screen (FLOW_START_PORTAL), as a
  // single panel. In 2up/3up layouts "panels" is
  // independent local state that navigate() alone
  // doesn't touch, so reset both explicitly.
  setLayout("1up");
  const startPortal = FLOW_START_PORTAL[flowType];
  setPanels([{ portal: startPortal }]);
  navigate(`/${PORTAL_SLUG[startPortal]}`, { replace: true });
  }

  const handleUndo = () => {
    actor.send({ type: 'UNDO' });
    // Tell the patient portal to re-sync its screen, even from a sticky one.
    useDemoStore.getState().markUndo();
  };

  const showSelector = layout !== "1up";

  // In 1up mode, always derive the active portal from the URL
  const activePanels = layout === "1up" ? [{ portal: urlPortal }] : panels;

  // Every tab stays mounted, hidden, so a tab cannot tell when it is shown. The shell can. It only reports that the
  // Gateway is on screen (the web scenario's APA call waits for that). The machine decides what it starts.
  const gatewayShown = activePanels.some((p) => p.portal === "gateway");
  // Side by side, the Gateway can already be on screen when the page submits. Run again then, so the call is not missed.
  const submitted = useSelector(actor, (s) => s.context.workflowData.enrollmentStatus !== "none");
  useEffect(() => {
    if (gatewayShown) actor.send({ type: "VIEW_GATEWAY", portal: "patient" } as any);
  }, [gatewayShown, submitted, actor]);

  // The web page's "View my coverage summary" asks for the Patient Experience, as the hand-off link would.
  useEffect(() => {
    const show = () => {
      if (activePanels.some((p) => p.portal === "patient")) return;
      const i = activePanels.findIndex((p) => p.portal === "web");
      updatePanel(i === -1 ? 0 : i, "patient");
    };
    window.addEventListener(SHOW_PATIENT_EVENT, show);
    window.addEventListener(START_OVER_EVENT, resetAll);
    return () => {
      window.removeEventListener(SHOW_PATIENT_EVENT, show);
      window.removeEventListener(START_OVER_EVENT, resetAll);
    };
  });

  const resetActorToStage = useCallback((stage: number) => {
    // Bump resetNonce so portals with their own navigation guards (e.g. the
    // patient portal's StateDrivenNav) know this is a reset and force-navigate
    // to the correct screen, same as the "Reset All" button does.
    resetDemo();

    const actor = getWorkflowActor();

    // Always start with a full reset
    actor.send({ type: 'RESET' });

    // Buy and Bill: the HCP runs eMedBV and enrolls copay before the referral, so it has its own ladder.
    if (isBuyAndBillScenario(flowType)) {
      for (const event of buyAndBillStageEvents(stage)) actor.send(event as any);
      return;
    }

    // Free drug (PAP): eMedBV finds no coverage, so it has its own ladder too.
    if (isFreeDrugScenario(flowType)) {
      for (const event of freeDrugStageEvents(stage)) actor.send(event as any);
      return;
    }

    // A scenario whose recipe ends in the Triage transfer exit: one ladder, whatever the source.
    if (isTransferScenario(flowType)) {
      for (const event of transferStageEvents(stage)) actor.send(event as any);
      return;
    }

    // iAssist flows (iAssist_PA_Approved and the iAssist_PAP appeal): the ladders live in
    // iassistLadders.ts so the headless tests run the same event lists.
    if (isIAssistPapFlow || isIAssistFlow) {
      for (const event of iassistStageEvents(flowType as IassistLadderFlow, stage)) {
        actor.send(event as any);
      }
      return;
    }

    // The free drug program ladder follows the scenario's own `bi` fork rungs, like Coverage's.
    if (scenarioHasModule(flowType, "pap_transfer")) {
      for (const event of coassistStageEvents(flowType as CoassistLadderFlow, stage, forkChoices)) actor.send(event as any);
      return;
    }

    // CoAssist flows (CoA_DTP, CoA_Copay, CoA_Coverage): the ladders live in
    // coassistLadders.ts so the headless tests run the same event lists.
    if (isCoverageFlow || isCoaFlow) {
      // RESET keeps the current choices, so the jump lands on the selected branch.
      for (const event of coassistStageEvents(flowType as CoassistLadderFlow, stage, forkChoices)) {
        actor.send(event as any);
      }
      return;
    }

    // Standard (Fax_QS_PA_Approved) and PAP (Fax_PAP_Audit, PrES_PAP): the ladders live in
    // faxLadders.ts so the headless tests run the same event lists.
    for (const event of faxStageEvents(isPapFlow ? 'pap' : 'standard', stage)) {
      actor.send(event as any);
    }
  }, [resetDemo, flowType, isIAssistFlow, isIAssistPapFlow, isPapFlow, isCoverageFlow, isCoaFlow, forkChoices]);

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] overflow-hidden">
      {/* ── Shell header ─────────────────────────────────────────────────── */}
      <header ref={headerRef} className="bg-[#0f172a] text-white shrink-0 shadow-lg">
        {/* Top row */}
        <div className="flex items-stretch">
          {/* Portal tabs (single-panel mode: clicking selects that portal) */}
          <nav className="flex items-stretch flex-1 overflow-x-auto border-l border-white/10">
            {getPortals(flowType).map((tab) => {
              // Provider is already excluded from getPortals() for
              // Fax_PAP_Audit (WF2) and iAssist (WF4) — no separate
              // per-tab hiding needed here now.
              const isActive = layout === "1up" && urlPortal === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (layout !== "1up") return;
                    navigate(`/${PORTAL_SLUG[tab.id]}`);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap",
                    isActive
                      ? "text-white border-indigo-400 bg-white/5"
                      : layout === "1up"
                        ? "text-white/50 border-transparent hover:text-white/80 hover:bg-white/5 cursor-pointer"
                        : "text-white/30 border-transparent cursor-default"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: isActive ? tab.color : "rgba(255,255,255,0.2)" }}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-l border-white/10">
            {/* Layout mode */}
            <div className="flex items-center rounded overflow-hidden border border-white/20">
              {(
                [
                  { id: "1up" as LayoutMode, Icon: LayoutTemplate,  tip: "Single" },
                  { id: "2up" as LayoutMode, Icon: LayoutPanelLeft, tip: "Split 2" },
                  { id: "3up" as LayoutMode, Icon: LayoutGrid,      tip: "Split 3" },
                ] as const
              ).map(({ id, Icon, tip }) => (
                <button
                  key={id}
                  title={tip}
                  onClick={() => switchLayout(id)}
                  className={cn(
                    "flex items-center justify-center w-7 h-7 transition-colors",
                    layout === id
                      ? "bg-indigo-500 text-white"
                      : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                  )}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Demo selector: the brand's `demos` list. A demo is a flow plus its fork choices. */}
            <div className="relative">
              <select
                value={demoId}
                onChange={(e) => {
                  const demo = DEMO_OPTIONS.find((d) => d.id === e.target.value);
                  if (!demo) return;
                  // Remembers the demo, switches the XState actor to its flow (saving the old
                  // flow's snapshot), and applies the demo's fork choices.
                  startDemo(demo);
                  // Navigate to this flow's canonical opening screen
                  setLayout("1up");
                  const startPortal = FLOW_START_PORTAL[demo.flow];
                  setPanels([{ portal: startPortal }]);
                  navigate(`/${PORTAL_SLUG[startPortal]}`, { replace: true });
                }}
                title={DEMO_OPTIONS.find((d) => d.id === demoId)?.description}
                className="appearance-none text-[11px] bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {DEMO_OPTIONS.map((d) => (
                  <option key={d.id} value={d.id} title={d.description} className="bg-[#0f172a]">
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" />
            </div>

            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 border border-white/20 text-white px-2.5 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 size={12} />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowStageReset(!showStageReset)}
                className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 border border-white/20 text-white px-2.5 py-1.5 rounded transition-colors"
              >
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </button>
              {showStageReset && (
                <div className="absolute top-full right-0 mt-1 bg-[#1a1f3a] border-2 border-indigo-400 rounded shadow-xl z-50 min-w-max">
                  <button
                    onClick={resetAll}
                    className="block w-full text-left px-4 py-2.5 text-[12px] font-medium text-white hover:bg-indigo-500/30 border-b border-indigo-400/50 transition-colors"
                  >
                    Reset All
                  </button>
                  {(isPapFlow
                    ? [
                      { stage: 1, label: "Referral Received" },
                      { stage: 2, label: "Patient Enrolled" },
                      { stage: 3, label: "Benefits Investigation" },
                      { stage: 4, label: "PAP Enrolled" },
                      { stage: 5, label: "Triage to Pharmacy" },
                      { stage: 6, label: "Rx Processing" },
                      { stage: 7, label: "Rx Shipped" },
                      { stage: 8, label: "Medication Delivered" },
                    ]
                    : isIAssistPapFlow
                    ? [
                      { stage: 1, label: "Referral Received" },
                      { stage: 2, label: "eRx Submitted (BI Complete, PA Submitted)" },
                      { stage: 3, label: "Patient Enrolled" },
                      { stage: 4, label: "PA Denied" },
                      { stage: 5, label: "Appeal Filed" },
                      { stage: 6, label: "Triage to Pharmacy (Keanu to Facility)" },
                    ]
                    : isBuyAndBillScenario(flowType)
                    ? BUY_AND_BILL_STAGE_LABELS.map((label, i) => ({ stage: i + 1, label }))
                    : isFreeDrugScenario(flowType)
                    ? FREE_DRUG_STAGE_LABELS.map((label, i) => ({ stage: i + 1, label }))
                    : isTransferScenario(flowType)
                    ? TRANSFER_STAGE_LABELS.map((label, i) => ({ stage: i + 1, label }))
                    : isIAssistFlow
                    ? [
                      { stage: 1, label: "Referral Received" },
                      { stage: 2, label: "eRx Submitted (BI Complete, PA Submitted)" },
                      { stage: 3, label: "Patient Enrolled" },
                      { stage: 4, label: "PA Approved" },
                      { stage: 5, label: "Triage to Pharmacy" },
                      { stage: 6, label: "Rx Shipped" },
                      { stage: 7, label: "Medication Delivered" },
                    ]
                    // CoA_Coverage: the list comes from the BI fork, so it follows the
                    // selected branch (workflows/coassist/forks.ts). The events
                    // behind each rung are the same list resetActorToStage sends.
                    : scenarioHasModule(flowType, "pap_transfer")
                    ? forkStageList(biForkFor(flowType), { choices: forkChoices ?? {} })
                    : isCoverageFlow
                    ? forkStageList(biForkFor(flowType), { choices: forkChoices ?? {} })
                    // CoA_DTP/CoA_Copay — own list, not the generic WF1 one
                    // below. That shared list used to call stage 4 "Prior
                    // Authorization" while resetActorToStage's old generic
                    // block only submitted PA there (never approved it, and
                    // never sent the paApproved-sms/otp re-verify events
                    // either) — this is what left the patient stranded on
                    // /enrollment-complete past "PA results." Also adds the
                    // "Cash Offer" rung the CRM's own STAGES_LIVE has
                    // between Prior Authorization and Triage to Pharmacy
                    // (see resetActorToStage's own isCoaFlow branch above),
                    // which the old shared list never had at all.
                    : isCoaFlow
                    ? [
                      { stage: 1, label: "Referral Received" },
                      { stage: 2, label: "Patient Enrolled" },
                      { stage: 3, label: "Benefits Investigation" },
                      { stage: 4, label: "Prior Authorization" },
                      { stage: 5, label: "Cash Offer" },
                      { stage: 6, label: "Triage to Pharmacy" },
                      { stage: 7, label: "Rx Processing" },
                      { stage: 8, label: "Rx Shipped" },
                      { stage: 9, label: "Medication Delivered" },
                    ]
                    : [
                      { stage: 1, label: "Referral Received" },
                      { stage: 2, label: "Patient Enrolled" },
                      { stage: 3, label: "Benefits Investigation" },
                      { stage: 4, label: "Prior Authorization" },
                      { stage: 5, label: "Triage to Pharmacy" },
                      { stage: 6, label: "Rx Processing" },
                      { stage: 7, label: "Rx Shipped" },
                      { stage: 8, label: "Medication Delivered" },
                    ]
                  ).map(({ stage, label }, idx) => (
                    <button
                      key={stage}
                      onClick={() => {
                        try {
                          resetActorToStage(stage);
                        } catch (err) {
                          console.error(`[DemoShell] Jump to stage ${stage} failed`, err);
                        }
                        // See "Reset All" button above: resetActorToStage() already
                        // persists the correct flowType via resetDemo(); don't wipe
                        // 'arx-demo-shell' afterward or a reload before the next
                        // write reverts the workflow to WF1.
                        sessionStorage.removeItem('arx-patient-identity');
                        sessionStorage.removeItem('arxWorkflow_v2');
                        sessionStorage.removeItem('arx-prespap-application');
                        setShowStageReset(false);
                      }}
                      className={cn(
                        "block w-full text-left px-4 py-2.5 text-[12px] text-white hover:bg-indigo-500/30 transition-colors",
                        idx > 0 && "border-t border-indigo-400/30"
                      )}
                    >
                      <span className="text-indigo-300 font-semibold">Stage {stage}:</span> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="px-2 py-4">
          <StepBar />
        </div>
      </header>

      {/* ── Portal panels ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 0, paddingBottom: 0 }}>
        {getPortals(flowType).map((portalInfo) => {
          const isActive = activePanels.some(
            (p) => p.portal === portalInfo.id
          );
          return (
            <div
              key={portalInfo.id}
              style={{
                display: isActive ? 'flex' : 'none',
                flex: 1,
                overflow: 'hidden',
                minWidth: 0,
              }}
            >
              <Panel
                portal={portalInfo.id}
                onChangePortal={(id) => {
                  const i = activePanels.findIndex(
                    (p) => p.portal === portalInfo.id
                  );
                  if (i !== -1) updatePanel(i, id);
                }}
                showSelector={showSelector}
                headerHeight={headerHeight}
                flowType={flowType}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
