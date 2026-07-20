/**
 * fieldStore — Field Portal domain data
 *
 * The Field Portal dashboard's 6 KPI cards, the My Tasks tab, and the My
 * Cases tab used to read from three disconnected sources: a 6-row ad hoc
 * array built inline in field/index.tsx (backing the dashboard cards and
 * quick-view modal), and the separate FIELD_TASKS / FIELD_CASES constants
 * in demoStore.ts (backing the two side-nav tabs). Different shapes, no
 * shared fields, no relationship to each other — so clicking different
 * dashboard filters surfaced overlapping slivers of the same tiny list, and
 * "Total HCPs" didn't filter anything at all.
 *
 * This store is the single source of truth for that data instead. One
 * FieldItem shape covers both tasks and cases (kind: "Task" | "Case"), so
 * the dashboard's predicates (priority, dueDate, status, createdAt) mean
 * the same thing everywhere it's read. My HCPs / Total HCPs reads `hcps`,
 * a genuinely separate entity.
 *
 * This data is core to the Field Portal and does NOT vary by FlowType —
 * every workflow (WF1-4) sees the same seeded dataset. Per-workflow state
 * still lives on the XState actor (client/engine/types.ts) and is NOT
 * duplicated here; field/index.tsx merges its two live, actor-driven items
 * ("Missing Information", "PA Submission Required") with getFieldItems()
 * at render time so they stay reactive to whichever workflow is active.
 *
 * Seeded once and persisted to sessionStorage (separate key from
 * demoStore's "arx-demo-shell") so reloading the page, switching tabs, or
 * navigating between portals always shows the same numbers — the seed is
 * hand-authored, not randomized, so "repeatable" doesn't depend on the
 * persistence layer alone, but persisting it means a future feature that
 * *mutates* this data (e.g. marking a task complete) will stick for the
 * rest of the session instead of reverting on next render.
 *
 * Every date in this seed is a relative offset from the real "today"
 * (client/lib/relativeDate.ts), not a literal calendar date — see the
 * comment above seedFieldItems() for how the offsets were derived.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { daysFromToday } from "@/lib/relativeDate";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldItemKind = "Task" | "Case";
export type FieldItemStatus =
  | "Open"
  | "In Progress"
  | "Pending Consent"
  | "Idle"
  | "Closed";
export type FieldItemPriority = "High" | "Medium" | "Low";

export interface FieldItem {
  id: string;
  kind: FieldItemKind;
  refId: string;
  status: FieldItemStatus;
  priority: FieldItemPriority;
  dueDate: string;
  createdAt: string;
  patient: string;
  patientId: string;
  prescriber: string;
  territory: string;
  assignedTo: string;
  subStatus?: string;
  serviceType?: string;
  frmContact?: string;
  description?: string;
  // Task-kind items only. A task either belongs to one of the patient's own
  // cases (relatedCaseId set, stageName labels which milestone within that
  // case — e.g. "Prior Authorization") or is a direct-to-patient-account
  // task with neither field set (mirrors the reference "Related Item"
  // column showing either "PA-25842 (00007014 - Onboarding Case)" or just
  // "TK-495838"). relatedCaseId must reference a FieldItem with the same
  // patientId and kind "Case".
  relatedCaseId?: string;
  stageName?: string;
  // Case-kind items only. When status is "Closed", this is the date the
  // case closed — left unset for anything still open.
  closedAt?: string;
}

export interface FieldSOC {
  id: string;
  facilityName: string;
  npi: string;
  contactName: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

/** Join table: which SOC facility(ies) a patient is assigned to. */
export interface FieldPatientSOCLink {
  id: string;
  patientId: string;
  socId: string;
  isPrimary: boolean;
}

/** Join table: which HCP(s) (from the same roster `hcps` already covers)
 * are affiliated with a patient — lets "HCP (2)" on a patient resolve to
 * real roster records instead of a second, disconnected list of names. */
export interface FieldPatientHCPLink {
  id: string;
  patientId: string;
  hcpId: string;
  role: "Primary" | "Secondary";
}

export interface FieldPrescription {
  id: string;
  patientId: string;
  hcpId: string;
  prescriptionName: string;
  hcpSignature: boolean;
  hcpSignatureDate: string;
}

export interface FieldInsurance {
  id: string;
  patientId: string;
  insuranceName: string;
  rank: string;
  effectiveDate: string;
  insurancePlanType: string;
  groupNumber: string;
  rxGroupNumber: string;
  rxMemberId: string;
  status: string;
}

/** The formal consent record behind a patient's `consentExpiration` /
 * `enrollmentDate` summary fields — those stay as-is for the existing
 * patient card; this is the richer record the Related tab shows. */
export interface FieldPatientAuthorization {
  id: string;
  patientId: string;
  authType: string;
  status: string;
  effectiveDate: string;
  revocationDate: string;
  attestationDate: string;
  receivedDate: string;
}

/**
 * FRM-authored comments on a Task or Case. Kept as its own collection
 * indexed by `itemId` rather than a `comments` array on FieldItem itself,
 * because two of the items comments get added to (Keanu's live tasks) are
 * recomputed fresh every render from the actor and never live in `items` —
 * a flat, itemId-keyed collection works the same way whether the item
 * behind it is persisted or live-computed.
 */
export interface FieldComment {
  id: string;
  itemId: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface FieldSPShipment {
  id: string;
  patientId: string;
  prescriptionId: string;
  carrier: string;
  trackingNumber: string;
  shipDate: string;
  estDelivery: string;
  deliveredDate: string | null;
  status: "Processing" | "In Transit" | "Delivered";
}

export interface FieldHCP {
  id: string;
  physician: string;
  npi: string;
  preferredContact: string;
  officePhone: string;
  officeFax: string;
  officeEmail: string;
  zip: string;
}

/**
 * A case has exactly one patient — "My Cases" and "My Patients" are just two
 * different views of the same underlying relationship, not two unrelated
 * datasets. This record is the single patient profile behind both the "My
 * Patients" table AND the patient detail screen (previously two separate,
 * inconsistent shapes: a disconnected demoStore.ts FIELD_PATIENTS array with
 * its own fake names, and a hardcoded lookup dict inside field/index.tsx
 * keyed by a completely different id scheme). `id` matches FieldItem.patientId
 * so a case can always resolve its one patient, and a patient's cases can
 * always be found by filtering `items` on `patientId`.
 */
export interface FieldPatientRecord {
  id: string;
  name: string;
  dob: string;
  gender: string;
  externalPatientId: string;
  accountStatus: string;
  allergies: string;
  territory: string;
  region: string;
  primaryPrescriber: string;
  primarySOC: string;
  consentExpiration: string;
  enrollmentDate: string;
  homePhone: string;
  mobilePhone: string;
  workPhone: string;
  alternatePhone: string;
  preferredPhone: string;
  email: string;
  preferredMethodOfContact: string;
  bestTimeToContact: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
// Dates are offsets from the real "today" (client/lib/relativeDate.ts), not
// literal strings — so the mix of overdue/urgent/idle items stays exactly the
// same no matter when the demo is actually run. The offset comments below are
// the original literal dates this seed was authored against (anchored to
// Jun 14, 2026 = day 0), kept for readability when tuning the spread.

function seedFieldItems(): FieldItem[] {
  return [
    // ── Urgent Tasks (Task kind, priority High, not Closed) ──────────────────
    { id: "FT-101", kind: "Task", refId: "Prior Auth Follow Up", status: "Open", priority: "High", dueDate: daysFromToday(0), createdAt: daysFromToday(0), patient: "Emiliano Bracco", patientId: "AF-856097", prescriber: "Dr. Thompson", territory: "PA METRO", assignedTo: "Sarah Mitchell", subStatus: "Awaiting Insurance", description: "Follow up with payer on outstanding PA request", relatedCaseId: "FC-206", stageName: "Prior Authorization" },
    { id: "FT-102", kind: "Task", refId: "Appeals Escalation", status: "In Progress", priority: "High", dueDate: daysFromToday(0), createdAt: daysFromToday(-4), patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", subStatus: "Escalated to FRM", description: "Escalate denied PA for second-level appeal", relatedCaseId: "FC-205", stageName: "Appeals" },
    { id: "FT-103", kind: "Task", refId: "Patient Callback Overdue", status: "Open", priority: "High", dueDate: daysFromToday(-1), createdAt: daysFromToday(-2), patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", subStatus: "No Response", description: "Second attempt to reach patient about missing signature" },
    { id: "FT-104", kind: "Task", refId: "Financial Assistance Deadline", status: "Open", priority: "High", dueDate: daysFromToday(2), createdAt: daysFromToday(-5), patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", subStatus: "Application Pending", description: "Submit financial assistance application before window closes", relatedCaseId: "FC-204", stageName: "Financial Assistance" },
    { id: "FT-105", kind: "Task", refId: "Insurance Verification Lapsed", status: "In Progress", priority: "High", dueDate: daysFromToday(1), createdAt: daysFromToday(0), patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", subStatus: "Re-verification Needed", description: "Insurance coverage lapsed mid-therapy, re-verify before next dose", relatedCaseId: "FC-203", stageName: "Benefits Investigation" },
    { id: "FT-106", kind: "Task", refId: "Payer Peer-to-Peer Requested", status: "Open", priority: "High", dueDate: daysFromToday(3), createdAt: daysFromToday(-3), patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", subStatus: "Scheduling", description: "Coordinate peer-to-peer call between prescriber and payer", relatedCaseId: "FC-202", stageName: "Prior Authorization" },

    // ── Additional Task-kind items (mixed priority/status/dates) ─────────────
    { id: "FT-107", kind: "Task", refId: "Refill Reminder Call", status: "Open", priority: "Medium", dueDate: daysFromToday(4), createdAt: daysFromToday(-6), patient: "Emiliano Bracco", patientId: "AF-856097", prescriber: "Dr. Thompson", territory: "PA METRO", assignedTo: "Sarah Mitchell", subStatus: "Scheduled", description: "Routine refill reminder outreach" },
    { id: "FT-108", kind: "Task", refId: "Adherence Check-In", status: "In Progress", priority: "Medium", dueDate: daysFromToday(6), createdAt: daysFromToday(-7), patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", subStatus: "In Progress", description: "Monthly adherence check-in call" },
    { id: "FT-109", kind: "Task", refId: "Consent Renewal Reminder", status: "Pending Consent", priority: "Medium", dueDate: daysFromToday(8), createdAt: daysFromToday(0), patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", subStatus: "Awaiting Signature", description: "Annual consent renewal outstanding", relatedCaseId: "FC-201", stageName: "Enrollment" },
    { id: "FT-110", kind: "Task", refId: "Enrollment Document Request", status: "Pending Consent", priority: "Medium", dueDate: daysFromToday(5), createdAt: daysFromToday(-1), patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", subStatus: "Docs Requested", description: "Request missing enrollment documentation from patient", relatedCaseId: "FC-204", stageName: "Enrollment" },
    { id: "FT-111", kind: "Task", refId: "Territory Handoff Note", status: "Closed", priority: "Low", dueDate: daysFromToday(-4), createdAt: daysFromToday(-9), patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", subStatus: "Complete", description: "Hand off patient file to new territory rep" },
    { id: "FT-112", kind: "Task", refId: "General Status Update", status: "Closed", priority: "Low", dueDate: daysFromToday(-5), createdAt: daysFromToday(-11), patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", subStatus: "Complete", description: "Routine case status note for HUB" },
    { id: "FT-113", kind: "Task", refId: "Copay Card Setup", status: "Open", priority: "Medium", dueDate: daysFromToday(7), createdAt: daysFromToday(-8), patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", subStatus: "Not Started", description: "Set up copay assistance card for patient", relatedCaseId: "FC-205", stageName: "Financial Assistance" },
    { id: "FT-114", kind: "Task", refId: "Delivery Confirmation Call", status: "In Progress", priority: "Low", dueDate: daysFromToday(9), createdAt: daysFromToday(0), patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", subStatus: "Awaiting Carrier", description: "Confirm delivery window with specialty pharmacy" },

    // ── Idle Cases (Case kind, status Idle) ───────────────────────────────────
    { id: "FC-201", kind: "Case", refId: "00001301", status: "Idle", priority: "Medium", dueDate: daysFromToday(11), createdAt: daysFromToday(-17), patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", serviceType: "Adherence Program", frmContact: "---", description: "No activity in 14+ days" },
    { id: "FC-202", kind: "Case", refId: "00001302", status: "Idle", priority: "Low", dueDate: daysFromToday(13), createdAt: daysFromToday(-15), patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", serviceType: "Refill Coordination", frmContact: "---", description: "Awaiting patient response, no activity logged" },
    { id: "FC-203", kind: "Case", refId: "00001303", status: "Idle", priority: "Low", dueDate: daysFromToday(15), createdAt: daysFromToday(-13), patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", serviceType: "Financial Assistance", frmContact: "Jean Claude", description: "Application stalled pending payer response" },

    // ── Additional Case-kind items ─────────────────────────────────────────────
    { id: "FC-204", kind: "Case", refId: "00001304", status: "In Progress", priority: "High", dueDate: daysFromToday(0), createdAt: daysFromToday(0), patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", serviceType: "Prior Auth", frmContact: "---", description: "PA case actively being worked" },
    { id: "FC-205", kind: "Case", refId: "00001305", status: "Pending Consent", priority: "Medium", dueDate: daysFromToday(2), createdAt: daysFromToday(0), patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", serviceType: "Onboarding", frmContact: "---", description: "Onboarding case awaiting patient consent" },
    { id: "FC-206", kind: "Case", refId: "00001306", status: "Open", priority: "Medium", dueDate: daysFromToday(4), createdAt: daysFromToday(-2), patient: "Emiliano Bracco", patientId: "AF-856097", prescriber: "Dr. Thompson", territory: "PA METRO", assignedTo: "Sarah Mitchell", serviceType: "Appeals", frmContact: "Jessica Anderson", description: "First-level appeal case opened" },
    { id: "FC-207", kind: "Case", refId: "00001307", status: "Closed", priority: "Low", dueDate: daysFromToday(-6), createdAt: daysFromToday(-25), patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", serviceType: "Enrollment", frmContact: "Sarah Mitchell", description: "Enrollment case completed", closedAt: daysFromToday(-6) },
    { id: "FC-208", kind: "Case", refId: "00001308", status: "Closed", priority: "Low", dueDate: daysFromToday(-7), createdAt: daysFromToday(-23), patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", serviceType: "Refill Coordination", frmContact: "---", description: "Refill coordinated and closed", closedAt: daysFromToday(-7) },
    { id: "FC-209", kind: "Case", refId: "00001309", status: "Pending Consent", priority: "High", dueDate: daysFromToday(1), createdAt: daysFromToday(-1), patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", serviceType: "Onboarding", frmContact: "---", description: "Urgent onboarding awaiting signed consent" },
  ];
}

function seedFieldHCPs(): FieldHCP[] {
  const names: [string, string][] = [
    ["Dr. Amanda Thompson", "1003002635"],
    ["Dr. Brian Smith", "1234567899"],
    ["Dr. Carla Williams", "1234567897"],
    ["Dr. David Franconi", "1234567898"],
    ["Dr. Elena Johnson", "1003009812"],
    ["Dr. Frank Majkus", "1003004471"],
    ["Dr. Grace Nolan", "1003007723"],
    ["Dr. Henry Patel", "1003001156"],
    ["Dr. Isabel Ruiz", "1003008890"],
    ["Dr. Jason Kim", "1003002298"],
    ["Dr. Karen Lopez", "1003005567"],
    ["Dr. Liam O'Brien", "1003009021"],
    ["Dr. Monica Diaz", "1003003345"],
    ["Dr. Nathan Cole", "1003006678"],
    ["Dr. Olivia Grant", "1003000912"],
    ["Dr. Peter Nguyen", "1003004123"],
    ["Dr. Quinn Baxter", "1003007456"],
    ["Dr. Rachel Stone", "1003002789"],
  ];
  const cities: [string, string, string][] = [
    ["New York", "NY", "10001"], ["Boston", "MA", "02108"], ["Philadelphia", "PA", "19103"],
    ["Newark", "NJ", "07101"], ["Hartford", "CT", "06103"], ["Pittsburgh", "PA", "15222"],
  ];
  return names.map(([physician, npi], idx) => {
    const [city, state, zip] = cities[idx % cities.length];
    return {
      id: `NPI-${String(idx + 1).padStart(3, "0")}`,
      physician,
      npi,
      preferredContact: idx % 2 === 0 ? "Email" : "Phone",
      officePhone: `(${200 + idx}) 555-01${String(idx).padStart(2, "0")}`,
      officeFax: `(${200 + idx}) 555-02${String(idx).padStart(2, "0")}`,
      officeEmail: `${physician.toLowerCase().replace(/[^a-z]+/g, ".")}@medical.com`,
      zip,
    };
  });
}

// One profile per unique patientId referenced by seedFieldItems()'s Case-kind
// entries — a deliberate subset (only the patients who actually have cases),
// not a standalone roster invented independently of the case data.
function seedFieldPatients(): FieldPatientRecord[] {
  return [
    {
      id: "AF-856097", name: "Emiliano Bracco", dob: "Sep 3, 1980", gender: "Male",
      externalPatientId: "000008560", accountStatus: "Active", allergies: "None",
      territory: "PA METRO", region: "Mid-Atlantic", primaryPrescriber: "Dr. Thompson", primarySOC: "Philadelphia SOC",
      consentExpiration: daysFromToday(65), enrollmentDate: daysFromToday(-300),
      homePhone: "2155550101", mobilePhone: "2155550102", workPhone: "", alternatePhone: "2155550103", preferredPhone: "Mobile",
      email: "emiliano.bracco@yopmail.com", preferredMethodOfContact: "Phone", bestTimeToContact: "Morning",
      address: "212 Chestnut St", city: "Philadelphia", state: "Pennsylvania", zip: "19103",
    },
    {
      id: "AF-165218", name: "Marcus Webb", dob: "Feb 11, 1988", gender: "Male",
      externalPatientId: "000016521", accountStatus: "Active", allergies: "Penicillin",
      territory: "NY METRO", region: "Northeast", primaryPrescriber: "Dr. Smith", primarySOC: "NYC SOC",
      consentExpiration: daysFromToday(185), enrollmentDate: daysFromToday(-180),
      homePhone: "2125550201", mobilePhone: "2125550202", workPhone: "2125550203", alternatePhone: "2125550204", preferredPhone: "Mobile",
      email: "marcus.webb@yopmail.com", preferredMethodOfContact: "Email", bestTimeToContact: "Afternoon",
      address: "48 W 27th St", city: "New York", state: "New York", zip: "10001",
    },
    {
      id: "AF-126641", name: "Renee Castillo", dob: "Jul 29, 1975", gender: "Female",
      externalPatientId: "000012664", accountStatus: "Active", allergies: "Sulfa",
      territory: "MA AREA", region: "Northeast", primaryPrescriber: "Dr. Williams", primarySOC: "Boston SOC",
      consentExpiration: daysFromToday(35), enrollmentDate: daysFromToday(-330),
      homePhone: "6175550301", mobilePhone: "6175550302", workPhone: "", alternatePhone: "6175550303", preferredPhone: "Home",
      email: "renee.castillo@yopmail.com", preferredMethodOfContact: "Phone", bestTimeToContact: "Evening",
      address: "77 Tremont St", city: "Boston", state: "Massachusetts", zip: "02108",
    },
    {
      id: "AF-138020", name: "Aaron Feld", dob: "Dec 2, 1992", gender: "Male",
      externalPatientId: "000013802", accountStatus: "Active", allergies: "Latex",
      territory: "NJ AREA", region: "Mid-Atlantic", primaryPrescriber: "Dr. Majkus", primarySOC: "NJ SOC",
      consentExpiration: daysFromToday(95), enrollmentDate: daysFromToday(-270),
      homePhone: "9735550401", mobilePhone: "9735550402", workPhone: "9735550403", alternatePhone: "9735550404", preferredPhone: "Mobile",
      email: "aaron.feld@yopmail.com", preferredMethodOfContact: "Text", bestTimeToContact: "Morning",
      address: "10 Broad St", city: "Newark", state: "New Jersey", zip: "07101",
    },
    {
      id: "AF-145321", name: "Priya Nair", dob: "Apr 18, 1990", gender: "Female",
      externalPatientId: "000014532", accountStatus: "Active", allergies: "Aspirin",
      territory: "CT AREA", region: "Northeast", primaryPrescriber: "Dr. Franconi", primarySOC: "Hartford SOC",
      consentExpiration: daysFromToday(110), enrollmentDate: daysFromToday(-255),
      homePhone: "8605550501", mobilePhone: "8605550502", workPhone: "", alternatePhone: "8605550503", preferredPhone: "Mobile",
      email: "priya.nair@yopmail.com", preferredMethodOfContact: "Email", bestTimeToContact: "Afternoon",
      address: "55 Asylum St", city: "Hartford", state: "Connecticut", zip: "06103",
    },
    {
      id: "AF-152789", name: "Devon Okafor", dob: "Oct 9, 1983", gender: "Male",
      externalPatientId: "000015278", accountStatus: "Active", allergies: "None",
      territory: "NY METRO", region: "Northeast", primaryPrescriber: "Dr. Johnson", primarySOC: "NYC SOC",
      consentExpiration: daysFromToday(150), enrollmentDate: daysFromToday(-215),
      homePhone: "7185550601", mobilePhone: "7185550602", workPhone: "7185550603", alternatePhone: "7185550604", preferredPhone: "Home",
      email: "devon.okafor@yopmail.com", preferredMethodOfContact: "Phone", bestTimeToContact: "Evening",
      address: "89 Court St", city: "New York", state: "New York", zip: "10002",
    },
  ];
}

// One SOC facility per unique `primarySOC` name already used on
// seedFieldPatients() — NYC SOC is shared by Marcus and Devon, matching the
// existing patient records, so the facility roster doesn't invent a second,
// disconnected set of site names.
function seedFieldSOCs(): FieldSOC[] {
  return [
    { id: "SOC-001", facilityName: "Philadelphia SOC", npi: "1699001122", contactName: "Angela Reyes", contactPhone: "(215) 555-3001", address: "500 Market St", city: "Philadelphia", state: "PA", zip: "19106" },
    { id: "SOC-002", facilityName: "NYC SOC", npi: "1699002233", contactName: "Marcus Feld", contactPhone: "(212) 555-3002", address: "220 5th Ave", city: "New York", state: "NY", zip: "10001" },
    { id: "SOC-003", facilityName: "Boston SOC", npi: "1699003344", contactName: "Diane Ortiz", contactPhone: "(617) 555-3003", address: "10 Beacon St", city: "Boston", state: "MA", zip: "02108" },
    { id: "SOC-004", facilityName: "NJ SOC", npi: "1699004455", contactName: "Walter Chu", contactPhone: "(973) 555-3004", address: "45 Broad St", city: "Newark", state: "NJ", zip: "07102" },
    { id: "SOC-005", facilityName: "Hartford SOC", npi: "1699005566", contactName: "Nina Brooks", contactPhone: "(860) 555-3005", address: "1 Constitution Plz", city: "Hartford", state: "CT", zip: "06103" },
  ];
}

function seedPatientSOCLinks(): FieldPatientSOCLink[] {
  return [
    { id: "PSOC-1", patientId: "AF-856097", socId: "SOC-001", isPrimary: true },
    { id: "PSOC-2", patientId: "AF-165218", socId: "SOC-002", isPrimary: true },
    { id: "PSOC-3", patientId: "AF-126641", socId: "SOC-003", isPrimary: true },
    { id: "PSOC-4", patientId: "AF-138020", socId: "SOC-004", isPrimary: true },
    { id: "PSOC-5", patientId: "AF-145321", socId: "SOC-005", isPrimary: true },
    { id: "PSOC-6", patientId: "AF-152789", socId: "SOC-002", isPrimary: true },
  ];
}

// Links each patient to their existing `primaryPrescriber` in the `hcps`
// roster (role "Primary"), plus one covering physician (role "Secondary") —
// this is what makes "HCP (2)" on the Related tab a real filtered lookup
// against the roster instead of a second, disconnected list of names.
function seedPatientHCPLinks(): FieldPatientHCPLink[] {
  return [
    { id: "PHCP-1", patientId: "AF-856097", hcpId: "NPI-001", role: "Primary" },
    { id: "PHCP-2", patientId: "AF-856097", hcpId: "NPI-007", role: "Secondary" },
    { id: "PHCP-3", patientId: "AF-165218", hcpId: "NPI-002", role: "Primary" },
    { id: "PHCP-4", patientId: "AF-165218", hcpId: "NPI-008", role: "Secondary" },
    { id: "PHCP-5", patientId: "AF-126641", hcpId: "NPI-003", role: "Primary" },
    { id: "PHCP-6", patientId: "AF-126641", hcpId: "NPI-009", role: "Secondary" },
    { id: "PHCP-7", patientId: "AF-138020", hcpId: "NPI-006", role: "Primary" },
    { id: "PHCP-8", patientId: "AF-138020", hcpId: "NPI-010", role: "Secondary" },
    { id: "PHCP-9", patientId: "AF-145321", hcpId: "NPI-004", role: "Primary" },
    { id: "PHCP-10", patientId: "AF-145321", hcpId: "NPI-011", role: "Secondary" },
    { id: "PHCP-11", patientId: "AF-152789", hcpId: "NPI-005", role: "Primary" },
    { id: "PHCP-12", patientId: "AF-152789", hcpId: "NPI-012", role: "Secondary" },
  ];
}

function seedFieldPrescriptions(): FieldPrescription[] {
  return [
    { id: "PP-11301", patientId: "AF-856097", hcpId: "NPI-001", prescriptionName: "PP-11301", hcpSignature: true, hcpSignatureDate: daysFromToday(-298) },
    { id: "PP-11302", patientId: "AF-165218", hcpId: "NPI-002", prescriptionName: "PP-11302", hcpSignature: true, hcpSignatureDate: daysFromToday(-178) },
    { id: "PP-11303", patientId: "AF-126641", hcpId: "NPI-003", prescriptionName: "PP-11303", hcpSignature: true, hcpSignatureDate: daysFromToday(-328) },
    { id: "PP-11304", patientId: "AF-138020", hcpId: "NPI-006", prescriptionName: "PP-11304", hcpSignature: true, hcpSignatureDate: daysFromToday(-268) },
    { id: "PP-11305", patientId: "AF-145321", hcpId: "NPI-004", prescriptionName: "PP-11305", hcpSignature: true, hcpSignatureDate: daysFromToday(-253) },
    { id: "PP-11306", patientId: "AF-152789", hcpId: "NPI-005", prescriptionName: "PP-11306", hcpSignature: true, hcpSignatureDate: daysFromToday(-213) },
  ];
}

function seedFieldInsurance(): FieldInsurance[] {
  return [
    { id: "IN-20601", patientId: "AF-856097", insuranceName: "IN-20601", rank: "Primary", effectiveDate: daysFromToday(-300), insurancePlanType: "Commercial", groupNumber: "331201", rxGroupNumber: "RXG-8801", rxMemberId: "MBR-77201", status: "Active" },
    { id: "IN-20602", patientId: "AF-165218", insuranceName: "IN-20602", rank: "Primary", effectiveDate: daysFromToday(-180), insurancePlanType: "Commercial", groupNumber: "331202", rxGroupNumber: "RXG-8802", rxMemberId: "MBR-77202", status: "Active" },
    { id: "IN-20603", patientId: "AF-126641", insuranceName: "IN-20603", rank: "Primary", effectiveDate: daysFromToday(-330), insurancePlanType: "Medicare", groupNumber: "331203", rxGroupNumber: "RXG-8803", rxMemberId: "MBR-77203", status: "Active" },
    { id: "IN-20604", patientId: "AF-138020", insuranceName: "IN-20604", rank: "Primary", effectiveDate: daysFromToday(-270), insurancePlanType: "Commercial", groupNumber: "331204", rxGroupNumber: "RXG-8804", rxMemberId: "MBR-77204", status: "Active" },
    { id: "IN-20605", patientId: "AF-145321", insuranceName: "IN-20605", rank: "Primary", effectiveDate: daysFromToday(-255), insurancePlanType: "Medicaid", groupNumber: "331205", rxGroupNumber: "RXG-8805", rxMemberId: "MBR-77205", status: "Active" },
    { id: "IN-20606", patientId: "AF-152789", insuranceName: "IN-20606", rank: "Primary", effectiveDate: daysFromToday(-215), insurancePlanType: "Commercial", groupNumber: "331206", rxGroupNumber: "RXG-8806", rxMemberId: "MBR-77206", status: "Active" },
  ];
}

// Each patient's formal consent record — effective/received/attestation
// dates track a few days after `enrollmentDate` on their patient record;
// revocationDate sits ~23 months out, same span as the reference example.
function seedFieldAuthorizations(): FieldPatientAuthorization[] {
  return [
    { id: "CF-31501", patientId: "AF-856097", authType: "Electronic", status: "Complete", effectiveDate: daysFromToday(-298), revocationDate: daysFromToday(400), attestationDate: daysFromToday(-298), receivedDate: daysFromToday(-298) },
    { id: "CF-31502", patientId: "AF-165218", authType: "Electronic", status: "Complete", effectiveDate: daysFromToday(-178), revocationDate: daysFromToday(520), attestationDate: daysFromToday(-178), receivedDate: daysFromToday(-178) },
    { id: "CF-31503", patientId: "AF-126641", authType: "Electronic", status: "Complete", effectiveDate: daysFromToday(-328), revocationDate: daysFromToday(370), attestationDate: daysFromToday(-328), receivedDate: daysFromToday(-328) },
    { id: "CF-31504", patientId: "AF-138020", authType: "Electronic", status: "Complete", effectiveDate: daysFromToday(-268), revocationDate: daysFromToday(430), attestationDate: daysFromToday(-268), receivedDate: daysFromToday(-268) },
    { id: "CF-31505", patientId: "AF-145321", authType: "Electronic", status: "Complete", effectiveDate: daysFromToday(-253), revocationDate: daysFromToday(445), attestationDate: daysFromToday(-253), receivedDate: daysFromToday(-253) },
    { id: "CF-31506", patientId: "AF-152789", authType: "Electronic", status: "Complete", effectiveDate: daysFromToday(-213), revocationDate: daysFromToday(485), attestationDate: daysFromToday(-213), receivedDate: daysFromToday(-213) },
  ];
}

// Shipment status loosely tracks each patient's primary case: still-working
// cases (Appeals/Onboarding/Prior Auth/Financial Assistance) have a
// shipment that hasn't gone out yet; idle Adherence/Refill cases already
// received their delivery.
function seedFieldShipments(): FieldSPShipment[] {
  return [
    { id: "SHIP-401", patientId: "AF-856097", prescriptionId: "PP-11301", carrier: "FedEx", trackingNumber: "775801122301", shipDate: daysFromToday(3), estDelivery: daysFromToday(6), deliveredDate: null, status: "Processing" },
    { id: "SHIP-402", patientId: "AF-165218", prescriptionId: "PP-11302", carrier: "UPS", trackingNumber: "775801122302", shipDate: daysFromToday(5), estDelivery: daysFromToday(8), deliveredDate: null, status: "Processing" },
    { id: "SHIP-403", patientId: "AF-126641", prescriptionId: "PP-11303", carrier: "FedEx", trackingNumber: "775801122303", shipDate: daysFromToday(-10), estDelivery: daysFromToday(-7), deliveredDate: daysFromToday(-7), status: "Delivered" },
    { id: "SHIP-404", patientId: "AF-138020", prescriptionId: "PP-11304", carrier: "FedEx", trackingNumber: "775801122304", shipDate: daysFromToday(-1), estDelivery: daysFromToday(2), deliveredDate: null, status: "In Transit" },
    { id: "SHIP-405", patientId: "AF-145321", prescriptionId: "PP-11305", carrier: "UPS", trackingNumber: "775801122305", shipDate: daysFromToday(4), estDelivery: daysFromToday(7), deliveredDate: null, status: "Processing" },
    { id: "SHIP-406", patientId: "AF-152789", prescriptionId: "PP-11306", carrier: "UPS", trackingNumber: "775801122306", shipDate: daysFromToday(-12), estDelivery: daysFromToday(-9), deliveredDate: daysFromToday(-9), status: "Delivered" },
  ];
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface FieldStoreState {
  items: FieldItem[];
  hcps: FieldHCP[];
  patients: FieldPatientRecord[];
  socs: FieldSOC[];
  patientSOCLinks: FieldPatientSOCLink[];
  patientHCPLinks: FieldPatientHCPLink[];
  prescriptions: FieldPrescription[];
  insurance: FieldInsurance[];
  authorizations: FieldPatientAuthorization[];
  shipments: FieldSPShipment[];
  comments: FieldComment[];
  addComment: (itemId: string, text: string) => void;
  resetFieldData: () => void;
}

function seedAll() {
  return {
    items: seedFieldItems(),
    hcps: seedFieldHCPs(),
    patients: seedFieldPatients(),
    socs: seedFieldSOCs(),
    patientSOCLinks: seedPatientSOCLinks(),
    patientHCPLinks: seedPatientHCPLinks(),
    prescriptions: seedFieldPrescriptions(),
    insurance: seedFieldInsurance(),
    authorizations: seedFieldAuthorizations(),
    shipments: seedFieldShipments(),
    // No seeded comments — every row here was added by an FRM through the
    // UI, not part of the hand-authored demo narrative.
    comments: [] as FieldComment[],
  };
}

export const useFieldStore = create<FieldStoreState>()(
  persist(
    (set) => ({
      ...seedAll(),
      addComment: (itemId, text) =>
        set((state) => ({
          comments: [
            ...state.comments,
            {
              id: `CMT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              itemId,
              author: "You",
              text,
              createdAt: daysFromToday(0),
            },
          ],
        })),
      resetFieldData: () => set(seedAll()),
    }),
    {
      name: "arx-field-portal",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
