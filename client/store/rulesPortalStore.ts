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
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  resetRulesPortal: () => void;
}

export const useRulesPortalStore = create<RulesPortalState>()(
  persist(
    (set, get) => ({
      profile: SEED_PROFILE,
      cases: seedCases(),

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

      resetRulesPortal: () => set({ profile: SEED_PROFILE, cases: seedCases() }),
    }),
    {
      name: "arx-rules-portal",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
