/**
 * Sample Cases — decoy caseload for the CoA_DTP CRM/HUB "My Cases" list.
 *
 * Mirrors a real Salesforce Service Console case list (Case Number, Account
 * Name, Date/Time Opened, Service Type, Case Status, Case Sub-Status, Case
 * Owner Alias, Last Modified Date). This is the WF3 default screen — none of
 * these rows are wired to real state, they're static texture so the list
 * looks like a real caseload. Keanu's own case is added separately, on top
 * of this list, once his eRx is submitted (see CaseListView in
 * crm/pages/Index.tsx).
 *
 * ownerAlias is "rosborne" (Rachel Osborne) on every row, including Keanu's
 * — "My Cases" implies a single case manager's queue, so one consistent
 * owner across the whole list, not a mix of aliases.
 */

export interface SampleCoaCase {
  caseNumber: string;
  accountName: string;
  dateOpened: string;
  serviceType: string;
  caseStatus: string;
  caseSubStatus: string;
  ownerAlias: string;
  lastModified: string;
}

export const SAMPLE_COA_CASES: SampleCoaCase[] = [
  { caseNumber: "00001017", accountName: "Marcus Webb", dateOpened: "5/29/2020 10:12 AM", serviceType: "AJ2 Order/Replacement", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "5/29/2020 10:12 AM" },
  { caseNumber: "00001018", accountName: "Priya Shah", dateOpened: "5/29/2020 10:12 AM", serviceType: "Bridge", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "5/29/2020 10:12 AM" },
  { caseNumber: "00001019", accountName: "Diane Castillo", dateOpened: "5/29/2020 10:12 AM", serviceType: "Quick Start Only", caseStatus: "Pending", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "5/8/2025 10:23 AM" },
  { caseNumber: "00001020", accountName: "Robert Nguyen", dateOpened: "5/29/2020 10:13 AM", serviceType: "Onboarding", caseStatus: "Pending", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "10/7/2025 12:04 PM" },
  { caseNumber: "00001021", accountName: "Teresa Kim", dateOpened: "5/29/2020 10:13 AM", serviceType: "Reimbursement Services", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "5/29/2020 10:13 AM" },
  { caseNumber: "00001022", accountName: "Walter Briggs", dateOpened: "6/9/2020 2:16 PM", serviceType: "Adherence", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "6/9/2020 2:16 PM" },
  { caseNumber: "00001023", accountName: "Nadia Patel", dateOpened: "6/19/2020 1:51 PM", serviceType: "Onboarding", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "5/15/2025 10:27 AM" },
  { caseNumber: "00001024", accountName: "Samuel Ortiz", dateOpened: "7/30/2020 9:15 AM", serviceType: "Onboarding", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "7/30/2020 9:15 AM" },
  { caseNumber: "00001025", accountName: "Grace Lindqvist", dateOpened: "7/30/2020 3:24 PM", serviceType: "Onboarding", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "7/30/2020 3:24 PM" },
  { caseNumber: "00001027", accountName: "Harold Jennings", dateOpened: "8/19/2020 11:52 AM", serviceType: "Onboarding", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "8/19/2020 1:06 PM" },
  { caseNumber: "00001028", accountName: "Michelle Torres", dateOpened: "8/20/2020 3:26 PM", serviceType: "Reverification", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "8/20/2020 3:26 PM" },
  { caseNumber: "00001033", accountName: "Vincent Alvarez", dateOpened: "12/7/2020 9:56 AM", serviceType: "Reverification", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "12/7/2020 9:56 AM" },
  { caseNumber: "00001034", accountName: "Renee Foster", dateOpened: "12/7/2020 2:34 PM", serviceType: "Reimbursement Services", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "12/7/2020 2:34 PM" },
  { caseNumber: "00001036", accountName: "Dennis Whitfield", dateOpened: "12/28/2020 11:49 AM", serviceType: "PSRF Assistance", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "12/28/2020 11:49 AM" },
  { caseNumber: "00001037", accountName: "Angela Marsh", dateOpened: "1/4/2021 3:04 PM", serviceType: "Benefits Investigation Only", caseStatus: "Complete", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "1/26/2021 11:33 AM" },
  { caseNumber: "00001039", accountName: "Curtis Bellamy", dateOpened: "1/8/2021 10:37 AM", serviceType: "Financial Assistance", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "1/8/2021 10:37 AM" },
  { caseNumber: "00001040", accountName: "Sandra Pruitt", dateOpened: "1/22/2021 8:53 AM", serviceType: "Documentation Only", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "1/22/2021 8:53 AM" },
  { caseNumber: "00001044", accountName: "Jonathan Reyes", dateOpened: "4/23/2021 10:44 AM", serviceType: "Onboarding", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "1/15/2026 3:07 PM" },
  { caseNumber: "00001055", accountName: "Patricia Nolan", dateOpened: "11/4/2021 8:28 AM", serviceType: "Onboarding", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "7/9/2024 3:19 PM" },
  { caseNumber: "00001065", accountName: "Kevin Osei", dateOpened: "7/11/2024 12:37 PM", serviceType: "SP Support", caseStatus: "Initiated", caseSubStatus: "Initiated", ownerAlias: "rosborne", lastModified: "7/11/2024 12:37 PM" },
];
