/**
 * StageDetail — Stage record page.
 *
 * The Status dropdown is the one LIVE control in this whole portal: picking
 * "Complete" and clicking Save calls rulesPortalStore.setStageStatus(),
 * which routes into completeEnrollmentStage() and evaluates the Action
 * Factory rules engine against the current profile. Every other
 * status transition just sets the field with no side effects, per spec.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import RulesAppShell from "../components/RulesAppShell";
import { useToast } from "../components/Toast";
import { SfButton, SfPrimaryButton, SfLink, SfSelect } from "../components/SfPrimitives";
import { useRulesPortalStore, type RulesStageStatus } from "@/store/rulesPortalStore";
import { usePatientStore } from "@/store/patientStore";

const STATUS_OPTIONS: RulesStageStatus[] = ["Initiated", "Pending", "Missing Information", "Complete", "Cancelled"];

export default function StageDetail({ stageId }: { stageId: string }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const cases = useRulesPortalStore((s) => s.cases);
  const setStageStatus = useRulesPortalStore((s) => s.setStageStatus);
  const drugName = usePatientStore((s) => s.drugName);

  const kase = cases.find((c) => c.stages.some((s) => s.id === stageId));
  const stage = kase?.stages.find((s) => s.id === stageId);

  const [activeTab, setActiveTab] = useState<"details" | "related">("details");
  const [draftStatus, setDraftStatus] = useState<RulesStageStatus>(stage?.status ?? "Initiated");
  const [draftSubStatus, setDraftSubStatus] = useState<string>(stage?.subStatus ?? "--None--");

  // Keep the draft in sync with the store — e.g. after Save routes through
  // completeEnrollmentStage(), the store's subStatus is forced to
  // "Enrollment Completed" regardless of what was drafted, so re-sync here
  // rather than trusting local state to already match.
  useEffect(() => {
    if (!stage) return;
    setDraftStatus(stage.status);
    setDraftSubStatus(stage.subStatus ?? "--None--");
  }, [stage?.status, stage?.subStatus]);

  if (!kase || !stage) {
    return (
      <RulesAppShell active="rules">
        <div className="p-8 text-[13px] text-[#706e6b]">
          Stage not found. <SfLink onClick={() => navigate("/rules")}>Back to Rules</SfLink>
        </div>
      </RulesAppShell>
    );
  }

  function handleSave() {
    const subStatus = draftStatus === "Complete" ? "Enrollment Completed" : undefined;
    setStageStatus(kase!.id, stage!.id, draftStatus, subStatus);
    showToast(draftStatus === "Complete" ? "Stage completed — Action Factory rules evaluated" : "Stage saved");
  }
  function handleCancel() {
    setDraftStatus(stage!.status);
    setDraftSubStatus(stage!.subStatus ?? "--None--");
  }

  const subStatusOptions = draftStatus === "Complete" ? ["--None--", "Enrollment Completed"] : ["--None--"];

  return (
    <RulesAppShell active="rules">
      <div className="bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[#dddbda]">
          <div>
            <div className="text-[11px] text-[#706e6b] uppercase tracking-wide">Stage</div>
            <div className="text-[20px] font-bold text-[#3e3e3c]">Enrollment Assistance</div>
          </div>
          <SfButton onClick={() => showToast("Send Document isn't available in this demo")}>Send Document</SfButton>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <div className="flex items-stretch border-b border-[#dddbda] mb-3">
              {(["details", "related"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px capitalize transition-colors ${
                    activeTab === t ? "border-[#0070d2] text-[#0070d2]" : "border-transparent text-[#3e3e3c] hover:bg-[#f3f3f3]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {activeTab === "related" ? (
              <div className="text-[12px] text-[#706e6b] py-8 text-center">Nothing to show here for this demo.</div>
            ) : (
              <div className="border border-[#dddbda] rounded overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Record Type Name</span>
                    <span className="text-[13px] text-[#3e3e3c]">Enrollment Assistance</span>
                    <span className="text-[10.5px] text-[#706e6b] mt-0.5">Calculated on save</span>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Owner</span>
                    <span className="text-[13px] text-[#3e3e3c]">Zackary Baker</span>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Stage Name</span>
                    <span className="text-[13px] text-[#3e3e3c]">{stage.stageName}</span>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Service Type Name</span>
                    <span className="text-[13px] text-[#3e3e3c]">Onboarding</span>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Case</span>
                    <SfLink onClick={() => navigate(`/case/${kase.id}`)}>{kase.caseNumber}</SfLink>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Prescription</span>
                    <input
                      disabled
                      placeholder="Search Prescriptions..."
                      className="text-[13px] border border-[#dddbda] rounded px-2 py-1 bg-[#f3f3f3] text-[#706e6b]"
                    />
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Status</span>
                    <SfSelect
                      value={draftStatus}
                      onChange={(v) => {
                        const next = v as RulesStageStatus;
                        setDraftStatus(next);
                        if (next !== "Complete") setDraftSubStatus("--None--");
                      }}
                      options={STATUS_OPTIONS}
                    />
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Sub-Status</span>
                    <SfSelect value={draftSubStatus} onChange={setDraftSubStatus} options={subStatusOptions} />
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Subject</span>
                    <span className="text-[13px] text-[#3e3e3c]">--None--</span>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Reason</span>
                    <input
                      disabled
                      placeholder="Search Reasons..."
                      className="text-[13px] border border-[#dddbda] rounded px-2 py-1 bg-[#f3f3f3] text-[#706e6b]"
                    />
                  </div>
                  <div className="flex flex-col px-3 py-2 border-b border-[#dddbda]">
                    <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">Product Family</span>
                    <span className="text-[13px] text-[#3e3e3c]">{drugName}</span>
                  </div>
                </div>

                <div className="px-3 py-2 bg-[#f3f3f3] border-y border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">Notes</div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["Prescriber Notes", "Patient Notes", "External Comments", "Internal Comments"].map((label) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="text-[11px] text-[#706e6b] uppercase tracking-wide">{label}</span>
                      <textarea
                        rows={3}
                        className="text-[13px] border border-[#dddbda] rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#0070d2]"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 p-3 border-t border-[#dddbda]">
                  <SfButton onClick={handleCancel}>Cancel</SfButton>
                  <SfPrimaryButton onClick={handleSave}>Save</SfPrimaryButton>
                </div>
              </div>
            )}
          </div>

          {/* Right rail */}
          <div className="lg:col-span-1 flex flex-col gap-5 min-w-0">
            <div className="border border-[#dddbda] rounded overflow-hidden">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Upcoming &amp; Overdue
              </div>
              {kase.tasks.length ? (
                <div>
                  {kase.tasks.map((t) => (
                    <div key={t.id} className="px-3 py-2 border-b border-[#dddbda] last:border-b-0">
                      <div className="text-[12.5px] font-medium text-[#3e3e3c]">{t.subject}</div>
                      <div className="text-[11.5px] text-[#706e6b]">{t.description}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10.5px] text-[#706e6b]">
                        <span>Type: {t.type}</span>
                        <span>Owner: {t.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-[12px] text-[#706e6b]">
                  <p>No activities to show. Get started by sending an email, scheduling a task, and more.</p>
                  <p className="mt-2">No past activity. Past meetings and tasks marked as done show up here.</p>
                </div>
              )}
            </div>

            <div className="border border-[#dddbda] rounded overflow-hidden">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Select Document to Generate
              </div>
              <div className="p-3 flex flex-col gap-2">
                <select disabled className="text-[13px] border border-[#dddbda] rounded px-2 py-1.5 bg-[#f3f3f3] text-[#706e6b]">
                  <option>--None--</option>
                </select>
                <button disabled className="px-3 py-1.5 text-[13px] text-white rounded bg-[#0070d2] opacity-40 cursor-not-allowed">
                  Generate Document
                </button>
              </div>
            </div>

            <div className="border border-[#dddbda] rounded overflow-hidden">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Program Guidance Recommendation
              </div>
              <div className="p-3 flex flex-col gap-2">
                <SfButton onClick={() => showToast("Recalculated")}>Run Calculations</SfButton>
                <div className="text-[12.5px] text-[#3e3e3c] mt-1">Recommended Program(s): {drugName} Enrollment Assistance Pathway</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RulesAppShell>
  );
}
