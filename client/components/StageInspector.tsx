/**
 * StageInspector — live, stage-scoped view of the active workflow actor.
 *
 * Replaces the old WorkflowLogViewer (removed — it wired a manual
 * actor.subscribe() through a module-level singleton in workflowObserver.ts,
 * which only ever captured the initial snapshot and never picked up later
 * transitions). This reads state the same way the rest of the app does —
 * useSelector(actor, ...) — so it re-renders on every real transition with
 * no side-channel subscription to get out of sync.
 *
 * Rather than logging a history of past events, this shows the CURRENT
 * state, scoped to whichever stage is active, because that's what's useful
 * when driving a demo: "what does the data look like right now."
 *
 * Region/stage config and formatting helpers live in
 * client/engine/stageInspectorConfig.ts, not in this file — see that file's
 * header comment for why (Fast Refresh / full-reload considerations).
 */
import { useState } from 'react';
import { useSelector } from '@xstate/react';
import { ChevronDown, Copy } from 'lucide-react';
import { useWorkflowActor, useActiveWorkflowId } from '@/engine/WorkflowProvider';
import type { WorkflowData } from '@/engine/types';
import {
  type ParallelRegion,
  PARALLEL_REGION_ORDER,
  PARALLEL_REGION_LABELS,
  PARALLEL_REGION_TERMINAL,
  PARALLEL_REGION_FIELDS,
  COA_STAGES,
  formatValue,
  fieldLabel,
  workflowDataEqual,
} from '@/engine/stageInspectorConfig';

export function StageInspector() {
  const actor = useWorkflowActor();
  const flowType = useActiveWorkflowId();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // useSelector re-renders this component on every real transition — no
  // manual subscribe, no module-level state to fall out of sync.
  const stateValue = useSelector(actor, (s) => s.value);
  const workflowData = useSelector(actor, (s) => s.context.workflowData, workflowDataEqual);

  const isCoA = flowType === 'CoA_DTP';

  let stageLabel: string;
  let relevantFields: (keyof WorkflowData)[];
  let regionSummary: { label: string; node: string; active: boolean }[];

  if (isCoA) {
    const current = typeof stateValue === 'string' ? stateValue : 'idle';
    const stage = COA_STAGES.find((s) => s.state === current) ?? COA_STAGES[0];
    stageLabel = stage.label;
    relevantFields = stage.fields;
    regionSummary = [{ label: 'CoA Direct-to-Patient', node: current, active: true }];
  } else {
    const value = (stateValue as Record<ParallelRegion, string>) ?? ({} as Record<ParallelRegion, string>);
    const activeRegion =
      PARALLEL_REGION_ORDER.find((r) => !PARALLEL_REGION_TERMINAL[r].includes(value[r])) ?? 'order';
    stageLabel = `${PARALLEL_REGION_LABELS[activeRegion]} — ${value[activeRegion]}`;
    relevantFields = PARALLEL_REGION_FIELDS[activeRegion];
    regionSummary = PARALLEL_REGION_ORDER.map((r) => ({
      label: PARALLEL_REGION_LABELS[r],
      node: value[r],
      active: r === activeRegion,
    }));
  }

  const fieldsToShow = showAll ? (Object.keys(workflowData) as (keyof WorkflowData)[]) : relevantFields;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(workflowData, null, 2));
  };

  return (
    <div className="fixed bottom-0 right-0 z-40 max-w-sm">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium rounded-tl transition-colors flex items-center gap-2"
      >
        <span className="truncate max-w-[220px]">Stage: {stageLabel}</span>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="bg-[#0f172a] border-t border-l border-[#334155] shadow-2xl rounded-tl-lg max-h-96 w-96 overflow-y-auto text-xs text-[#e2e8f0] font-mono">
          <div className="sticky top-0 bg-[#1e293b] border-b border-[#334155] px-4 py-2 flex items-center justify-between gap-2">
            <span className="text-[#cbd5e1] font-semibold truncate">{stageLabel}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              >
                {showAll ? 'This stage only' : 'Show all fields'}
              </button>
              <button
                onClick={handleCopy}
                className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
                title="Copy full workflow data as JSON"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {!isCoA && (
            <div className="bg-[#0f172a] px-4 py-2 border-b border-[#334155] flex flex-wrap gap-x-3 gap-y-1">
              {regionSummary.map((r) => (
                <span key={r.label} className={r.active ? 'text-cyan-400' : 'text-[#64748b]'}>
                  {r.label}: {r.node}
                </span>
              ))}
            </div>
          )}

          <div className="bg-[#0f172a] divide-y divide-[#1e293b]">
            {fieldsToShow.map((key) => (
              <div key={key} className="px-4 py-1.5 flex items-center justify-between gap-3">
                <span className="text-[#94a3b8]">{fieldLabel(key)}</span>
                <span className="text-[#f1f5f9] text-right truncate max-w-[60%]">
                  {formatValue(workflowData[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StageInspector;
