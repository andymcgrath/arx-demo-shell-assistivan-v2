import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "@xstate/react";
import { ChevronDown, Zap } from "lucide-react";
import { useWorkflowActor } from "@/engine/WorkflowProvider";
import type { WorkflowData } from "@/engine/types";
import { eventFor, triggerRows, type TriggerRow } from "@/engine/workflow/triggers";
import { definitionFor } from "@/workflows/definitions";
import { stageMapFor } from "@/workflows/stageMaps";
import { cn } from "@/lib/utils";
import { defaultPayload, payloadFields } from "./triggerPayloads";

/**
 * The Trigger panel. The patient view has no CRM, provider, or iAssist app, so this offers what those apps do, read from
 * the workflow definition (engine/workflow/triggers.ts). It sends the same events they send: an agent step opens the
 * stage (VIEW_STAGE) and the machine reveals the result after its own delay, a manual step sends its event. It holds the
 * stage open until the result lands, as the CRM does with its tab, then sends LEAVE_STAGE.
 */

const seconds = (ms?: number) => (ms ? `${Math.round(ms / 100) / 10}s` : "now");

/** Whether the panel can send a row. Rows that run on their own show but have no button. */
const canSend = (row: TriggerRow) => row.kind !== "system";

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wide">{title}</p>
      <p className="text-[10px] text-indigo-200/60 mb-1.5">{hint}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export default function TriggerPanel() {
  const actor = useWorkflowActor();
  const data = useSelector(actor, (s) => (s.context as { workflowData: WorkflowData }).workflowData);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, Record<string, unknown>>>({});
  const [lastFired, setLastFired] = useState("");
  /** Stages this panel has open, as the CRM keeps a tab open. */
  const viewing = useRef(new Set<string>());

  const rows = useMemo(() => {
    const def = definitionFor(data.flowType);
    return def ? triggerRows(def, data, stageMapFor(data.flowType), defaultPayload) : [];
  }, [data]);

  // Close a stage when its result has landed (the agent row is gone), and every open stage when the panel goes away.
  useEffect(() => {
    for (const stage of [...viewing.current]) {
      if (!rows.some((r) => r.kind === "agent" && r.stage === stage)) {
        viewing.current.delete(stage);
        actor.send({ type: "LEAVE_STAGE", portal: "crm", stage } as any);
        setLastFired("");
      }
    }
  }, [rows, actor]);
  useEffect(
    () => () => {
      for (const stage of viewing.current) actor.send({ type: "LEAVE_STAGE", portal: "crm", stage } as any);
      viewing.current.clear();
    },
    [actor],
  );

  const fire = (row: TriggerRow) => {
    const payload = { ...row.payload, ...defaultPayload(row.event, data), ...(picked[row.event] ?? {}) };
    if (row.kind === "agent" && row.stage) viewing.current.add(row.stage);
    actor.send(eventFor({ ...row, payload }) as any);
    setLastFired(row.kind === "agent" ? `${row.label}: waiting ${seconds(row.reveals?.afterMs)}` : `Sent ${row.label}`);
  };

  const agent = rows.filter((r) => r.kind === "agent");
  const manual = rows.filter((r) => r.kind === "manual");
  const system = rows.filter((r) => r.kind === "system");
  const fireable = agent.length + manual.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 h-7 px-2.5 rounded border text-[11px] font-medium transition-colors",
          fireable > 0 ? "border-indigo-400 bg-indigo-500/20 text-white" : "border-white/20 bg-white/10 text-white/60",
        )}
      >
        <Zap size={12} />
        Trigger
        {fireable > 0 && <span className="rounded-full bg-indigo-400 text-[10px] leading-none px-1.5 py-0.5">{fireable}</span>}
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="dialog" aria-label="Trigger" className="absolute top-full right-0 mt-1 w-80 bg-[#1a1f3a] border border-indigo-400 rounded shadow-xl z-50 p-3 space-y-3">
          {rows.length === 0 && <p className="text-[11px] text-white/60">Nothing for the presenter to do right now. The patient is next.</p>}

          {agent.length > 0 && (
            <Section title="Agent steps" hint="Open the stage. The result lands after the delay.">
              {agent.map((row) => (
                <button
                  key={row.stage}
                  onClick={() => fire(row)}
                  className="w-full text-left px-2.5 py-2 rounded bg-indigo-500 hover:bg-indigo-400 text-white text-[12px] font-semibold transition-colors"
                >
                  {row.label}
                  <span className="block text-[10px] font-normal text-white/80">
                    Result in {seconds(row.reveals?.afterMs)}
                  </span>
                </button>
              ))}
            </Section>
          )}

          {manual.length > 0 && (
            <Section title="Manual steps" hint="Done by another app in the full view.">
              {manual.map((row) => (
                <div key={row.event} className="rounded border border-indigo-400/40 p-2 space-y-1.5">
                  {payloadFields(row.event, data).map((field) =>
                    field.key === "pharmacy" ? (
                      <select
                        key={field.key}
                        aria-label={field.label}
                        defaultValue={field.options[0].name}
                        onChange={(e) =>
                          setPicked((p) => ({ ...p, [row.event]: { ...p[row.event], pharmacy: field.options.find((o) => o.name === e.target.value) } }))
                        }
                        className="w-full px-2 py-1 bg-[#0f172a] border border-indigo-400/50 rounded text-white text-[12px]"
                      >
                        {field.options.map((o) => (
                          <option key={o.name} value={o.name}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        key={field.key}
                        type="date"
                        aria-label={field.label}
                        defaultValue={String(defaultPayload(row.event, data)[field.key])}
                        onChange={(e) => setPicked((p) => ({ ...p, [row.event]: { ...p[row.event], [field.key]: e.target.value } }))}
                        className="w-full px-2 py-1 bg-[#0f172a] border border-indigo-400/50 rounded text-white text-[12px]"
                      />
                    ),
                  )}
                  <button
                    onClick={() => fire(row)}
                    className="w-full px-2.5 py-1.5 rounded bg-indigo-500 hover:bg-indigo-400 text-white text-[12px] font-semibold transition-colors"
                  >
                    {row.label}
                  </button>
                </div>
              ))}
            </Section>
          )}

          {system.length > 0 && (
            <Section title="Runs on its own" hint="The machine does these. No button.">
              {system.map((row) => (
                <p key={row.event} className="text-[11px] text-white/70">
                  {row.label} <span className="text-white/40">in {seconds(row.reveals?.afterMs)}</span>
                </p>
              ))}
            </Section>
          )}

          {lastFired && <p className="text-[10px] text-emerald-300">{lastFired}</p>}
        </div>
      )}
    </div>
  );
}
