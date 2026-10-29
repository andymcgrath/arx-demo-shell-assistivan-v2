import { useMemo, useState } from "react";
import { BRAND } from "@/brand";
import type { BrandDemo } from "@/brand/schema";
import type { FlowType } from "@/engine/types";
import { forkStageList, forksForScenario } from "@/engine/workflow/forks";
import { ALL_FORKS } from "@/workflows/forks";

/**
 * Brand Lab, Demos tab. Pick a flow, pick each declared fork's exit, name the demo, and copy the
 * `demos` JSON for the brand file. Forks are read only here. A new fork needs rule code.
 */

const FLOWS: { id: FlowType; label: string }[] = [
  { id: "Fax_QS_PA_Approved", label: "Fax standard (PA approved)" },
  { id: "Fax_PAP_Audit", label: "Fax PAP (audit)" },
  { id: "CoA_DTP", label: "CoAssist DTP" },
  { id: "CoA_Copay", label: "CoAssist Copay" },
  { id: "CoA_Coverage", label: "CoAssist Coverage and transfer" },
  { id: "iAssist_PA_Approved", label: "iAssist (PA approved)" },
  { id: "iAssist_PAP", label: "iAssist appeal" },
  { id: "iAssist_Medical_Transfer", label: "iAssist medical transfer" },
  { id: "iAssist_Buy_And_Bill", label: "iAssist Buy and Bill" },
  { id: "iAssist_Buy_And_Bill_PAP", label: "iAssist Buy and Bill, Free Drug" },
  { id: "CoA_Medical_Transfer", label: "CoAssist medical transfer" },
  { id: "PrES_PAP", label: "PrES PAP (legacy)" },
];

const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#cbd5e1";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function DemosLab() {
  const [demos, setDemos] = useState<BrandDemo[]>(() => (BRAND.demos ?? []).map((d) => ({ ...d })));
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  const demo = demos[selected];
  const forks = useMemo(() => (demo ? forksForScenario(ALL_FORKS, demo.flow) : []), [demo]);

  const update = (patch: Partial<BrandDemo>) =>
    setDemos((list) => list.map((d, i) => (i === selected ? { ...d, ...patch } : d)));

  const setChoice = (forkId: string, exitId: string) =>
    update({ choices: { ...(demo?.choices ?? {}), [forkId]: exitId } });

  const setFlow = (flow: FlowType) => update({ flow, choices: undefined });

  const add = () => {
    const flow = FLOWS[0].id;
    setDemos((list) => [...list, { id: `demo-${list.length + 1}`, flow, label: "New demo" }]);
    setSelected(demos.length);
  };

  const remove = () => {
    setDemos((list) => list.filter((_, i) => i !== selected));
    setSelected(0);
  };

  const move = (dir: -1 | 1) => {
    const to = selected + dir;
    if (to < 0 || to >= demos.length) return;
    setDemos((list) => {
      const next = [...list];
      [next[selected], next[to]] = [next[to], next[selected]];
      return next;
    });
    setSelected(to);
  };

  const json = JSON.stringify(
    demos.map((d) => {
      const choices = d.choices && Object.keys(d.choices).length ? d.choices : undefined;
      return {
        id: d.id,
        flow: d.flow,
        label: d.label,
        ...(d.description ? { description: d.description } : {}),
        ...(choices ? { choices } : {}),
      };
    }),
    null,
    2,
  );

  const input = "w-full rounded border px-2 py-1 text-sm";

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-[340px] shrink-0 overflow-y-auto border-r bg-white p-4" style={{ borderColor: LINE }}>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
          Demos in the dropdown
        </h2>
        <ol className="mb-3">
          {demos.map((d, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className="mb-1 w-full rounded border px-2 py-1.5 text-left text-sm"
                style={{
                  borderColor: i === selected ? INK : LINE,
                  background: i === selected ? INK : "#ffffff",
                  color: i === selected ? "#ffffff" : INK,
                }}
              >
                {d.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={add} className="rounded border px-2.5 py-1 text-xs" style={{ borderColor: LINE }}>
            Add demo
          </button>
          <button type="button" onClick={() => move(-1)} className="rounded border px-2.5 py-1 text-xs" style={{ borderColor: LINE }}>
            Up
          </button>
          <button type="button" onClick={() => move(1)} className="rounded border px-2.5 py-1 text-xs" style={{ borderColor: LINE }}>
            Down
          </button>
          <button type="button" onClick={remove} disabled={demos.length < 2} className="rounded border px-2.5 py-1 text-xs disabled:opacity-40" style={{ borderColor: LINE }}>
            Remove
          </button>
        </div>
        <p className="mb-3 text-xs" style={{ color: MUTED }}>
          The first demo is where a new session starts. Nothing is saved. Copy the JSON into{" "}
          <code>brands/{BRAND.slug}/brand.json</code>.
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(json);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="mb-2 rounded px-3 py-1.5 text-sm font-semibold text-white"
          style={{ background: INK }}
        >
          {copied ? "Copied" : "Copy demos JSON"}
        </button>
        <pre className="max-h-64 overflow-auto rounded p-3 text-xs" style={{ background: INK, color: "#f1f5f9" }}>
          {json}
        </pre>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-5">
        {!demo ? (
          <p className="text-sm" style={{ color: MUTED }}>
            No demos. Add one.
          </p>
        ) : (
          <div className="max-w-3xl">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold">
                Name in the dropdown
                <input
                  className={input}
                  style={{ borderColor: LINE }}
                  value={demo.label}
                  onChange={(e) => update({ label: e.target.value, id: slug(e.target.value) || demo.id })}
                />
              </label>
              <label className="text-xs font-semibold">
                Workflow
                <select
                  className={input}
                  style={{ borderColor: LINE }}
                  value={demo.flow}
                  onChange={(e) => setFlow(e.target.value as FlowType)}
                >
                  {FLOWS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-xs font-semibold">
                Description
                <input
                  className={input}
                  style={{ borderColor: LINE }}
                  value={demo.description ?? ""}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </label>
            </div>

            {forks.length === 0 ? (
              <p className="rounded border p-3 text-sm" style={{ borderColor: LINE, color: MUTED }}>
                This workflow has no declared forks. It runs one path.
              </p>
            ) : (
              forks.map((fork) => {
                const chosen = demo.choices?.[fork.id];
                const shown = fork.exits.find((x) => x.id === chosen) ?? fork.exits[0];
                const stages = forkStageList(fork, { choices: { [fork.id]: shown.id } } as never);
                return (
                  <section key={fork.id} className="mb-5">
                    <h3 className="text-sm font-bold">{fork.label}</h3>
                    <p className="mb-2 text-xs" style={{ color: MUTED }}>
                      {chosen ? "" : "No pick, so the workflow's default branch runs."}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {fork.exits.map((x) => {
                        const active = x.id === shown.id && !!chosen;
                        return (
                          <button
                            key={x.id}
                            type="button"
                            title={x.description}
                            onClick={() => setChoice(fork.id, x.id)}
                            className="rounded border px-3 py-1.5 text-sm font-semibold"
                            style={{
                              borderColor: INK,
                              background: active ? INK : "#ffffff",
                              color: active ? "#ffffff" : INK,
                            }}
                          >
                            {x.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mb-2 text-sm">{shown.description}</p>
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
                      Journey for {shown.label}
                    </h4>
                    <ol className="rounded border bg-white" style={{ borderColor: LINE }}>
                      {stages.map((s) => (
                        <li key={s.stage} className="flex gap-3 border-b px-3 py-1.5 text-sm last:border-b-0" style={{ borderColor: "#e2e8f0" }}>
                          <span className="w-5 shrink-0 text-right" style={{ color: MUTED }}>
                            {s.stage}
                          </span>
                          {s.label}
                        </li>
                      ))}
                    </ol>
                  </section>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
