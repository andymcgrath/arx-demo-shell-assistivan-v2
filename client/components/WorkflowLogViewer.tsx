import { useState } from 'react';
import { useWorkflowLogStore } from '@/engine/workflowLogStore';
import { ChevronDown, Trash2, Copy } from 'lucide-react';

export function WorkflowLogViewer() {
  const logs = useWorkflowLogStore((s) => s.logs);
  const clearLogs = useWorkflowLogStore((s) => s.clear);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed bottom-0 right-0 z-40 max-w-lg bg-slate-950 rounded-tl-lg shadow-2xl border-l border-t border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 text-sm font-medium rounded-tl transition-colors flex items-center justify-between"
      >
        <span>Workflow Logs ({logs.length})</span>
        <ChevronDown
          size={18}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="bg-slate-950 border-t border-slate-700 max-h-96 overflow-y-auto text-xs text-slate-100 font-mono">
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
            <span className="text-slate-200 font-semibold">State Changes</span>
            <button
              onClick={() => clearLogs()}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              title="Clear logs"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="px-4 py-3 text-slate-400 italic">No workflow events yet</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {logs.map((log, idx) => (
                <div key={idx} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-cyan-300 font-semibold">{log.eventType}</span>
                        <span className="text-slate-500 ml-2 text-xs">@ {log.timestamp}</span>
                        <div className="text-slate-300 text-xs mt-2 space-y-1">
                          {Object.keys(log.changes).length > 0 ? (
                            <>
                              {Object.entries(log.changes).slice(0, 3).map(([key, val]) => (
                                <div key={key}>
                                  <span className="text-slate-400">{key}:</span> {String(val.before)} →{' '}
                                  <span className="text-green-300">{String(val.after)}</span>
                                </div>
                              ))}
                              {Object.keys(log.changes).length > 3 && (
                                <div className="text-slate-500 text-xs">
                                  +{Object.keys(log.changes).length - 3} more changes
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="italic text-slate-600">(no state changes)</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`flex-shrink-0 mt-1 transition-transform text-slate-400 ${
                          expandedIndex === idx ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {expandedIndex === idx && (
                    <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 text-xs">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-slate-300 font-semibold">Full State</span>
                        <button
                          onClick={() =>
                            handleCopy(JSON.stringify(log.fullState, null, 2))
                          }
                          className="text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <pre className="text-slate-200 overflow-x-auto max-h-48 bg-slate-800 p-3 rounded border border-slate-700 text-xs leading-relaxed">
                        {JSON.stringify(log.fullState, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
