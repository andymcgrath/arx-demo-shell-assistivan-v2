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
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDemoStore, type FlowType } from "@/store/demoStore";
import { usePatientStore } from "@/store/patientStore";
import { usePersonaState, useWorkflowActor } from "@/engine/WorkflowProvider";
import { getWorkflowActor, switchWorkflow } from "@/engine/actorSingleton";
import { useSelector } from "@xstate/react";
import {
  RefreshCw, Undo2, ChevronDown,
  LayoutTemplate, LayoutPanelLeft, LayoutGrid, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DemoConfigurator, { type PortalId as ConfigPortalId } from "./DemoConfigurator";

// ── Portal registry ───────────────────────────────────────────────────────────

import CrmPortal      from "@/portals/crm/index";
import PatientPortal  from "@/portals/patient/index";
import AnalyticsPortal from "@/portals/analytics/index";
import FieldPortal    from "@/portals/field/index";
import ProviderPortal from "@/portals/provider/index";
import IAssistPortal from "@/portals/iassist/index";

export type PortalId = "crm" | "patient" | "analytics" | "field" | "provider" | "iassist";

const PORTAL_SLUG: Record<PortalId, string> = {
  crm: "hub",
  patient: "patient",
  analytics: "analytics",
  field: "field",
  provider: "provider",
  iassist: "iassist",
};

const SLUG_TO_PORTAL: Record<string, PortalId> = {
  hub: "crm",
  patient: "patient",
  analytics: "analytics",
  field: "field",
  provider: "provider",
  iassist: "iassist",
};

function getProviderPortalLabel(flowType: string): string {
  return "Provider";
}

const PORTALS_BASE: { id: PortalId; color: string }[] = [
  { id: "crm",       color: "#0176d3" },
  { id: "patient",   color: "#16a34a" },
  { id: "provider",  color: "#7c3aed" },
  { id: "iassist",   color: "#d97706" },
  { id: "analytics", color: "#d97706" },
  { id: "field",     color: "#14b8a6" },
];

function getPortals(flowType: string) {
  const isIAssistFlow = flowType === "iAssist_PA_Approved";

  return PORTALS_BASE.filter(p => {
    // Show provider for workflows 1-3, hide for workflow 4 (iAssist)
    if (p.id === "provider" && isIAssistFlow) return false;
    // Show iAssist only for workflow 4
    if (p.id === "iassist" && !isIAssistFlow) return false;
    return true;
  }).map(p => {
    if (p.id === "provider") {
      return { ...p, id: p.id as PortalId, label: getProviderPortalLabel(flowType) };
    }
    const baseLabels: Record<PortalId, string> = {
      crm: "HUB / CRM",
      patient: "Patient",
      provider: getProviderPortalLabel(flowType),
      iassist: "iAssist",
      analytics: "Workforce",
      field: "Field",
    };
    return { ...p, id: p.id as PortalId, label: baseLabels[p.id] };
  });
}

/** Renders the portal component for the given id */
function PortalComponent({ id, flowType }: { id: PortalId; flowType?: string }) {
  switch (id) {
    case "crm":       return <CrmPortal />;
    case "patient":   return <PatientPortal />;
    case "analytics": return <AnalyticsPortal />;
    case "field":     return <FieldPortal />;
    case "provider":  return <ProviderPortal key={flowType} />;
    case "iassist":   return <IAssistPortal branded={false} />;
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

// ── Flow options ──────────────────────────────────────────────────────────────

const FLOW_OPTIONS: { value: FlowType; label: string }[] = [
  { value: "Fax_QS_PA_Approved", label: "1. Fax QS / PA Approved" },
  { value: "Fax_PAP_Audit",      label: "2. Fax PAP Audit" },
  { value: "CoA_DTP",            label: "3. CoA Direct to Patient" },
  { value: "iAssist_PA_Approved", label: "4. iAssist PA Approved" },
];

// ── Step progress bar ─────────────────────────────────────────────────────────

const STEP_LABELS_DEFAULT = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "Prior Authorization",
  "Dispatch to Triage",
  "Rx Processing",
  "Rx Shipped",
  "Medication Delivered",
];

const STEP_LABELS_PAP_AUDIT = [
  "Referral Received",
  "Patient Enrolled",
  "PAP Enrolled",
  "First Dispense",
  "Audit Initiated",
  "PA Approved",
];

const STEP_LABELS_COA = [
  "eRx Received",
  "Consent",
  "Benefits Investigation",
  "Cash Offer",
  "Patient Payment",
  "Dispensing",
  "Delivered",
];

function StepBar() {
  const flowType     = useDemoStore((s) => s.flowType);
  const { workflowData } = usePersonaState('crm');

  const workflowStep = (() => {
    const p = workflowData.pharmacyStatus;
    const d = workflowData.dispatchStatus;
    const pa = workflowData.paStatus;
    const bi = workflowData.biStatus;
    const consent = workflowData.consentStatus;
    const enrollment = workflowData.enrollmentStatus;

    if (p === 'delivered') return 9;
    if (p === 'shipped') return 7;
    if (p === 'processing' || p === 'ready') return 6;
    if (d === 'pending_selection' || d === 'selected' || d === 'dispatched') return 5;
    if (pa === 'approved') return 5;
    if (pa === 'submitted' || pa === 'denied') return 4;
    if (bi === 'running' || bi === 'submitted') return 3;
    if (bi === 'complete') return 4;
    if (consent === 'confirmed') return 3;
    if (enrollment === 'enrolled') return 2;
    return 1;
  })();

  const biStatus        = workflowData.biStatus;
  const paStatus        = workflowData.paStatus;
  const pharmacyStatus  = workflowData.pharmacyStatus;
  const STEP_LABELS     = flowType === "Fax_PAP_Audit" ? STEP_LABELS_PAP_AUDIT
    : flowType === "CoA_DTP" ? STEP_LABELS_COA
    : STEP_LABELS_DEFAULT;
  const biRunning       = biStatus === "running" && flowType !== "Fax_PAP_Audit";
  const paProcessing    = paStatus === "submitted" && flowType !== "Fax_PAP_Audit";
  const rxInTransit     = pharmacyStatus === "processing" && flowType !== "Fax_PAP_Audit";
  const rxProcessing    = pharmacyStatus === "ready" && flowType !== "Fax_PAP_Audit";
  const rxShipping      = pharmacyStatus === "shipped" && flowType !== "Fax_PAP_Audit";


  return (
    <div className="flex items-center gap-0 px-6 py-2">
      {STEP_LABELS.map((label, i) => {
        const n      = i + 1;
        const done   = workflowStep > n;
        const active = workflowStep === n;
        // Connector between step 2→3 pulses while BI is running; step 4→5 while PA is processing; step 5→6 while rx is processing; step 6→7 while shipping
        const connectorRunning = (biRunning && n === 2) || (paProcessing && n === 3) || ((rxInTransit || rxProcessing) && n === 5) || (rxShipping && n === 6);
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-0.5 relative">
              {/* Pulsing ring behind the step-3 dot while BI runs */}
              {biRunning && n === 3 && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the step-4 dot while PA is processing */}
              {paProcessing && n === 4 && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the step-6 dot while rx is in transit */}
              {rxInTransit && n === 6 && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the step-6 dot while rx is processing */}
              {rxProcessing && n === 6 && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              {/* Pulsing ring behind the step-7 dot while rx is shipping */}
              {rxShipping && n === 7 && (
                <span className="absolute inset-0 rounded-full animate-ping bg-white/25" />
              )}
              <div
                className={cn(
                  "relative w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all",
                  done   && "bg-white text-[#0f172a] border-white",
                  active && "bg-white/30 text-white border-white scale-110",
                  biRunning && n === 3 && "border-white/60 text-white/60",
                  paProcessing && n === 4 && "border-white/60 text-white/60",
                  (rxInTransit || rxProcessing) && n === 6 && "border-white/60 text-white/60",
                  rxShipping && n === 7 && "border-white/60 text-white/60",
                  !done && !active && !(biRunning && n === 3) && !(paProcessing && n === 4) && !((rxInTransit || rxProcessing) && n === 6) && !(rxShipping && n === 7) && "bg-transparent text-white/40 border-white/25"
                )}
              >
                {done ? "✓" : n}
              </div>
              <span
                className={cn(
                  "text-[9px] whitespace-nowrap hidden md:block",
                  active && "text-white font-semibold",
                  done   && "text-white/70",
                  biRunning && n === 3 && "text-white/60 animate-pulse",
                  paProcessing && n === 4 && "text-white/60 animate-pulse",
                  (rxInTransit || rxProcessing) && n === 6 && "text-white/60 animate-pulse",
                  rxShipping && n === 7 && "text-white/60 animate-pulse",
                  !done && !active && !(biRunning && n === 3) && !(paProcessing && n === 4) && !((rxInTransit || rxProcessing) && n === 6) && !(rxShipping && n === 7) && "text-white/30"
                )}
              >
                {biRunning && n === 3 ? "Running…" : paProcessing && n === 4 ? "Pending…" : rxInTransit && n === 6 ? "In Transit…" : rxProcessing && n === 6 ? "Processing…" : rxShipping && n === 7 ? "Shipping…" : label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-1 mb-3 transition-all overflow-hidden relative",
                  workflowStep > n ? "bg-white/60" : "bg-white/15"
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
      {portal === "patient" ? (
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden flex items-start justify-center py-8 bg-slate-200"
          style={{
            height: `calc(100vh - ${headerHeight}px)`,
            willChange: "contents",
          }}
        >
          <div className="i17pro">
            {/* Physical buttons */}
            <div className="i17pro__btn i17pro__btn--action" />
            <div className="i17pro__btn i17pro__btn--vol-up" />
            <div className="i17pro__btn i17pro__btn--vol-down" />
            <div className="i17pro__btn i17pro__btn--power" />
            <div className="i17pro__btn i17pro__btn--camera-ctrl" />

            {/* Screen */}
            <div className="i17pro__screen" style={{ transform: "translateZ(0)", willChange: "transform" }}>
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
            willChange: "contents",
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
  const { flowType, resetDemo, changeFlow, switchFlow } = useDemoStore();
  const resetPatient = usePatientStore((s) => s.reset);
  const [showStageReset, setShowStageReset] = useState(false);
  const [showConfigurator, setShowConfigurator] = useState(false);
  const actor = useWorkflowActor();
  const canUndo = useSelector(actor, (s) => (s.context._snapshots?.length ?? 0) > 0);

  const navigate = useNavigate();
  const location = useLocation();
  const urlSlug = location.pathname.slice(1) || "hub";
  const urlPortal: PortalId = SLUG_TO_PORTAL[urlSlug] ?? "crm";

  // Layout state
  const [layout, setLayout] = useState<LayoutMode>("1up");
  const [panels, setPanels] = useState<PanelState[]>([{ portal: urlPortal }]);

  // Portal visibility state
  const [visiblePortals, setVisiblePortals] = useState<ConfigPortalId[]>(() => {
    const stored = sessionStorage.getItem("arx-demo-portal-visibility");
    return stored ? JSON.parse(stored) : ["patient", "provider", "analytics", "field"];
  });

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

  // On every mount, sync the XState actor to whichever flowType the demoStore
  // has restored from sessionStorage. The actor always initialises as "enrollment"
  // so without this a refresh while on CoA would leave the actor mismatched.
  useEffect(() => {
    const storedFlow = useDemoStore.getState().flowType;
    switchWorkflow(storedFlow);
  }, []);

  // Clear stores on first load of new session (tab opened after session expired)
  useEffect(() => {
    const isStaleSession = !sessionStorage.getItem('arx-demo-session');
    if (isStaleSession) {
      sessionStorage.setItem('arx-demo-session', 'active');
      sessionStorage.removeItem('arx-patient-identity');
      resetDemo();
      resetPatient();
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
      navigate(`/${PORTAL_SLUG[fallbackPortal]}`);
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

  const handleUndo = () => {
    actor.send({ type: 'UNDO' });
  };

  const showSelector = layout !== "1up";

  // In 1up mode, always derive the active portal from the URL
  const activePanels = layout === "1up" ? [{ portal: urlPortal }] : panels;

  const resetActorToStage = useCallback((stage: number) => {
    const actor = getWorkflowActor();

    // Always start with a full reset
    actor.send({ type: 'RESET' });

    // Walk the actor forward to the target stage
    // Each stage builds on the previous
    if (stage >= 2) {
      actor.send({ type: 'ENROLL', portal: 'crm' });
      actor.send({ type: 'INVITE', portal: 'crm' });
      actor.send({ type: 'VERIFY_SMS', portal: 'patient' });
      actor.send({ type: 'VERIFY_OTP', portal: 'patient' });
      actor.send({ type: 'CONFIRM_CONSENT', portal: 'patient' });
    }
    if (stage >= 3) {
      actor.send({ type: 'RUN_BI', portal: 'crm' });
    }
    if (stage >= 4) {
      actor.send({
        type: 'COMPLETE_BI',
        portal: 'crm',
        result: 'coverage_found'
      });
      actor.send({ type: 'SUBMIT_PA', portal: 'provider' });
    }
    if (stage >= 5) {
      actor.send({ type: 'APPROVE_PA', portal: 'crm' });
    }
    if (stage >= 6) {
      const pharmacy = {
        name: 'Accredo Health Group Inc.',
        address: '789 Pharma Ave',
        city: 'Tampa',
        state: 'FL',
        zip: '33602',
        phone: '(813) 555-5678',
      };
      actor.send({
        type: 'SELECT_PHARMACY',
        portal: 'crm',
        pharmacy
      });
      actor.send({ type: 'FILL_RX', portal: 'crm' });
    }
    if (stage >= 7) {
      actor.send({ type: 'SHIP_RX', portal: 'crm' });
    }
    if (stage >= 8) {
      actor.send({ type: 'DELIVER_RX', portal: 'crm' });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] overflow-hidden">
      {/* ── Shell header ─────────────────────────────────────────────────── */}
      <header ref={headerRef} className="bg-[#0f172a] text-white shrink-0 shadow-lg">
        {/* Top row */}
        <div className="flex items-stretch">
          {/* Portal tabs (single-panel mode: clicking selects that portal) */}
          <nav className="flex items-stretch flex-1 overflow-x-auto border-l border-white/10">
            {getPortals(flowType).map((tab) => {
              const isHidden = tab.id === "provider" && flowType === "Fax_PAP_Audit";
              if (isHidden) return null;

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

            {/* Flow selector */}
            <div className="relative">
              <select
                value={flowType}
                onChange={(e) => {
                  const newFlow = e.target.value as FlowType;
                  // 1. Save current demoStore state, restore (or reset) for newFlow
                  switchFlow(newFlow);
                  // 2. Switch the XState actor, saving its snapshot for the old workflow
                  switchWorkflow(newFlow);
                  // 3. Auto-navigate to provider portal for COA flow
                  if (newFlow === "CoA_DTP") {
                    const providerUrl = getPortals(newFlow).find(p => p.id === "provider")?.id;
                    if (providerUrl) {
                      navigate(`/${providerUrl}`);
                    }
                  }
                }}
                className="appearance-none text-[11px] bg-white/10 border border-white/20 text-white rounded px-2 py-1.5 pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {FLOW_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#0f172a]">
                    {f.label}
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
                    onClick={() => {
                      resetDemo();
                      resetPatient();
                      switchWorkflow(flowType);
                      sessionStorage.removeItem('arxWorkflow_v2');
                      sessionStorage.removeItem('arx-demo-shell');
                      sessionStorage.removeItem('arx-patient-identity');
                      sessionStorage.removeItem('arx-demo-session');
                      setShowStageReset(false);
                    }}
                    className="block w-full text-left px-4 py-2.5 text-[12px] font-medium text-white hover:bg-indigo-500/30 border-b border-indigo-400/50 transition-colors"
                  >
                    Reset All
                  </button>
                  {(flowType === "Fax_PAP_Audit"
                    ? [
                      { stage: 1, label: "Referral Received" },
                      { stage: 2, label: "Patient Enrolled" },
                      { stage: 3, label: "PAP Enrolled" },
                      { stage: 4, label: "First Dispense" },
                      { stage: 5, label: "Audit Initiated" },
                      { stage: 6, label: "PA Approved" },
                    ]
                    : [
                      { stage: 1, label: "Referral Received" },
                      { stage: 2, label: "Patient Enrolled" },
                      { stage: 3, label: "Benefits Investigation" },
                      { stage: 4, label: "Prior Authorization" },
                      { stage: 5, label: "Dispatch to Triage" },
                      { stage: 6, label: "Rx Processing" },
                      { stage: 7, label: "Rx Shipped" },
                      { stage: 8, label: "Medication Delivered" },
                    ]
                  ).map(({ stage, label }, idx) => (
                    <button
                      key={stage}
                      onClick={() => {
                        resetActorToStage(stage);
                        sessionStorage.removeItem('arx-demo-shell');
                        sessionStorage.removeItem('arx-patient-identity');
                        sessionStorage.removeItem('arxWorkflow_v2');
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

            <button
              onClick={() => setShowConfigurator(!showConfigurator)}
              className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 border border-white/20 text-white px-2.5 py-1.5 rounded transition-colors"
              aria-label="Configure demo"
            >
              <Settings size={12} />
              <span className="hidden sm:inline">Config</span>
            </button>
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

      {/* Configurator Panel */}
      <DemoConfigurator
        visiblePortals={visiblePortals}
        onPortalVisibilityChange={setVisiblePortals}
        isOpen={showConfigurator}
        onClose={() => setShowConfigurator(false)}
      />
    </div>
  );
}
