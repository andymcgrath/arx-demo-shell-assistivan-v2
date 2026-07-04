/**
 * DemoConfigurator — inline collapsible configurator drawer
 *
 * Provides runtime controls for:
 * - Workflow selection and switching
 * - Portal visibility (persona toggling)
 * - Behavior toggles (auto-advance, undo, progress display)
 * - Reset functionality
 */

import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useSwitchWorkflow, useActiveWorkflowId, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { useDemoStore } from "@/store/demoStore";
import { workflowRegistry } from "@/engine/WorkflowRegistry";
import { cn } from "@/lib/utils";

export type PortalId = "patient" | "provider" | "analytics" | "field";

export interface ConfiguratorProps {
  visiblePortals: PortalId[];
  onPortalVisibilityChange: (portals: PortalId[]) => void;
  isOpen: boolean;
  onClose: () => void;
  /** Called on "Reset Everything". The shell owns navigation and layout/panel
   *  state, so it also owns returning to the active flow's canonical opening
   *  screen (FLOW_START_PORTAL) — this component just triggers it. */
  onReset?: () => void;
}

const PORTAL_VISIBILITY_KEY = "arx-demo-portal-visibility";
const BEHAVIOR_FLAGS_KEY = "arx-demo-behavior-flags";

export default function DemoConfigurator({
  visiblePortals,
  onPortalVisibilityChange,
  isOpen,
  onClose,
  onReset,
}: ConfiguratorProps) {
  const switchWorkflow = useSwitchWorkflow();
  const activeWorkflowId = useActiveWorkflowId();
  const dispatch = useWorkflowDispatch();
  const resetDemo = useDemoStore((s) => s.resetDemo);

  const [workflows] = useState(workflowRegistry.listWorkflows());
  const [behaviorFlags, setBehaviorFlags] = useState(() => {
    const stored = sessionStorage.getItem(BEHAVIOR_FLAGS_KEY);
    return stored
      ? JSON.parse(stored)
      : {
          autoAdvance: true,
          undoSupport: true,
          showProgress: true,
        };
  });

  const handleWorkflowChange = (workflowId: string) => {
    switchWorkflow(workflowId as import('@/engine/types').FlowType);
    resetDemo();
  };

  const handlePortalToggle = (portal: PortalId) => {
    const newPortals = visiblePortals.includes(portal)
      ? visiblePortals.filter((p) => p !== portal)
      : [...visiblePortals, portal];
    onPortalVisibilityChange(newPortals);
    sessionStorage.setItem(PORTAL_VISIBILITY_KEY, JSON.stringify(newPortals));
  };

  const handleBehaviorToggle = (flag: keyof typeof behaviorFlags) => {
    const newFlags = { ...behaviorFlags, [flag]: !behaviorFlags[flag] };
    setBehaviorFlags(newFlags);
    sessionStorage.setItem(BEHAVIOR_FLAGS_KEY, JSON.stringify(newFlags));
  };

  const handleReset = () => {
    dispatch("RESET");
    resetDemo();
    sessionStorage.clear();
    setBehaviorFlags({
      autoAdvance: true,
      undoSupport: true,
      showProgress: true,
    });
    // Reset means "start over" — the shell handles returning to the active
    // flow's canonical opening screen (navigation + layout/panels).
    onReset?.();
  };

  if (!isOpen) return null;

  const portalOptions: { id: PortalId; label: string }[] = [
    { id: "patient", label: "Patient" },
    { id: "provider", label: "Provider" },
    { id: "analytics", label: "Analytics" },
    { id: "field", label: "Field" },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black/50 pointer-events-none">
      <div
        className="pointer-events-auto fixed right-0 top-0 h-screen w-96 bg-[#1a1f3a] border-l-2 border-indigo-400 shadow-2xl overflow-y-auto"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1f3a] border-b border-indigo-400/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Configuration</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-indigo-500/30 rounded transition-colors text-indigo-300"
            aria-label="Close configurator"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Workflow Selector */}
          <section>
            <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-3">
              Workflow
            </h3>
            <select
              value={activeWorkflowId}
              onChange={(e) => handleWorkflowChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f172a] border border-indigo-400/50 rounded text-white text-sm hover:border-indigo-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition-colors"
            >
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-indigo-200/60 mt-2">
              {workflows.find((w) => w.id === activeWorkflowId)?.description}
            </p>
          </section>

          {/* Portal Visibility */}
          <section>
            <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-3">
              Portals
            </h3>
            <div className="space-y-2">
              {/* CRM always enabled */}
              <label className="flex items-center gap-3 p-2 rounded hover:bg-indigo-500/10 transition-colors">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="w-4 h-4 accent-indigo-400 cursor-not-allowed"
                />
                <span className="text-sm text-white">CRM (always enabled)</span>
              </label>

              {/* Toggleable portals */}
              {portalOptions.map((portal) => (
                <label
                  key={portal.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visiblePortals.includes(portal.id)}
                    onChange={() => handlePortalToggle(portal.id)}
                    className="w-4 h-4 accent-indigo-400 cursor-pointer"
                  />
                  <span className="text-sm text-white">{portal.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Behavior Toggles */}
          <section>
            <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-3">
              Behavior
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorFlags.autoAdvance}
                  onChange={() => handleBehaviorToggle("autoAdvance")}
                  className="w-4 h-4 accent-indigo-400 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm text-white block">Auto-advance timers</span>
                  <span className="text-xs text-indigo-200/60">PA approval, order shipment</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorFlags.undoSupport}
                  onChange={() => handleBehaviorToggle("undoSupport")}
                  className="w-4 h-4 accent-indigo-400 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm text-white block">Undo support</span>
                  <span className="text-xs text-indigo-200/60">Revert to last state</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={behaviorFlags.showProgress}
                  onChange={() => handleBehaviorToggle("showProgress")}
                  className="w-4 h-4 accent-indigo-400 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm text-white block">Progress indicator</span>
                  <span className="text-xs text-indigo-200/60">Step timeline display</span>
                </div>
              </label>
            </div>
          </section>

          {/* Reset */}
          <section className="border-t border-indigo-400/30 pt-6">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold rounded transition-colors"
            >
              Reset Everything
            </button>
            <p className="text-xs text-indigo-200/60 mt-2">
              Clears all state, resets workflow, and removes all settings
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
