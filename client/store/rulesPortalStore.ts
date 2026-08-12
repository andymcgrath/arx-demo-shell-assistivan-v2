/**
 * rulesPortalStore — "Rules" portal domain data (Product Configuration /
 * Action Factory demo)
 *
 * Backs the new Salesforce-Lightning-styled "Rules" tab (see
 * client/portals/rules/) that recreates a stakeholder-recorded demo of a
 * NEW Salesforce app: a "Profile" custom object (business rules per
 * drug/product family) plus an "Action Factory" rules engine that reacts to
 * case/stage changes based on those profile settings — no code deploy
 * needed to change behavior.
 *
 * The Profile's IDENTITY (its display name / product family / brand) is
 * intentionally NOT stored here — it's governed by whatever drug/program
 * the presenter has configured via Branding Admin (see
 * client/store/patientStore.ts's `drugName`, sourced from
 * client/portals/patient/config/active-brand.json). The pages in
 * client/portals/rules/ read that value reactively via
 * `usePatientStore((s) => s.drugName)` rather than a fixed "Wegovy" literal,
 * so this store only owns the parts of the Profile that are genuinely this
 * demo's own config surface: the Enrollment Welcome Kit toggles the Action
 * Factory rules engine reads.
 *
 * This store is intentionally independent of demoStore/XState — same as
 * fieldStore.ts, it's a separate self-contained sandbox unrelated to the
 * shared patient-journey workflow machines. Nothing here varies by
 * FlowType. It DOES intentionally reuse the core demo dataset's patient
 * identity (Keanu Dixon / case numbering in patientStore.ts's style) for
 * its two seeded cases, rather than inventing unrelated demo names.
 *
 * The one LIVE interactive moment from the recording: completing the
 * "Enrollment Assistance" stage on a case evaluates two hardcoded rules
 * (WEG-WK-01 "Welcome Kit" and WEG-WC-01 "Welcome Call") against the
 * CURRENT profile settings and creates matching tasks. Per the transcript
 * ("these updates are realized in real time" refers to NEW rule
 * evaluations, not rewriting history), evaluation happens once — at the
 * moment the stage transitions to Complete. Later profile edits do NOT
 * retroactively add or remove tasks on a case whose stage is already
 * Complete; they only change what happens the NEXT time a (different)
 * stage completes. See completeEnrollmentStage() below.
 *
 * Persisted to sessionStorage under its own key ("arx-rules-portal"),
 * separate from every other store's key, so reloading the page or
 * switching tabs keeps whatever the presenter has clicked through.
 *
 * ── Bridge to the real engine (WF5 / iAssist_PAP) ───────────────────────────
 * `appealRuleActive` + `customRules` are the one deliberate exception to this
 * store's total isolation from demoStore/XState (see above): they're a
 * minimal, one-way flag that client/portals/crm/pages/Index.tsx reads to
 * decide whether to auto-dispatch INITIATE_APPEAL on a real WF5 case whose PA
 * has been denied — recreating the "no rule exists to initiate an appeal;
 * build one live" demo moment. Unlike completeEnrollmentStage()'s one-shot,
 * non-retroactive evaluation (which only ever applies to THIS store's own
 * sandbox cases going forward), activating this rule is intentionally
 * evaluated live against whatever the real case's current state is —
 * including a case that's already sitting at PA Denied when the rule gets
 * created. That's the point of the demo: the presenter creates the rule and
 * watches the already-stuck case spring into motion, not a "you'll need to
 * reset and rerun the case" caveat. It still can't double-fire: the engine's
 * appealStatus flips to 'initiated' the first time it runs, and the CRM
 * effect's own guard (appealStatus === 'none') stops re-checking after that.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { RULES, type RuleRecord } from "@/portals/rules/data/rulesData";

// ── Types ─────────────────────────────────────────────────────────────────────

/** The Action-Factory-facing config fields on the Profile record. The
 * Profile's identity (name/brand/product family) lives outside this store —
 * see header comment — so this type only covers the Welcome Kit toggles. */
export interface ProductProfile {
  includeWelcomeKit: "Yes" | "No";
  hubDoesWelcomeKit: "Yes" | "No";
  distributionMethod: "Mail" | "Email";
  distributionTiming: "Upon Enrollment" | "Upon Benefits Investigation" | "Upon Prior Authorization Approval";
  includeWelcomeCall: "Yes" | "No";
  welcomeCallTiming: "Upon Enrollment" | "Upon Benefits Investigation" | "Upon Prior Authorization Approval";
  welcomeCallOwner: "Nurse" | "Field Agent" | "Care Coordinator";
}

export type RulesStageStatus =
  | "Initiated"
  | "Pending"
  | "Complete"
  | "Cancelled"
  | "Missing Information";

export interface RulesCaseStage {
  id: string;
  /** Display id, mirrors the video's auto-generated-looking Salesforce id string. */
  stageName: string;
  recordType: "Enrollment Assistance";
  serviceTypeName: "Onboarding";
  status: RulesStageStatus;
  subStatus?: string;
}

export interface RulesCaseTask {
  id: string;
  subject: string;
  description: string;
  type: string;
  owner: string;
  createdAt: string;
  sourceRuleExternalId: string;
}

export interface RulesCaseComment {
  id: string;
  user: string;
  createdAt: string;
  comment: string;
  isPublic: boolean;
}

export interface RulesCase {
  id: string;
  caseNumber: string;
  accountName: string;
  serviceType: "Onboarding";
  caseOrigin: "Fax";
  referralSource: "HCP";
  dateOpened: string;
  stages: RulesCaseStage[];
  tasks: RulesCaseTask[];
  comments: RulesCaseComment[];
}

// ── Seed ──────────────────────────────────────────────────────────────────────

const SEED_PROFILE: ProductProfile = {
  includeWelcomeKit: "Yes",
  hubDoesWelcomeKit: "Yes",
  distributionMethod: "Mail",
  distributionTiming: "Upon Enrollment",
  includeWelcomeCall: "Yes",
  welcomeCallTiming: "Upon Enrollment",
  welcomeCallOwner: "Nurse",
};

// Two Onboarding cases for the core demo patient (Keanu Dixon — see
// patientStore.ts's PATIENT_SEED), both sitting on a not-yet-completed
// Enrollment Assistance stage — lets the demo be run twice: once with the
// seeded profile (both tasks fire), once after toggling Include Welcome Kit
// to "No" on the profile (only the Welcome Call task fires). The second
// case reuses the same patient with the next case number in the core
// dataset's numbering style (PATIENT_SEED.caseNumber is "00056249") rather
// than inventing an unrelated second demo patient.
function seedCases(): RulesCase[] {
  return [
    {
      id: "case-00056249",
      caseNumber: "00056249",
      accountName: "Keanu Dixon",
      serviceType: "Onboarding",
      caseOrigin: "Fax",
      referralSource: "HCP",
      dateOpened: new Date().toISOString(),
      stages: [
        {
          id: "a1bO300000CmNuf1AF",
          stageName: "a1bO300000CmNuf1AF",
          recordType: "Enrollment Assistance",
          serviceTypeName: "Onboarding",
          status: "Initiated",
        },
      ],
      tasks: [],
      comments: [],
    },
    {
      id: "case-00056250",
      caseNumber: "00056250",
      accountName: "Keanu Dixon",
      serviceType: "Onboarding",
      caseOrigin: "Fax",
      referralSource: "HCP",
      dateOpened: new Date().toISOString(),
      stages: [
        {
          id: "a1bO300000CmNuf2CG",
          stageName: "a1bO300000CmNuf2CG",
          recordType: "Enrollment Assistance",
          serviceTypeName: "Onboarding",
          status: "Initiated",
        },
      ],
      tasks: [],
      comments: [],
    },
  ];
}

// The rule the presenter "builds live" in the Rules portal — same
// condition-chip treatment as WEG-WK-01/WEG-WC-01 in rulesData.ts (the only
// other rules that get it), since this is the other rule this demo actually
// exercises live. Defined here rather than in rulesData.ts because it's
// created at runtime, not part of the static seeded catalog — see the header
// comment above.
const APPEAL_RULE: RuleRecord = {
  externalId: "WEG-PA-01",
  ruleName: "Initiate Appeal — Upon PA Denial",
  listCategory: "Prior Authorization",
  category: "Prior Authorization",
  description:
    "Automatically initiates an appeal when the Prior Authorization stage reaches Status = Complete with a Denied outcome on an Onboarding case.",
  issue: "None",
  sourceObject: "Stage",
  recordType: "Prior Authorization",
  conditionChips: ["Status = Complete", "PA Result = Denied", "Service Type Name = Onboarding"],
  conditions: [
    { conditionNumber: "CON-000200", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
    { conditionNumber: "CON-000201", fieldObject: "Source Object", fieldApiName: "PA Result", operator: "Equals", comparisonValue: "Denied", valueType: "Picklist" },
    { conditionNumber: "CON-000202", fieldObject: "Source Object", fieldApiName: "Service Type Name", operator: "Equals", comparisonValue: "Onboarding", valueType: "Text" },
  ],
  taskActions: [
    {
      actionName: "PA-01 Action — Initiate Appeal",
      taskSubjectTemplate: "Initiate Appeal",
      taskDescriptionTemplate: "File an appeal on the patient's behalf following prior authorization denial.",
      taskType: "Appeal",
      taskStatus: "Open",
      whatIdStrategy: "Source Record",
      ownerStrategy: "Source Owner",
      sequence: 1,
      active: true,
      errorBehavior: "Skip Action",
      dispatchMode: "Async",
    },
  ],
};

// ── Store ─────────────────────────────────────────────────────────────────────

interface RulesPortalState {
  profile: ProductProfile;
  cases: RulesCase[];
  updateProfile: (patch: Partial<ProductProfile>) => void;
  /** The one live demo moment — see header comment. */
  completeEnrollmentStage: (caseId: string, stageId: string) => void;
  /**
   * Generic status setter backing the Stage detail page's Status dropdown.
   * Any transition TO "Complete" routes through completeEnrollmentStage so
   * the rules engine fires; every other transition just sets the field with
   * no side effects (the only wired-up transition for this MVP, per spec).
   */
  setStageStatus: (caseId: string, stageId: string, status: RulesStageStatus, subStatus?: string) => void;
  /** User-typed comments default to isPublic=false — per the transcript,
   * only automated/templated system comments default to public. */
  addComment: (caseId: string, comment: string, isPublic?: boolean) => void;
  /** True once the presenter has created & activated the "Initiate Appeal —
   * Upon PA Denial" rule (see APPEAL_RULE above and the header comment's
   * "Bridge to the real engine" section) — read by crm/pages/Index.tsx. */
  appealRuleActive: boolean;
  /** Rules created live in this portal (currently just APPEAL_RULE, if
   * activated) — merged with the static RULES catalog for display. */
  customRules: RuleRecord[];
  /** Idempotent: calling this again (e.g. a presenter clicking Save twice)
   * does not duplicate the rule in customRules. `ownerStrategy`, when
   * given, overrides APPEAL_RULE's default "Source Owner" task-owner value
   * with whatever the presenter picked on NewRule.tsx's Create Task table
   * (e.g. "Case Owner"/"Queue"), so RuleDetail.tsx's published view reflects
   * the actual selection instead of always showing the hardcoded default. */
  activateAppealRule: (ownerStrategy?: string) => void;
  /**
   * Generic edit path backing RuleDetail.tsx's "Edit Task Action" flow — the
   * same Category/Record Type/Conditions/Task Owner fields NewRule.tsx lets a
   * presenter set when building a rule live are editable again afterward.
   * Works whether `externalId` already has a customRules entry (e.g. the
   * live-built Appeal rule) or still only exists in the static RULES
   * catalog — in the latter case a patched copy is added to customRules,
   * which RuleDetail.tsx's lookup now prefers over the static original so
   * the edit is actually visible. No-ops if externalId matches neither.
   */
  updateCustomRule: (externalId: string, patch: Partial<RuleRecord>) => void;
  /**
   * Un-does activateAppealRule() — clears appealRuleActive and removes just
   * APPEAL_RULE from customRules, leaving profile/cases/every other rule
   * untouched. Exists so DemoShell's WF5 "Reset All" can let a presenter
   * repeat the "no rule exists; build one live" demo moment from scratch
   * without also wiping the separate Enrollment Welcome Kit/Call demo this
   * store otherwise backs (see header comment) — that state has nothing to
   * do with WF5 and a WF5 reset has no business touching it.
   */
  deactivateAppealRule: () => void;
  resetRulesPortal: () => void;
}

export const useRulesPortalStore = create<RulesPortalState>()(
  persist(
    (set, get) => ({
      profile: SEED_PROFILE,
      cases: seedCases(),
      appealRuleActive: false,
      customRules: [],

      updateProfile: (patch) =>
        set((state) => ({ profile: { ...state.profile, ...patch } })),

      completeEnrollmentStage: (caseId, stageId) => {
        const state = get();
        const kase = state.cases.find((c) => c.id === caseId);
        const stage = kase?.stages.find((s) => s.id === stageId);
        if (!kase || !stage) return;
        // One-shot: a stage that's already Complete was already evaluated —
        // re-running this (e.g. after a later profile edit) must NOT
        // retroactively add or remove tasks for it.
        if (stage.status === "Complete") return;

        // Read the profile fresh at call time, not memoized — this is what
        // makes "toggle the profile, then complete the NEXT case's stage"
        // produce a different result without needing any recompute step.
        const profile = state.profile;
        const hasTaskFor = (externalId: string) =>
          kase.tasks.some((t) => t.sourceRuleExternalId === externalId);

        const newTasks: RulesCaseTask[] = [];

        // WEG-WK-01 (Mail) / WEG-WK-02 (Email) — same "Upon Enrollment"
        // Welcome Kit rule; distributionMethod only picks which of the two
        // rules/task flavors fires, not a second independent condition.
        if (
          !hasTaskFor("WEG-WK-01") &&
          !hasTaskFor("WEG-WK-02") &&
          profile.includeWelcomeKit === "Yes" &&
          profile.hubDoesWelcomeKit === "Yes" &&
          profile.distributionTiming === "Upon Enrollment"
        ) {
          const isMail = profile.distributionMethod === "Mail";
          newTasks.push({
            id: `TASK-${Date.now()}-WK`,
            subject: "Send Welcome Kit",
            description: isMail
              ? "Mail the Welcome Kit to the patient upon enrollment completion."
              : "Email the Welcome Kit to the patient upon enrollment completion.",
            type: profile.distributionMethod,
            owner: "Hub Operations",
            createdAt: new Date().toISOString(),
            sourceRuleExternalId: isMail ? "WEG-WK-01" : "WEG-WK-02",
          });
        }

        // WEG-WC-01 (Welcome Call — Upon Enrollment)
        if (
          !hasTaskFor("WEG-WC-01") &&
          profile.includeWelcomeCall === "Yes" &&
          profile.welcomeCallTiming === "Upon Enrollment"
        ) {
          newTasks.push({
            id: `TASK-${Date.now()}-WC`,
            subject: "Welcome Call",
            description: "Place a welcome call to the patient upon enrollment completion.",
            type: "Call",
            owner: profile.welcomeCallOwner,
            createdAt: new Date().toISOString(),
            sourceRuleExternalId: "WEG-WC-01",
          });
        }

        set((s) => ({
          cases: s.cases.map((c) =>
            c.id !== caseId
              ? c
              : {
                  ...c,
                  stages: c.stages.map((st) =>
                    st.id !== stageId
                      ? st
                      : { ...st, status: "Complete" as const, subStatus: "Enrollment Completed" }
                  ),
                  tasks: [...c.tasks, ...newTasks],
                }
          ),
        }));
      },

      setStageStatus: (caseId, stageId, status, subStatus) => {
        if (status === "Complete") {
          get().completeEnrollmentStage(caseId, stageId);
          return;
        }
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id !== caseId
              ? c
              : {
                  ...c,
                  stages: c.stages.map((st) =>
                    st.id !== stageId ? st : { ...st, status, subStatus }
                  ),
                }
          ),
        }));
      },

      addComment: (caseId, comment, isPublic = false) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id !== caseId
              ? c
              : {
                  ...c,
                  comments: [
                    ...c.comments,
                    {
                      id: `CMT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      user: "You",
                      createdAt: new Date().toISOString(),
                      comment,
                      isPublic,
                    },
                  ],
                }
          ),
        })),

      activateAppealRule: (ownerStrategy) =>
        set((s) => {
          if (s.appealRuleActive) return s;
          const rule = ownerStrategy
            ? {
                ...APPEAL_RULE,
                taskActions: [{ ...APPEAL_RULE.taskActions[0], ownerStrategy }],
              }
            : APPEAL_RULE;
          return { appealRuleActive: true, customRules: [...s.customRules, rule] };
        }),

      updateCustomRule: (externalId, patch) =>
        set((s) => {
          const existingIndex = s.customRules.findIndex((r) => r.externalId === externalId);
          if (existingIndex !== -1) {
            const next = [...s.customRules];
            next[existingIndex] = { ...next[existingIndex], ...patch };
            return { customRules: next };
          }
          const base = RULES.find((r) => r.externalId === externalId);
          if (!base) return s;
          return { customRules: [...s.customRules, { ...base, ...patch }] };
        }),

      deactivateAppealRule: () =>
        set((s) => ({
          appealRuleActive: false,
          customRules: s.customRules.filter((r) => r.externalId !== APPEAL_RULE.externalId),
        })),

      resetRulesPortal: () =>
        set({ profile: SEED_PROFILE, cases: seedCases(), appealRuleActive: false, customRules: [] }),
    }),
    {
      name: "arx-rules-portal",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
