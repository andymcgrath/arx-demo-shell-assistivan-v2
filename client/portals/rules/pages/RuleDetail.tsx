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
import { RULES, type RuleCondition } from "../data/rulesData";
import { usePatientStore } from "@/store/patientStore";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { SfButton, SfPrimaryButton, SfLink, SfSelect, Pill, SectionHeader } from "../components/SfPrimitives";

const ACTION_SUBTABS = [
  { id: "create-task", label: "Create Task" },
  { id: "create-comment", label: "Create Comment" },
  { id: "update-record", label: "Update Record" },
  { id: "create-record", label: "Create Record" },
] as const;

// Same option sets NewRule.tsx offers when a presenter builds a rule live —
// "Edit Task Action" below reuses them so editing exposes the identical
// fields. Every getter unions the base list with the row's CURRENT value so
// opening edit mode on a rule seeded outside NewRule.tsx's vocabulary (e.g.
// a static rulesData.ts catalog entry with a Profile-object condition, or
// APPEAL_RULE's default "Source Owner" task owner) never loses data just
// because that value isn't one of the demo's preset choices.
const CATEGORY_OPTIONS = ["Prior Authorization", "Enrollment"];
const RECORD_TYPE_OPTIONS = ["Prior Authorization", "Enrollment Assistance"];
const FIELD_OPTIONS = ["Status", "PA Result", "Service Type Name"];
const OPERATOR_OPTIONS = ["Equals", "Not Equals"];
const VALUE_OPTIONS = ["Complete", "Denied", "Onboarding", "Pending", "Approved"];
const TASK_OWNER_OPTIONS = ["Select task owner", "Case Owner", "Queue"];

function withCurrent(options: string[], current: string): string[] {
  return options.includes(current) ? options : [...options, current];
}

export default function RuleDetail({ externalId }: { externalId: string }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const drugName = usePatientStore((s) => s.drugName);
  // Rules created live in this portal (e.g. the Appeal-on-Denial rule) live
  // in rulesPortalStore's customRules, not the static RULES catalog — merge
  // both so this page renders instead of 404ing once one exists. customRules
  // is checked FIRST: updateCustomRule() (the "Edit Task Action" flow below)
  // saves edits to a static catalog rule as a patched copy in customRules
  // under the same externalId, so that copy has to win the lookup or a save
  // would appear to silently do nothing.
  const customRules = useRulesPortalStore((s) => s.customRules);
  const updateCustomRule = useRulesPortalStore((s) => s.updateCustomRule);
  const rule = customRules.find((r) => r.externalId === externalId) ?? RULES.find((r) => r.externalId === externalId);

  const [activeSubTab, setActiveSubTab] = useState<(typeof ACTION_SUBTABS)[number]["id"]>("create-task");
  const [moreOpen, setMoreOpen] = useState(false);
  const [simCollapsed, setSimCollapsed] = useState(true);

  // "Edit Task Action" mode — mirrors NewRule.tsx's own local component
  // state pattern (edits live here until Save, nothing is written to the
  // store mid-edit). Seeded from `rule` only when editing starts (see
  // startEditing below), not at mount, since `rule` can be undefined on
  // first render before the not-found guard runs.
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [editRecordType, setEditRecordType] = useState("");
  const [editConditions, setEditConditions] = useState<RuleCondition[]>([]);
  const [editTaskOwner, setEditTaskOwner] = useState("");

  const startEditing = () => {
    if (!rule) return;
    setEditCategory(rule.category);
    setEditRecordType(rule.recordType);
    setEditConditions(rule.conditions);
    setEditTaskOwner(rule.taskActions[0]?.ownerStrategy ?? TASK_OWNER_OPTIONS[0]);
    setIsEditing(true);
  };

  const updateEditCondition = (index: number, patch: Partial<RuleCondition>) => {
    setEditConditions((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const cancelEditing = () => setIsEditing(false);

  const saveEditing = () => {
    if (!rule) return;
    updateCustomRule(rule.externalId, {
      category: editCategory,
      recordType: editRecordType,
      conditions: editConditions,
      conditionChips: editConditions.map((c) => `${c.fieldApiName} ${c.operator === "Equals" ? "=" : "≠"} ${c.comparisonValue}`),
      taskActions: rule.taskActions.map((a, i) => (i === 0 ? { ...a, ownerStrategy: editTaskOwner } : a)),
    });
    setIsEditing(false);
    showToast("Rule updated");
  };

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
            {isEditing ? (
              <>
                <SfButton onClick={cancelEditing}>Cancel</SfButton>
                <SfPrimaryButton onClick={saveEditing}>Save Changes</SfPrimaryButton>
              </>
            ) : (
              <>
                <SfButton onClick={() => showToast("Create Task Action isn't available in this demo")}>Create Task Action</SfButton>
                <SfButton onClick={startEditing}>Edit Task Action</SfButton>
                {["Create Comment Action", "Update Record Action", "Create Record Action", "Publish Event"].map((label) => (
                  <SfButton key={label} onClick={() => showToast(`${label} isn't available in this demo`)}>
                    {label}
                  </SfButton>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left info column */}
          <div className="lg:col-span-1 border border-[#dddbda] rounded overflow-hidden h-fit">
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Rule Name</span>
              <span className="text-[13px] text-[#3e3e3c]">{rule.ruleName}</span>
            </div>
            <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Category</span>
              {isEditing ? (
                <SfSelect value={editCategory} onChange={setEditCategory} options={withCurrent(CATEGORY_OPTIONS, rule.category)} />
              ) : (
                <span className="text-[13px] text-[#3e3e3c]">{rule.category}</span>
              )}
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Issue</span>
              <span className="text-[13px] text-[#3e3e3c]">{rule.issue}</span>
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Source Object</span>
              <span className="text-[13px] text-[#3e3e3c]">{rule.sourceObject}</span>
            </div>
            <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Record Type</span>
              {isEditing ? (
                <SfSelect value={editRecordType} onChange={setEditRecordType} options={withCurrent(RECORD_TYPE_OPTIONS, rule.recordType)} />
              ) : (
                <span className="text-[13px] text-[#3e3e3c]">{rule.recordType}</span>
              )}
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">External ID</span>
              <span className="text-[13px] text-[#3e3e3c]">{rule.externalId}</span>
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Active Actions</span>
              <span className="text-[13px] text-[#3e3e3c]">{String(rule.taskActions.filter((a) => a.active).length)}</span>
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Inactive Actions</span>
              <span className="text-[13px] text-[#3e3e3c]">{String(rule.taskActions.filter((a) => !a.active).length)}</span>
            </div>
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
            {isEditing ? (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {editConditions.map((c, i) => (
                    <Pill key={i}>
                      {c.fieldApiName} {c.operator === "Equals" ? "=" : "≠"} {c.comparisonValue}
                    </Pill>
                  ))}
                </div>
                <div className="text-[11px] text-[#706e6b]">✨ Generated from conditions below</div>
              </div>
            ) : (
              rule.conditionChips && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {rule.conditionChips.map((c) => (
                      <Pill key={c}>{c}</Pill>
                    ))}
                  </div>
                  <div className="text-[11px] text-[#706e6b]">✨ Generated from current config</div>
                </div>
              )
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
                  {(isEditing ? editConditions : rule.conditions).map((c, i) => (
                    <tr key={c.conditionNumber} className="border-b border-[#dddbda] last:border-b-0">
                      <td className="px-2.5 py-2 text-[#3e3e3c]">{i + 1}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.conditionNumber}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.fieldObject}</td>
                      {isEditing ? (
                        <>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <SfSelect
                              value={c.fieldApiName}
                              onChange={(v) => updateEditCondition(i, { fieldApiName: v })}
                              options={withCurrent(FIELD_OPTIONS, c.fieldApiName)}
                            />
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <SfSelect
                              value={c.operator}
                              onChange={(v) => updateEditCondition(i, { operator: v })}
                              options={withCurrent(OPERATOR_OPTIONS, c.operator)}
                            />
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <SfSelect
                              value={c.comparisonValue}
                              onChange={(v) => updateEditCondition(i, { comparisonValue: v })}
                              options={withCurrent(VALUE_OPTIONS, c.comparisonValue)}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.fieldApiName}</td>
                          <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.operator}</td>
                          <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{c.comparisonValue}</td>
                        </>
                      )}
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
                            <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Task Owner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rule.taskActions.map((a, i) => (
                            <tr key={a.actionName} className="border-b border-[#dddbda] last:border-b-0">
                              <td className="px-2.5 py-2 whitespace-nowrap">
                                <SfLink onClick={() => navigate(`/action/${rule.externalId}`)}>{a.actionName}</SfLink>
                              </td>
                              <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">{a.taskSubjectTemplate}</td>
                              <td className="px-2.5 py-2 text-[#3e3e3c]">{a.taskDescriptionTemplate}</td>
                              <td className="px-2.5 py-2 whitespace-nowrap">
                                {isEditing && i === 0 ? (
                                  <SfSelect value={editTaskOwner} onChange={setEditTaskOwner} options={withCurrent(TASK_OWNER_OPTIONS, editTaskOwner)} />
                                ) : (
                                  <span className="text-[#3e3e3c]">{a.ownerStrategy}</span>
                                )}
                              </td>
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
