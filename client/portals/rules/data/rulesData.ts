/**
 * rulesData — static "Action Factory" rule catalog. The Profile these rules belong to is displayed with the admin-designated program name (see ProfileDetail.tsx), not hardcoded here.
 *
 * This is display/config data (rule definitions, conditions, task-action
 * templates) rather than case-instance data — it never changes at runtime,
 * unlike client/store/rulesPortalStore.ts's profile/case/task state, which
 * IS what the live demo moment reads and mutates. RuleDetail/ActionDetail
 * read these definitions; rulesPortalStore's completeEnrollmentStage()
 * independently hardcodes the WEG-WK-01/02 and WEG-WC-01 condition logic
 * against the live profile (duplicating the two rules' *conditions* here
 * would just be flavor text with no engine behind it — the two are
 * intentionally single-sourced separately: this file for what the UI
 * displays, the store for what actually evaluates).
 *
 * Only WEG-WK-01 and WEG-WC-01 get the full 6/3-condition treatment
 * described in the recording — the rest are seeded with plausible-looking
 * but simpler 2-3 condition / one Create Task action records, per spec
 * ("don't spend much effort there, they just need to not 404").
 */

export interface RuleCondition {
  conditionNumber: string;
  fieldObject: "Source Object" | "Profile";
  fieldApiName: string;
  operator: string;
  comparisonValue: string;
  valueType: string;
}

export interface RuleTaskAction {
  actionName: string;
  taskSubjectTemplate: string;
  taskDescriptionTemplate: string;
  taskType: string;
  taskStatus: string;
  whatIdStrategy: string;
  ownerStrategy: string;
  sequence: number;
  active: boolean;
  errorBehavior: string;
  dispatchMode: string;
}

export interface RuleRecord {
  externalId: string;
  ruleName: string;
  /** Grouping category used by the Rules LIST (all 9 rules key off the
   * Enrollment Assistance stage, so they all bucket under one "Enrollment"
   * group header — matches the recording's "Enrollment (10+)" section). */
  listCategory: "Enrollment";
  /** Rule detail's own Category field — a separate, more granular tag. */
  category: string;
  description: string;
  issue: string;
  sourceObject: string;
  recordType: string;
  /** Condition-chip summary bar — only WK-01/WC-01 show this in the recording. */
  conditionChips?: string[];
  conditions: RuleCondition[];
  taskActions: RuleTaskAction[];
}

export const RULES: RuleRecord[] = [
  {
    externalId: "WEG-FAT-01",
    ruleName: "Field Agent Follow Up — Enrollment Pending",
    listCategory: "Enrollment",
    category: "Enrollment",
    description:
      "Creates a Field Agent follow-up task on Enrollment Assistance stage for Onboarding case when status = Pending, Sub-status = Missing Information",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditions: [
      { conditionNumber: "CON-000070", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Pending", valueType: "Picklist" },
      { conditionNumber: "CON-000071", fieldObject: "Source Object", fieldApiName: "Sub-Status", operator: "Equals", comparisonValue: "Missing Information", valueType: "Picklist" },
      { conditionNumber: "CON-000072", fieldObject: "Source Object", fieldApiName: "Service Type Name", operator: "Equals", comparisonValue: "Onboarding", valueType: "Text" },
    ],
    taskActions: [
      {
        actionName: "FAT-01 Task — Field Follow Up",
        taskSubjectTemplate: "Follow Up: Missing Information",
        taskDescriptionTemplate: "Reach out to the patient regarding missing enrollment information.",
        taskType: "Field Visit",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-FAT-02",
    ruleName: "Field Follow Up — Enrollment Escalation",
    listCategory: "Enrollment",
    category: "Enrollment",
    description:
      "Creates a Field Agent follow-up task on Enrollment Assistance stage for Onboarding case when status = Pending, Sub-status = Escalated",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditions: [
      { conditionNumber: "CON-000073", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Pending", valueType: "Picklist" },
      { conditionNumber: "CON-000074", fieldObject: "Source Object", fieldApiName: "Sub-Status", operator: "Equals", comparisonValue: "Escalated", valueType: "Picklist" },
      { conditionNumber: "CON-000075", fieldObject: "Source Object", fieldApiName: "Service Type Name", operator: "Equals", comparisonValue: "Onboarding", valueType: "Text" },
    ],
    taskActions: [
      {
        actionName: "FAT-02 Task — Escalation Follow Up",
        taskSubjectTemplate: "Follow Up: Enrollment Escalated",
        taskDescriptionTemplate: "Escalate this enrollment case for immediate field follow-up.",
        taskType: "Field Visit",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-WK-01",
    ruleName: "Welcome Kit — Upon Enrollment (Mail)",
    listCategory: "Enrollment",
    category: "Welcome Kit",
    description:
      "Generates a Welcome Kit task (Type: Mail) when Enrollment Assistance stage reaches Status = Complete on Onboarding Case and Profile is configured for sending a Welcome Kit Upon Enrollment with a Distribution Method of Mail",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditionChips: [
      "Status = Complete",
      "Service Type Name = Onboarding",
      "Include Welcome Kit = Yes",
      "Distribution Method = Mail",
      "Hub Does Welcome Kit = Yes",
      "Distribution Timing = Upon Enrollment",
    ],
    conditions: [
      { conditionNumber: "CON-000088", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
      { conditionNumber: "CON-000089", fieldObject: "Source Object", fieldApiName: "Service Type Name", operator: "Equals", comparisonValue: "Onboarding", valueType: "Text" },
      { conditionNumber: "CON-000090", fieldObject: "Profile", fieldApiName: "Include Welcome Kit", operator: "Equals", comparisonValue: "Yes", valueType: "Picklist" },
      { conditionNumber: "CON-000091", fieldObject: "Profile", fieldApiName: "Distribution Method", operator: "Equals", comparisonValue: "Mail", valueType: "Picklist" },
      { conditionNumber: "CON-000092", fieldObject: "Profile", fieldApiName: "Hub Does Welcome Kit", operator: "Equals", comparisonValue: "Yes", valueType: "Picklist" },
      { conditionNumber: "CON-000093", fieldObject: "Profile", fieldApiName: "Distribution Timing", operator: "Equals", comparisonValue: "Upon Enrollment", valueType: "Picklist" },
    ],
    taskActions: [
      {
        actionName: "WK-01 Task — Welcome Kit",
        taskSubjectTemplate: "Send Welcome Kit",
        taskDescriptionTemplate: "Mail the Welcome Kit to the patient upon enrollment completion.",
        taskType: "Mail",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-WK-02",
    ruleName: "Welcome Kit — Upon Enrollment (Email)",
    listCategory: "Enrollment",
    category: "Welcome Kit",
    description:
      "Generates a Welcome Kit task (Type: Email) when Enrollment Assistance stage reaches Status = Complete on Onboarding Case and Profile is configured for sending a Welcome Kit Upon Enrollment with a Distribution Method of Email",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditions: [
      { conditionNumber: "CON-000100", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
      { conditionNumber: "CON-000101", fieldObject: "Source Object", fieldApiName: "Service Type Name", operator: "Equals", comparisonValue: "Onboarding", valueType: "Text" },
      { conditionNumber: "CON-000102", fieldObject: "Profile", fieldApiName: "Distribution Method", operator: "Equals", comparisonValue: "Email", valueType: "Picklist" },
    ],
    taskActions: [
      {
        actionName: "WK-02 Task — Welcome Kit",
        taskSubjectTemplate: "Send Welcome Kit",
        taskDescriptionTemplate: "Email the Welcome Kit to the patient upon enrollment completion.",
        taskType: "Email",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-WK-03",
    ruleName: "Welcome Kit — Upon Enrollment (Ops)",
    listCategory: "Enrollment",
    category: "Welcome Kit",
    description:
      "Generates a Welcome Kit task (Type: Operations Activity) when Enrollment Assistance stage reaches Status = Complete on Onboarding Case",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditions: [
      { conditionNumber: "CON-000103", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
      { conditionNumber: "CON-000104", fieldObject: "Source Object", fieldApiName: "Service Type Name", operator: "Equals", comparisonValue: "Onboarding", valueType: "Text" },
    ],
    taskActions: [
      {
        actionName: "WK-03 Task — Welcome Kit Ops",
        taskSubjectTemplate: "Log Welcome Kit Fulfillment",
        taskDescriptionTemplate: "Create an internal Operations Activity task to fulfill the Welcome Kit.",
        taskType: "Operations Activity",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-WK-04",
    ruleName: "Welcome Kit — After Fill (Mail)",
    listCategory: "Enrollment",
    category: "Welcome Kit",
    description:
      "Generates a Welcome Kit task (Type: Mail) when Enrollment Assistance stage reaches Status = Complete on Onboarding Case and Distribution Timing = Upon Benefits Investigation",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditions: [
      { conditionNumber: "CON-000105", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
      { conditionNumber: "CON-000106", fieldObject: "Profile", fieldApiName: "Distribution Timing", operator: "Equals", comparisonValue: "Upon Benefits Investigation", valueType: "Picklist" },
      { conditionNumber: "CON-000107", fieldObject: "Profile", fieldApiName: "Distribution Method", operator: "Equals", comparisonValue: "Mail", valueType: "Picklist" },
    ],
    taskActions: [
      {
        actionName: "WK-04 Task — Welcome Kit",
        taskSubjectTemplate: "Send Welcome Kit",
        taskDescriptionTemplate: "Mail the Welcome Kit to the patient after benefits investigation completes.",
        taskType: "Mail",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-WK-05",
    ruleName: "Welcome Kit — After Fill (Email)",
    listCategory: "Enrollment",
    category: "Welcome Kit",
    description:
      "Generates a Welcome Kit task (Type: Email) when Enrollment Assistance stage reaches Status = Complete on Onboarding Case and Distribution Timing = Upon Benefits Investigation",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditions: [
      { conditionNumber: "CON-000108", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
      { conditionNumber: "CON-000109", fieldObject: "Profile", fieldApiName: "Distribution Timing", operator: "Equals", comparisonValue: "Upon Benefits Investigation", valueType: "Picklist" },
      { conditionNumber: "CON-000110", fieldObject: "Profile", fieldApiName: "Distribution Method", operator: "Equals", comparisonValue: "Email", valueType: "Picklist" },
    ],
    taskActions: [
      {
        actionName: "WK-05 Task — Welcome Kit",
        taskSubjectTemplate: "Send Welcome Kit",
        taskDescriptionTemplate: "Email the Welcome Kit to the patient after benefits investigation completes.",
        taskType: "Email",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-WK-06",
    ruleName: "Welcome Kit — After Fill (Ops)",
    listCategory: "Enrollment",
    category: "Welcome Kit",
    description:
      "Generates a Welcome Kit task (Type: Operations Activity) when Enrollment Assistance stage reaches Status = Complete on Onboarding Case and Distribution Timing = Upon Benefits Investigation",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditions: [
      { conditionNumber: "CON-000111", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
      { conditionNumber: "CON-000112", fieldObject: "Profile", fieldApiName: "Distribution Timing", operator: "Equals", comparisonValue: "Upon Benefits Investigation", valueType: "Picklist" },
    ],
    taskActions: [
      {
        actionName: "WK-06 Task — Welcome Kit Ops",
        taskSubjectTemplate: "Log Welcome Kit Fulfillment",
        taskDescriptionTemplate: "Create an internal Operations Activity task to fulfill the Welcome Kit after benefits investigation.",
        taskType: "Operations Activity",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Source Owner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
  {
    externalId: "WEG-WC-01",
    ruleName: "Welcome Call — Upon Enrollment",
    listCategory: "Enrollment",
    category: "Welcome Call",
    description:
      "Generates a Welcome Call task owned by the profile's Welcome Call Owner when Enrollment Assistance stage reaches Status = Complete on Onboarding Case and Profile has Include Welcome Call = Yes",
    issue: "None",
    sourceObject: "Stage",
    recordType: "Enrollment Assistance",
    conditionChips: [
      "Status = Complete",
      "Service Type Name = Onboarding",
      "Include Welcome Call = Yes",
    ],
    conditions: [
      { conditionNumber: "CON-000120", fieldObject: "Source Object", fieldApiName: "Status", operator: "Equals", comparisonValue: "Complete", valueType: "Picklist" },
      { conditionNumber: "CON-000121", fieldObject: "Source Object", fieldApiName: "Service Type Name", operator: "Equals", comparisonValue: "Onboarding", valueType: "Text" },
      { conditionNumber: "CON-000122", fieldObject: "Profile", fieldApiName: "Include Welcome Call", operator: "Equals", comparisonValue: "Yes", valueType: "Picklist" },
    ],
    taskActions: [
      {
        actionName: "WC-01 Task — Welcome Call",
        taskSubjectTemplate: "Welcome Call",
        taskDescriptionTemplate: "Place a welcome call to the patient upon enrollment completion.",
        taskType: "Call",
        taskStatus: "Open",
        whatIdStrategy: "Source Record",
        ownerStrategy: "Profile.WelcomeCallOwner",
        sequence: 1,
        active: true,
        errorBehavior: "Skip Action",
        dispatchMode: "Async",
      },
    ],
  },
];
