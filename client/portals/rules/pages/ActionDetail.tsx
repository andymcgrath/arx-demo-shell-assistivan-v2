/**
 * ActionDetail — a single Create Task action record, reached from a rule's
 * Action Name link. Every rule in rulesData.ts has exactly one task action
 * today, so `ruleExternalId` alone identifies it (no separate action id).
 */
import type { ReactNode } from "react";
import { useNavigate } from "@/lib/portalRouter";
import RulesAppShell from "../components/RulesAppShell";
import { RULES } from "../data/rulesData";
import { SfLink } from "../components/SfPrimitives";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col px-3 py-2 border-b border-[#dddbda] last:border-b-0">
      <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">{label}</span>
      <span className="text-[13px] text-[#3e3e3c]">{value}</span>
    </div>
  );
}

export default function ActionDetail({ ruleExternalId }: { ruleExternalId: string }) {
  const navigate = useNavigate();
  const rule = RULES.find((r) => r.externalId === ruleExternalId);
  const action = rule?.taskActions[0];

  if (!rule || !action) {
    return (
      <RulesAppShell active="rules">
        <div className="p-8 text-[13px] text-[#706e6b]">
          Action not found. <SfLink onClick={() => navigate("/rules")}>Back to Rules</SfLink>
        </div>
      </RulesAppShell>
    );
  }

  return (
    <RulesAppShell active="rules">
      <div className="bg-white">
        <div className="px-5 py-4 border-b border-[#dddbda]">
          <div className="text-[11px] text-[#706e6b] uppercase tracking-wide">Action</div>
          <div className="text-[20px] font-bold text-[#3e3e3c]">{action.actionName}</div>
          <div className="flex flex-wrap items-center gap-4 mt-1 text-[12px] text-[#706e6b]">
            <span>Sequence {action.sequence}</span>
            <span>Action Type: Create Task</span>
            <span>{action.active ? "Active ✓" : "Inactive"}</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
          <div className="border border-[#dddbda] rounded overflow-hidden h-fit">
            <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">Action Details</div>
            <Row label="Action Name" value={action.actionName} />
            <Row label="Rule" value={<SfLink onClick={() => navigate(`/rule/${rule.externalId}`)}>{rule.ruleName}</SfLink>} />
            <Row label="Action Type" value="Create Task" />
            <Row label="Source Object" value="Stage" />
            <Row label="Dispatch Mode" value={action.dispatchMode} />
          </div>

          <div className="border border-[#dddbda] rounded overflow-hidden h-fit">
            <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">Task Details</div>
            <Row label="Task Subject Template" value={action.taskSubjectTemplate} />
            <Row label="Task Status" value={action.taskStatus} />
            <Row label="Task Description Template" value={action.taskDescriptionTemplate} />
            <Row label="Task Type" value={action.taskType} />
          </div>

          <div className="border border-[#dddbda] rounded overflow-hidden h-fit">
            <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">Task Owner</div>
            <Row label="WhatId Strategy" value={action.whatIdStrategy} />
            <Row label="Owner Strategy" value={action.ownerStrategy} />
          </div>

          <div className="border border-[#dddbda] rounded overflow-hidden h-fit">
            <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">Admin</div>
            <Row label="Sequence" value={action.sequence} />
            <Row label="Active" value={action.active ? "✓" : "—"} />
            <Row label="Error Behavior" value={action.errorBehavior} />
          </div>
        </div>
      </div>
    </RulesAppShell>
  );
}
