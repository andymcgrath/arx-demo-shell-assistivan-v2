/**
 * RuleDetail — a single Action Factory rule record.
 *
 * Full treatment (condition-chip summary bar + 6/3-row condition table) for
 * WEG-WK-01 and WEG-WC-01, the two rules the live demo moment exercises —
 * every other rule renders the same layout with its own (simpler) seeded
 * conditions/actions from rulesData.ts.
 */
import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import RulesAppShell from "../components/RulesAppShell";
import { useToast } from "../components/Toast";
import { RULES } from "../data/rulesData";
import { usePatientStore } from "@/store/patientStore";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { SfButton, SfLink, Pill, SectionHeader } from "../components/SfPrimitives";

const ACTION_SUBTABS = [
  { id: "create-task", label: "Create Task" },
  { id: "create-comment", label: "Create Comment" },
  { id: "update-record", label: "Update Record" },
  { id: "create-record", label: "Create Record" },
] as const;

export default function RuleDetail({ externalId }: { externalId: string }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const drugName = usePatientStore((s) => s.drugName);
  // Rules created live in this portal (e.g. the Appeal-on-Denial rule) live
  // in rulesPortalStore's customRules, not the static RULES catalog — merge
  // both so this page renders instead of 404ing once one exists.
  const customRules = useRulesPortalStore((s) => s.customRules);
  const rule = [...RULES, ...customRules].find((r) => r.externalId === externalId);

  const [activeSubTab, setActiveSubTab] = useState<(typeof ACTION_SUBTABS)[number]["id"]>("create-task");
  const [moreOpen, setMoreOpen] = useState(false);
  const [simCollapsed, setSimCollapsed] = useState(true);

  if (!rule) {
    return (
      <RulesAppShell active="rules">
        <div className="p-8 text-[13px] text-[#706e6b]">
          Rule "{externalId}" not found. <SfLink onClick={() => navigate("/rules")}>Back to Rules</SfLink>
        </div>
      </RulesAppShell>
    );
  }

  return (
    <RulesAppShell active="rules">
      <div className="bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[#dddbda]">
          <div>
            <div className="text-[11px] text-[#706e6b] uppercase tracking-wide">Rule</div>
            <div className="text-[20px] font-bold text-[#3e3e3c]">{rule.ruleName}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {["Create Task Action", "Create Comment Action", "Update Record Action", "Create Record Action", "Publish Event"].map((label) => (
              <SfButton key={label} onClick={() => showToast(`${label} isn't available in this demo`)}>
                {label}
              </SfButton>
            ))}
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left info column */}
          <div className="lg:col-span-1 border border-[#dddbda] rounded overflow-hidden h-fit">
            {[
              ["Rule Name", rule.ruleName],
              ["Category", rule.category],
              ["Issue", rule.issue],
              ["Source Object", rule.sourceObject],
              ["Record Type", rule.recordType],
              ["External ID", rule.externalId],
              ["Active Actions", String(rule.taskActions.filter((a) => a.active).length)],
              ["Inactive Actions", String(rule.taskActions.filter((a) => !a.active).length)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">{label}</span>
                <span className="text-[13px] text-[#3e3e3c]">{value}</span>
              </div>
            ))}
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Description</span>
              <span className="text-[13px] text-[#3e3e3c]">{rule.description}</span>
            </div>
            <div className="flex flex-col px-3 py-2">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Profile</span>
              <SfLink onClick={() => navigate("/profile/wegovy")}>{drugName}</SfLink>
            </div>
          </div>

          {/* Right column: conditions + actions */}
          <div className="lg:col-span-2 min-w-0">
            {rule.conditionChips && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {rule.conditionChips.map((c) => (
                    <Pill key={c}>{c}</Pill>
                  ))}
                </div>
                <div className="text-[11px] text-[#706e6b]">✨ Generated from current config</div>
              </div>
            )}

            <div className="border border-[#dddbda] rounded overflow-hidden mb-5 overflow-x-auto">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Conditions ({rule.conditions.length})
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#dddbda]">
                    {["#", "Condition Number", "Field Object", "Field API Name", "Operator", "Comparison Value", "Value Type"].map((h) => (
                      <th key={h} className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rule.conditions.map((c, i) => (
                    <tr key={c.conditionNumber} className="border-b border-[#dddbda] last:border-b-0">
                      <td className="px-2.5 py-2 text-[#3e3e3c]">{i + 1}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.conditionNumber}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.fieldObject}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.fieldApiName}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.operator}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.comparisonValue}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.valueType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-[#dddbda] rounded overflow-hidden mb-5">
              <div className="flex items-stretch border-b border-[#dddbda] px-1 overflow-x-auto">
                {ACTION_SUBTABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveSubTab(t.id)}
                    className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      activeSubTab === t.id ? "border-[#0070d2] text-[#0070d2]" : "border-transparent text-[#3e3e3c] hover:bg-[#f3f3f3]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setMoreOpen((v) => !v)}
                    className="px-3 py-2 text-[12.5px] font-medium text-[#3e3e3c] hover:bg-[#f3f3f3] whitespace-nowrap"
                  >
                    More ▾
                  </button>
                  {moreOpen && (
                    <div className="absolute right-0 top-full bg-white border border-[#dddbda] rounded shadow-lg z-10 min-w-[160px]">
                      {["Publish Event", "Call Apex"].map((label) => (
                        <button
                          key={label}
                          onClick={() => {
                            setMoreOpen(false);
                            showToast(`${label} isn't available in this demo`);
                          }}
                          className="block w-full text-left px-3 py-2 text-[12.5px] text-[#3e3e3c] hover:bg-[#f3f3f3]"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 overflow-x-auto">
                {activeSubTab === "create-task" ? (
                  rule.taskActions.length ? (
                    <>
                      <div className="text-[12px] text-[#706e6b] mb-2">Tasks ({rule.taskActions.length})</div>
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b border-[#dddbda]">
                            <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Action Name</th>
                            <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Task Subject Template</th>
                            <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Task Description Template</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rule.taskActions.map((a) => (
                            <tr key={a.actionName} className="border-b border-[#dddbda] last:border-b-0">
                              <td className="px-2.5 py-2 whitespace-nowrap">
                                <SfLink onClick={() => navigate(`/action/${rule.externalId}`)}>{a.actionName}</SfLink>
                              </td>
                              <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{a.taskSubjectTemplate}</td>
                              <td className="px-2.5 py-2 text-[#3e3e3c]">{a.taskDescriptionTemplate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div className="text-[12px] text-[#706e6b] py-6 text-center">Tasks (0)</div>
                  )
                ) : activeSubTab === "update-record" ? (
                  <div className="text-[12px] text-[#706e6b] py-6 text-center">Update Record Actions (0)</div>
                ) : activeSubTab === "create-record" ? (
                  <div className="text-[12px] text-[#706e6b] py-6 text-center">Actions (0)</div>
                ) : (
                  <div className="text-[12px] text-[#706e6b] py-6 text-center">Comment Actions (0)</div>
                )}
              </div>
            </div>

            <div className="border border-[#dddbda] rounded overflow-hidden">
              <SectionHeader title="Simulation / Executions" collapsed={simCollapsed} onToggle={() => setSimCollapsed((v) => !v)} />
              {!simCollapsed && <div className="p-3 text-[12px] text-[#706e6b]">No executions to show.</div>}
            </div>
          </div>
        </div>
      </div>
    </RulesAppShell>
  );
}
