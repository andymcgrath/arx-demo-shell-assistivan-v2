/**
 * NewRule — "build a rule live" moment for the Action Factory demo.
 *
 * Recreates the "no rule exists to initiate an appeal; build one live"
 * scenario: the presenter walks through naming a rule, setting its
 * conditions, and confirming its Create-Task action, then hits Save &
 * Activate — which is what actually flips rulesPortalStore's
 * `appealRuleActive` flag and adds the rule to `customRules` (see that
 * store's "Bridge to the real engine" header section for what happens next
 * in the CRM portal).
 *
 * The condition/field pickers below are interactive (SfSelect, same as
 * ProfileDetail's live toggles) so the presenter has something to actually
 * click through on stage, but — like every seeded rule in rulesData.ts
 * except WEG-WK-01/WEG-WC-01 — there's no engine parsing arbitrary picks
 * back out of them. Saving always creates the one designed rule
 * (APPEAL_RULE in rulesPortalStore.ts); the pickers default to the values
 * that describe it and exist for the walkthrough, not to author a different
 * rule. This mirrors the codebase's existing convention (see rulesData.ts's
 * header) of only wiring a real engine behind the specific conditions a demo
 * script actually exercises.
 */
import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import RulesAppShell from "../components/RulesAppShell";
import { useToast } from "../components/Toast";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { usePatientStore } from "@/store/patientStore";
import { SfButton, SfPrimaryButton, SfLink, SfSelect, Pill } from "../components/SfPrimitives";

const FIELD_OPTIONS = ["Status", "PA Result", "Service Type Name"];
const OPERATOR_OPTIONS = ["Equals", "Not Equals"];
const VALUE_OPTIONS = ["Complete", "Denied", "Onboarding", "Pending", "Approved"];
const TASK_OWNER_OPTIONS = ["Select task owner", "Case Owner", "Queue"];

interface ConditionRow {
  field: string;
  operator: string;
  value: string;
}

export default function NewRule() {
  const navigate = useNavigate();
  const showToast = useToast();
  const drugName = usePatientStore((s) => s.drugName);
  const activateAppealRule = useRulesPortalStore((s) => s.activateAppealRule);

  const [ruleName] = useState("Initiate Appeal — Upon PA Denial");
  const [category, setCategory] = useState("Prior Authorization");
  const [sourceObject] = useState("Stage");
  const [recordType, setRecordType] = useState("Prior Authorization");
  const [taskOwner, setTaskOwner] = useState(TASK_OWNER_OPTIONS[0]);
  const [conditions, setConditions] = useState<ConditionRow[]>([
    { field: "Status", operator: "Equals", value: "Complete" },
    { field: "PA Result", operator: "Equals", value: "Denied" },
    { field: "Service Type Name", operator: "Equals", value: "Onboarding" },
  ]);

  const updateCondition = (index: number, patch: Partial<ConditionRow>) => {
    setConditions((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleSave = () => {
    activateAppealRule();
    showToast("Rule created and activated — Action Factory will initiate appeals on PA denial automatically");
    navigate("/rule/WEG-PA-01");
  };

  return (
    <RulesAppShell active="rules">
      <div className="bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[#dddbda]">
          <div>
            <div className="text-[11px] text-[#706e6b] uppercase tracking-wide">New Rule</div>
            <div className="text-[20px] font-bold text-[#3e3e3c]">{ruleName}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <SfButton onClick={() => navigate("/rules")}>Cancel</SfButton>
            <SfPrimaryButton onClick={handleSave}>Save &amp; Activate Rule</SfPrimaryButton>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left info column */}
          <div className="lg:col-span-1 border border-[#dddbda] rounded overflow-hidden h-fit">
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Rule Name</span>
              <span className="text-[13px] text-[#3e3e3c]">{ruleName}</span>
            </div>
            <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Category</span>
              <SfSelect value={category} onChange={setCategory} options={["Prior Authorization", "Enrollment"]} />
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Issue</span>
              <span className="text-[13px] text-[#3e3e3c]">None</span>
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Source Object</span>
              <span className="text-[13px] text-[#3e3e3c]">{sourceObject}</span>
            </div>
            <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Record Type</span>
              <SfSelect value={recordType} onChange={setRecordType} options={["Prior Authorization", "Enrollment Assistance"]} />
            </div>
            <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">External ID</span>
              <span className="text-[13px] text-[#706e6b] italic">Auto-generated on save</span>
            </div>
            <div className="flex flex-col px-3 py-2">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Profile</span>
              <SfLink onClick={() => navigate("/profile/wegovy")}>{drugName}</SfLink>
            </div>
          </div>

          {/* Right column: conditions + actions */}
          <div className="lg:col-span-2 min-w-0">
            <div className="mb-4">
              <div className="flex flex-wrap gap-1.5 mb-1">
                {conditions.map((c, i) => (
                  <Pill key={i}>
                    {c.field} {c.operator === "Equals" ? "=" : "≠"} {c.value}
                  </Pill>
                ))}
              </div>
              <div className="text-[11px] text-[#706e6b]">✨ Generated from conditions below</div>
            </div>

            <div className="border border-[#dddbda] rounded overflow-hidden mb-5 overflow-x-auto">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Conditions ({conditions.length})
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#dddbda]">
                    {["#", "Field Object", "Field API Name", "Operator", "Comparison Value"].map((h) => (
                      <th key={h} className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conditions.map((c, i) => (
                    <tr key={i} className="border-b border-[#dddbda] last:border-b-0">
                      <td className="px-2.5 py-2 text-[#3e3e3c]">{i + 1}</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">Source Object</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <SfSelect value={c.field} onChange={(v) => updateCondition(i, { field: v })} options={FIELD_OPTIONS} />
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <SfSelect value={c.operator} onChange={(v) => updateCondition(i, { operator: v })} options={OPERATOR_OPTIONS} />
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <SfSelect value={c.value} onChange={(v) => updateCondition(i, { value: v })} options={VALUE_OPTIONS} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-[#dddbda] rounded overflow-hidden mb-5">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Create Task
              </div>
              <div className="p-3 overflow-x-auto">
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
                    <tr className="border-b border-[#dddbda] last:border-b-0">
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">PA-01 Action — Initiate Appeal</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c] whitespace-nowrap">Initiate Appeal</td>
                      <td className="px-2.5 py-2 text-[#3e3e3c]">File an appeal on the patient's behalf following prior authorization denial.</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <SfSelect value={taskOwner} onChange={setTaskOwner} options={TASK_OWNER_OPTIONS} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-[12px] text-[#706e6b] px-1">
              Saving activates this rule immediately — any case currently sitting at Prior Authorization Denied will have its appeal initiated automatically.
            </div>
          </div>
        </div>
      </div>
    </RulesAppShell>
  );
}
