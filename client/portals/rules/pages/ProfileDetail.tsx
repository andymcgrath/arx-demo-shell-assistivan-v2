/**
 * ProfileDetail -- the Profile custom-object record page.
 *
 * The Profile's IDENTITY (Profile Name / Product Family / Brand / ARX ID
 * Code, and the page title) is governed by the admin-designated program --
 * read reactively from usePatientStore's `drugName`, which is exactly what
 * a presenter sets on the Branding Admin screen (client/portals/patient/
 * pages/Admin.tsx). This page does NOT hardcode a drug name, so switching
 * the active brand there updates this Profile immediately. See
 * rulesPortalStore.ts's header comment for the full rationale.
 *
 * Column layout: General/Team Structure/Enrollment Welcome Kit each render
 * as two INDEPENDENT field lists side by side (left column fully
 * top-to-bottom, then right column) -- confirmed against the recording's
 * actual screens, not a row-by-row interleave. See TwoColumnFields in
 * SfPrimitives.tsx and the exact left/right splits below.
 *
 * Sections are genuinely collapsible now (collapsedSections state) -- they
 * previously always rendered expanded with a no-op toggle.
 *
 * The rest of General/Team Structure is static display data (it doesn't
 * drive anything in this demo). The Enrollment Welcome Kit section IS wired
 * to rulesPortalStore -- those are the fields the Action Factory rules
 * engine actually reads (see rulesPortalStore.completeEnrollmentStage), so
 * they're the only fields behind this page's Edit/Save/Cancel toggle.
 */
import { useState } from "react";
import { Tag } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import RulesAppShell from "../components/RulesAppShell";
import { useToast } from "../components/Toast";
import { useRulesPortalStore, type ProductProfile } from "@/store/rulesPortalStore";
import { usePatientStore } from "@/store/patientStore";
import { SfButton, SfPrimaryButton, FieldRow, TwoColumnFields, SectionHeader, SfSelect } from "../components/SfPrimitives";

/** First 3 letters of the admin-designated program name, uppercased --
 * mirrors the recording's "WEG" ARX ID Code convention for "Wegovy" but
 * derived live instead of hardcoded. */
function deriveArxIdCode(drugName: string): string {
  const letters = drugName.replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 3) || "PGM").toUpperCase();
}

const PROFILE_TABS = [
  { id: "general", label: "General" },
  { id: "intake", label: "Intake" },
  { id: "access", label: "Access" },
  { id: "affordability", label: "Affordability" },
  { id: "events", label: "Events" },
  { id: "actionfactory", label: "Action Factory" },
] as const;

const TIMING_OPTIONS = ["Upon Enrollment", "Upon Benefits Investigation", "Upon Prior Authorization Approval"];

type SectionId = "general" | "team" | "welcomeKit";

export default function ProfileDetail() {
  const navigate = useNavigate();
  const showToast = useToast();
  const profile = useRulesPortalStore((s) => s.profile);
  const updateProfile = useRulesPortalStore((s) => s.updateProfile);
  const drugName = usePatientStore((s) => s.drugName);
  const arxIdCode = deriveArxIdCode(drugName);

  const [activeTab, setActiveTab] = useState<(typeof PROFILE_TABS)[number]["id"]>("general");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProductProfile>(profile);
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    general: false,
    team: false,
    welcomeKit: false,
  });

  function toggleSection(id: SectionId) {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  }

  function startEdit() {
    setDraft(profile);
    setEditing(true);
  }
  function save() {
    updateProfile(draft);
    setEditing(false);
    showToast("Profile saved");
  }
  function cancel() {
    setDraft(profile);
    setEditing(false);
  }

  return (
    <RulesAppShell active="profiles">
      <div className="bg-white">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-[#dddbda]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#eef4ff] flex items-center justify-center shrink-0">
              <Tag size={18} className="text-[#0070d2]" />
            </div>
            <div>
              <div className="text-[11px] text-[#706e6b] uppercase tracking-wide">Profile</div>
              <div className="text-[20px] font-bold text-[#3e3e3c]">{drugName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <SfButton onClick={cancel}>Cancel</SfButton>
                <SfPrimaryButton onClick={save}>Save</SfPrimaryButton>
              </>
            ) : (
              <>
                <SfPrimaryButton onClick={startEdit}>Edit</SfPrimaryButton>
                <SfButton onClick={() => showToast("Clone Program isn't available in this demo")}>Clone Program</SfButton>
                <SfButton onClick={() => showToast("Validation isn't available in this demo")}>Validate This Program</SfButton>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-stretch border-b border-[#dddbda] px-5 overflow-x-auto">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === "actionfactory") {
                  navigate("/rules");
                  return;
                }
                setActiveTab(t.id);
              }}
              className={`px-3 py-2.5 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.id ? "border-[#0070d2] text-[#0070d2]" : "border-transparent text-[#3e3e3c] hover:bg-[#f3f3f3]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 max-w-5xl">
          {activeTab !== "general" ? (
            <div className="text-[13px] text-[#706e6b] py-10 text-center">This tab isn't built out for this demo.</div>
          ) : (
            <div className="border border-[#dddbda] rounded overflow-hidden">
              {/* General -- left: Profile Name -> Access Pathway, right: Quick
                  Start Description -> Brand. Matches the recording exactly
                  (not a row-major interleave of the two columns). */}
              <SectionHeader title="General" collapsed={collapsed.general} onToggle={() => toggleSection("general")} />
              {!collapsed.general && (
                <TwoColumnFields
                  left={
                    <>
                      <FieldRow label="Profile Name" value={drugName} />
                      <FieldRow label="Product Family" value={drugName} />
                      <FieldRow label="Offerings" value="Enrollment;Appeal;Copay;Benefits Investigation;Prior Authorization" />
                      <FieldRow
                        label="Service Types"
                        value="Adherence;Appeals;Copay;Escalation;Onboarding;Orders;Reenrollment;Reimbursement;Replacement;Reverification;Benefits Investigation;Bridge Claims;Documentation Only;Prior Authorization;Product Training;Quick Start"
                      />
                      <FieldRow label="Access Pathway" value="PAP" />
                    </>
                  }
                  right={
                    <>
                      <FieldRow label="Quick Start Description" value="Something here." />
                      <FieldRow label="ARX ID Code" value={arxIdCode} />
                      <FieldRow label="ARX ID Active" value="✓" />
                      <FieldRow label="Brand" value={drugName} />
                    </>
                  }
                />
              )}

              {/* Team Structure -- left: Field Team Exists, Districts Per
                  Region, Rules Of Engagement. right: Number Of Regions, Field
                  Rep Types, Territories Driven By. Also matches the
                  recording's explicit column assignment. */}
              <SectionHeader title="Team Structure" collapsed={collapsed.team} onToggle={() => toggleSection("team")} />
              {!collapsed.team && (
                <TwoColumnFields
                  left={
                    <>
                      <FieldRow label="Field Team Exists" value="Yes" />
                      <FieldRow label="Districts Per Region" value="4" />
                      <FieldRow
                        label="Rules Of Engagement"
                        value="Enrollment Assistance;Prior Authorization Submission;Prior Authorization Status;Appeals Submission;Appeals Status;Copay;PAP"
                      />
                    </>
                  }
                  right={
                    <>
                      <FieldRow label="Number Of Regions" value="4" />
                      <FieldRow label="Field Rep Types" value="12" />
                      <FieldRow label="Territories Driven By" value="Zip" />
                    </>
                  }
                />
              )}

              {/* Enrollment Welcome Kit -- these are the fields the Action
                  Factory rules engine reads (rulesPortalStore.
                  completeEnrollmentStage), so they're the only ones behind
                  Edit/Save. Column split matches the recording. */}
              <SectionHeader
                title="Enrollment Welcome Kit"
                collapsed={collapsed.welcomeKit}
                onToggle={() => toggleSection("welcomeKit")}
                rightContent={<span className="text-[11px] text-[#706e6b] pr-1">drives Action Factory rules</span>}
              />
              {!collapsed.welcomeKit && (
                <TwoColumnFields
                  left={
                    <>
                      <FieldRow label="Include Welcome Kit">
                        {editing ? (
                          <SfSelect
                            value={draft.includeWelcomeKit}
                            onChange={(v) => setDraft((d) => ({ ...d, includeWelcomeKit: v as ProductProfile["includeWelcomeKit"] }))}
                            options={["Yes", "No"]}
                          />
                        ) : (
                          <span>{profile.includeWelcomeKit}</span>
                        )}
                      </FieldRow>
                      <FieldRow label="Distribution Method">
                        {editing ? (
                          <SfSelect
                            value={draft.distributionMethod}
                            onChange={(v) => setDraft((d) => ({ ...d, distributionMethod: v as ProductProfile["distributionMethod"] }))}
                            options={["Mail", "Email"]}
                          />
                        ) : (
                          <span>{profile.distributionMethod}</span>
                        )}
                      </FieldRow>
                      <FieldRow label="Include Welcome Call">
                        {editing ? (
                          <SfSelect
                            value={draft.includeWelcomeCall}
                            onChange={(v) => setDraft((d) => ({ ...d, includeWelcomeCall: v as ProductProfile["includeWelcomeCall"] }))}
                            options={["Yes", "No"]}
                          />
                        ) : (
                          <span>{profile.includeWelcomeCall}</span>
                        )}
                      </FieldRow>
                      <FieldRow label="Welcome Call Timing">
                        {editing ? (
                          <SfSelect
                            value={draft.welcomeCallTiming}
                            onChange={(v) => setDraft((d) => ({ ...d, welcomeCallTiming: v as ProductProfile["welcomeCallTiming"] }))}
                            options={TIMING_OPTIONS}
                          />
                        ) : (
                          <span>{profile.welcomeCallTiming}</span>
                        )}
                      </FieldRow>
                      <FieldRow label="Welcome Call Owner">
                        {editing ? (
                          <SfSelect
                            value={draft.welcomeCallOwner}
                            onChange={(v) => setDraft((d) => ({ ...d, welcomeCallOwner: v as ProductProfile["welcomeCallOwner"] }))}
                            options={["Nurse", "Field Agent", "Care Coordinator"]}
                          />
                        ) : (
                          <span>{profile.welcomeCallOwner}</span>
                        )}
                      </FieldRow>
                    </>
                  }
                  right={
                    <>
                      <FieldRow label="Hub Does Welcome Kit">
                        {editing ? (
                          <SfSelect
                            value={draft.hubDoesWelcomeKit}
                            onChange={(v) => setDraft((d) => ({ ...d, hubDoesWelcomeKit: v as ProductProfile["hubDoesWelcomeKit"] }))}
                            options={["Yes", "No"]}
                          />
                        ) : (
                          <span>{profile.hubDoesWelcomeKit}</span>
                        )}
                      </FieldRow>
                      <FieldRow label="Distribution Timing">
                        {editing ? (
                          <SfSelect
                            value={draft.distributionTiming}
                            onChange={(v) => setDraft((d) => ({ ...d, distributionTiming: v as ProductProfile["distributionTiming"] }))}
                            options={TIMING_OPTIONS}
                          />
                        ) : (
                          <span>{profile.distributionTiming}</span>
                        )}
                      </FieldRow>
                    </>
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>
    </RulesAppShell>
  );
}
