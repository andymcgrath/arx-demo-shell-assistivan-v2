/**
 * CaseDetail — Onboarding case record page.
 *
 * "Active Stages" ONLY shows stages whose Status is Initiated or Pending —
 * an explicit product decision from the transcript (stages that are
 * Complete/Cancelled drop out of this list). Reactive to
 * rulesPortalStore: completing the stage on StageDetail immediately empties
 * this table and populates "Upcoming & Overdue" with the generated tasks,
 * no manual refresh needed (better than the recording, which needed one).
 */
import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import RulesAppShell from "../components/RulesAppShell";
import { SfButton, SfLink, FieldRow, TwoColumnFields } from "../components/SfPrimitives";
import { useRulesPortalStore } from "@/store/rulesPortalStore";
import { usePatientStore } from "@/store/patientStore";

const CASE_TABS = [
  { id: "details", label: "Details" },
  { id: "related", label: "Related" },
  { id: "faxes", label: "Faxes/Docs" },
  { id: "missing", label: "Missing Info" },
] as const;

export default function CaseDetail({ caseId }: { caseId: string }) {
  const navigate = useNavigate();
  const kase = useRulesPortalStore((s) => s.cases.find((c) => c.id === caseId));
  const addComment = useRulesPortalStore((s) => s.addComment);
  const drugName = usePatientStore((s) => s.drugName);
  const [activeTab, setActiveTab] = useState<(typeof CASE_TABS)[number]["id"]>("details");
  const [commentDraft, setCommentDraft] = useState("");

  if (!kase) {
    return (
      <RulesAppShell active="rules">
        <div className="p-8 text-[13px] text-[#706e6b]">
          Case not found. <SfLink onClick={() => navigate("/rules")}>Back to Rules</SfLink>
        </div>
      </RulesAppShell>
    );
  }

  const activeStages = kase.stages.filter((s) => s.status === "Initiated" || s.status === "Pending");

  function submitComment() {
    if (!commentDraft.trim()) return;
    // Non-null: this function is only ever wired to the "Add Comment"
    // button below, rendered after the `!kase` early return above.
    addComment(kase!.id, commentDraft.trim(), false);
    setCommentDraft("");
  }

  return (
    <RulesAppShell active="rules">
      <div className="bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[#dddbda]">
          <div>
            <div className="text-[11px] text-[#706e6b] uppercase tracking-wide">Case</div>
            <div className="text-[20px] font-bold text-[#3e3e3c]">Onboarding</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-[12px] text-[#3e3e3c]">
              <span>
                <span className="text-[#706e6b]">Status: </span>Open
              </span>
              <span>
                <span className="text-[#706e6b]">Case Number: </span>
                {kase.caseNumber}
              </span>
              <span>
                <span className="text-[#706e6b]">Date/Time Opened: </span>
                {new Date(kase.dateOpened).toLocaleString()}
              </span>
              <span>
                <span className="text-[#706e6b]">Date/Time Closed: </span>—
              </span>
              <span>
                <span className="text-[#706e6b]">Case Origin: </span>
                {kase.caseOrigin}
              </span>
              <span>
                <span className="text-[#706e6b]">Referral Source: </span>
                {kase.referralSource}
              </span>
            </div>
          </div>
          <SfButton>Edit</SfButton>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 min-w-0">
            <div className="border border-[#dddbda] rounded overflow-hidden mb-5 overflow-x-auto">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Active Stages ({activeStages.length})
              </div>
              {activeStages.length ? (
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#dddbda]">
                      <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Stage Name</th>
                      <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Status</th>
                      <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Sub-Status</th>
                      <th className="text-left px-2.5 py-2 text-[11px] text-[#706e6b] font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStages.map((s) => (
                      <tr key={s.id} className="border-b border-[#dddbda] last:border-b-0">
                        <td className="px-2.5 py-2">
                          <SfLink onClick={() => navigate(`/stage/${s.id}`)}>{s.recordType}</SfLink>
                        </td>
                        <td className="px-2.5 py-2 text-[#3e3e3c]">{s.status}</td>
                        <td className="px-2.5 py-2 text-[#3e3e3c]">{s.subStatus ?? "—"}</td>
                        <td className="px-2.5 py-2 text-[#3e3e3c]">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-[12px] text-[#706e6b]">No active stages.</div>
              )}
            </div>

            <div className="border border-[#dddbda] rounded overflow-hidden">
              <div className="flex items-stretch border-b border-[#dddbda] px-1 overflow-x-auto">
                {CASE_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      activeTab === t.id ? "border-[#0070d2] text-[#0070d2]" : "border-transparent text-[#3e3e3c] hover:bg-[#f3f3f3]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="p-3">
                {activeTab === "details" ? (
                  <div className="border border-[#dddbda] rounded overflow-hidden">
                    <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                      Case Summary
                    </div>
                    {/* Left/right split matches the recording: Account Name,
                        Service Type, Status, Referral Source on the left;
                        Case Record Type, Priority, Case Origin, Origin
                        NCPDP Id, Product, FRM Contact on the right. */}
                    <TwoColumnFields
                      left={
                        <>
                          <FieldRow label="Account Name" value={<SfLink>{kase.accountName}</SfLink>} />
                          <FieldRow label="Service Type" value={kase.serviceType} />
                          <FieldRow label="Status" value="Open" />
                          <FieldRow label="Referral Source" value={kase.referralSource} />
                        </>
                      }
                      right={
                        <>
                          <FieldRow label="Case Record Type" value="Patient Solutions" />
                          <FieldRow label="Priority" value="Medium" />
                          <FieldRow label="Case Origin" value={kase.caseOrigin} />
                          <FieldRow label="Origin NCPDP Id" value="—" />
                          <FieldRow label="Product" value={drugName} />
                          <FieldRow label="FRM Contact" value="—" />
                        </>
                      }
                    />
                  </div>
                ) : (
                  <div className="text-[12px] text-[#706e6b] py-8 text-center">Nothing to show here for this demo.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-1 flex flex-col gap-5 min-w-0">
            <div className="border border-[#dddbda] rounded overflow-hidden">
              <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#dddbda] text-[13px] font-semibold text-[#3e3e3c]">
                Case Comments ({kase.comments.length})
              </div>
              <div className="max-h-56 overflow-y-auto">
                {kase.comments.length ? (
                  kase.comments.map((c) => (
                    <div key={c.id} className="px-3 py-2 border-b border-[#dddbda] last:border-b-0">
                      <div className="flex items-center gap-2 text-[11px] text-[#706e6b] mb-0.5">
                        <span className="font-medium text-[#3e3e3c]">{c.user}</span>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                        {!c.isPublic && (
                          <span className="px-1.5 py-0.5 rounded bg-[#f3f3f3] border border-[#dddbda] text-[10px]">Internal</span>
                        )}
                      </div>
                      <div className="text-[12.5px] text-[#3e3e3c]">{c.comment}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-[12px] text-[#706e6b]">No comments yet.</div>
                )}
              </div>
              <div className="p-2 border-t border-[#dddbda] flex flex-col gap-1.5">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full text-[12.5px] border border-[#dddbda] rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#0070d2]"
                  rows={2}
                />
                <SfButton onClick={submitComment}>Add Comment</SfButton>
              </div>
            </div>

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
                        <span>{new Date(t.createdAt).toLocaleString()}</span>
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
                HUB to iAssist Validations
              </div>
              <div className="p-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11.5px] font-medium bg-[#fdecea] text-[#c23934] border border-[#f5c6c0]">
                  ⊘ Documents NOT Sent to iAssist
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RulesAppShell>
  );
}
