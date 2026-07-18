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
 * "Today" is hardcoded to Jun 14, 2026 to match field/index.tsx's dashboard
 * (which anchors its own `today` the same way) — every date in this seed is
 * relative to that, not to whenever this code actually runs.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
// Dates read "Jun 14, 2026" to match the existing display format used
// throughout field/index.tsx (toLocaleDateString('en-US', { month: 'short',
// day: 'numeric', year: 'numeric' })).

function seedFieldItems(): FieldItem[] {
  return [
    // ── Urgent Tasks (Task kind, priority High, not Closed) ──────────────────
    { id: "FT-101", kind: "Task", refId: "Prior Auth Follow Up", status: "Open", priority: "High", dueDate: "Jun 14, 2026", createdAt: "Jun 14, 2026", patient: "Emiliano Bracco", patientId: "AF-856097", prescriber: "Dr. Thompson", territory: "PA METRO", assignedTo: "Sarah Mitchell", subStatus: "Awaiting Insurance", description: "Follow up with payer on outstanding PA request" },
    { id: "FT-102", kind: "Task", refId: "Appeals Escalation", status: "In Progress", priority: "High", dueDate: "Jun 14, 2026", createdAt: "Jun 10, 2026", patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", subStatus: "Escalated to FRM", description: "Escalate denied PA for second-level appeal" },
    { id: "FT-103", kind: "Task", refId: "Patient Callback Overdue", status: "Open", priority: "High", dueDate: "Jun 13, 2026", createdAt: "Jun 12, 2026", patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", subStatus: "No Response", description: "Second attempt to reach patient about missing signature" },
    { id: "FT-104", kind: "Task", refId: "Financial Assistance Deadline", status: "Open", priority: "High", dueDate: "Jun 16, 2026", createdAt: "Jun 9, 2026", patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", subStatus: "Application Pending", description: "Submit financial assistance application before window closes" },
    { id: "FT-105", kind: "Task", refId: "Insurance Verification Lapsed", status: "In Progress", priority: "High", dueDate: "Jun 15, 2026", createdAt: "Jun 14, 2026", patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", subStatus: "Re-verification Needed", description: "Insurance coverage lapsed mid-therapy, re-verify before next dose" },
    { id: "FT-106", kind: "Task", refId: "Payer Peer-to-Peer Requested", status: "Open", priority: "High", dueDate: "Jun 17, 2026", createdAt: "Jun 11, 2026", patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", subStatus: "Scheduling", description: "Coordinate peer-to-peer call between prescriber and payer" },

    // ── Additional Task-kind items (mixed priority/status/dates) ─────────────
    { id: "FT-107", kind: "Task", refId: "Refill Reminder Call", status: "Open", priority: "Medium", dueDate: "Jun 18, 2026", createdAt: "Jun 8, 2026", patient: "Emiliano Bracco", patientId: "AF-856097", prescriber: "Dr. Thompson", territory: "PA METRO", assignedTo: "Sarah Mitchell", subStatus: "Scheduled", description: "Routine refill reminder outreach" },
    { id: "FT-108", kind: "Task", refId: "Adherence Check-In", status: "In Progress", priority: "Medium", dueDate: "Jun 20, 2026", createdAt: "Jun 7, 2026", patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", subStatus: "In Progress", description: "Monthly adherence check-in call" },
    { id: "FT-109", kind: "Task", refId: "Consent Renewal Reminder", status: "Pending Consent", priority: "Medium", dueDate: "Jun 22, 2026", createdAt: "Jun 14, 2026", patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", subStatus: "Awaiting Signature", description: "Annual consent renewal outstanding" },
    { id: "FT-110", kind: "Task", refId: "Enrollment Document Request", status: "Pending Consent", priority: "Medium", dueDate: "Jun 19, 2026", createdAt: "Jun 13, 2026", patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", subStatus: "Docs Requested", description: "Request missing enrollment documentation from patient" },
    { id: "FT-111", kind: "Task", refId: "Territory Handoff Note", status: "Closed", priority: "Low", dueDate: "Jun 10, 2026", createdAt: "Jun 5, 2026", patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", subStatus: "Complete", description: "Hand off patient file to new territory rep" },
    { id: "FT-112", kind: "Task", refId: "General Status Update", status: "Closed", priority: "Low", dueDate: "Jun 9, 2026", createdAt: "Jun 3, 2026", patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", subStatus: "Complete", description: "Routine case status note for HUB" },
    { id: "FT-113", kind: "Task", refId: "Copay Card Setup", status: "Open", priority: "Medium", dueDate: "Jun 21, 2026", createdAt: "Jun 6, 2026", patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", subStatus: "Not Started", description: "Set up copay assistance card for patient" },
    { id: "FT-114", kind: "Task", refId: "Delivery Confirmation Call", status: "In Progress", priority: "Low", dueDate: "Jun 23, 2026", createdAt: "Jun 14, 2026", patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", subStatus: "Awaiting Carrier", description: "Confirm delivery window with specialty pharmacy" },

    // ── Idle Cases (Case kind, status Idle) ───────────────────────────────────
    { id: "FC-201", kind: "Case", refId: "00001301", status: "Idle", priority: "Medium", dueDate: "Jun 25, 2026", createdAt: "May 28, 2026", patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", serviceType: "Adherence Program", frmContact: "---", description: "No activity in 14+ days" },
    { id: "FC-202", kind: "Case", refId: "00001302", status: "Idle", priority: "Low", dueDate: "Jun 27, 2026", createdAt: "May 30, 2026", patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", serviceType: "Refill Coordination", frmContact: "---", description: "Awaiting patient response, no activity logged" },
    { id: "FC-203", kind: "Case", refId: "00001303", status: "Idle", priority: "Low", dueDate: "Jun 29, 2026", createdAt: "Jun 1, 2026", patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", serviceType: "Financial Assistance", frmContact: "Jean Claude", description: "Application stalled pending payer response" },

    // ── Additional Case-kind items ─────────────────────────────────────────────
    { id: "FC-204", kind: "Case", refId: "00001304", status: "In Progress", priority: "High", dueDate: "Jun 14, 2026", createdAt: "Jun 14, 2026", patient: "Aaron Feld", patientId: "AF-138020", prescriber: "Dr. Majkus", territory: "NJ AREA", assignedTo: "Jessica Anderson", serviceType: "Prior Auth", frmContact: "---", description: "PA case actively being worked" },
    { id: "FC-205", kind: "Case", refId: "00001305", status: "Pending Consent", priority: "Medium", dueDate: "Jun 16, 2026", createdAt: "Jun 14, 2026", patient: "Marcus Webb", patientId: "AF-165218", prescriber: "Dr. Smith", territory: "NY METRO", assignedTo: "James Chen", serviceType: "Onboarding", frmContact: "---", description: "Onboarding case awaiting patient consent" },
    { id: "FC-206", kind: "Case", refId: "00001306", status: "Open", priority: "Medium", dueDate: "Jun 18, 2026", createdAt: "Jun 12, 2026", patient: "Emiliano Bracco", patientId: "AF-856097", prescriber: "Dr. Thompson", territory: "PA METRO", assignedTo: "Sarah Mitchell", serviceType: "Appeals", frmContact: "Jessica Anderson", description: "First-level appeal case opened" },
    { id: "FC-207", kind: "Case", refId: "00001307", status: "Closed", priority: "Low", dueDate: "Jun 8, 2026", createdAt: "May 20, 2026", patient: "Renee Castillo", patientId: "AF-126641", prescriber: "Dr. Williams", territory: "MA AREA", assignedTo: "Maria Rodriguez", serviceType: "Enrollment", frmContact: "Sarah Mitchell", description: "Enrollment case completed" },
    { id: "FC-208", kind: "Case", refId: "00001308", status: "Closed", priority: "Low", dueDate: "Jun 7, 2026", createdAt: "May 22, 2026", patient: "Devon Okafor", patientId: "AF-152789", prescriber: "Dr. Johnson", territory: "NY METRO", assignedTo: "David Martinez", serviceType: "Refill Coordination", frmContact: "---", description: "Refill coordinated and closed" },
    { id: "FC-209", kind: "Case", refId: "00001309", status: "Pending Consent", priority: "High", dueDate: "Jun 15, 2026", createdAt: "Jun 13, 2026", patient: "Priya Nair", patientId: "AF-145321", prescriber: "Dr. Franconi", territory: "CT AREA", assignedTo: "Robert Thompson", serviceType: "Onboarding", frmContact: "---", description: "Urgent onboarding awaiting signed consent" },
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
      consentExpiration: "Sep 5, 2026", enrollmentDate: "Sep 5, 2025",
      homePhone: "2155550101", mobilePhone: "2155550102", workPhone: "", alternatePhone: "2155550103", preferredPhone: "Mobile",
      email: "emiliano.bracco@yopmail.com", preferredMethodOfContact: "Phone", bestTimeToContact: "Morning",
      address: "212 Chestnut St", city: "Philadelphia", state: "Pennsylvania", zip: "19103",
    },
    {
      id: "AF-165218", name: "Marcus Webb", dob: "Feb 11, 1988", gender: "Male",
      externalPatientId: "000016521", accountStatus: "Active", allergies: "Penicillin",
      territory: "NY METRO", region: "Northeast", primaryPrescriber: "Dr. Smith", primarySOC: "NYC SOC",
      consentExpiration: "Jan 13, 2027", enrollmentDate: "Jan 13, 2026",
      homePhone: "2125550201", mobilePhone: "2125550202", workPhone: "2125550203", alternatePhone: "2125550204", preferredPhone: "Mobile",
      email: "marcus.webb@yopmail.com", preferredMethodOfContact: "Email", bestTimeToContact: "Afternoon",
      address: "48 W 27th St", city: "New York", state: "New York", zip: "10001",
    },
    {
      id: "AF-126641", name: "Renee Castillo", dob: "Jul 29, 1975", gender: "Female",
      externalPatientId: "000012664", accountStatus: "Active", allergies: "Sulfa",
      territory: "MA AREA", region: "Northeast", primaryPrescriber: "Dr. Williams", primarySOC: "Boston SOC",
      consentExpiration: "Aug 15, 2026", enrollmentDate: "Aug 15, 2025",
      homePhone: "6175550301", mobilePhone: "6175550302", workPhone: "", alternatePhone: "6175550303", preferredPhone: "Home",
      email: "renee.castillo@yopmail.com", preferredMethodOfContact: "Phone", bestTimeToContact: "Evening",
      address: "77 Tremont St", city: "Boston", state: "Massachusetts", zip: "02108",
    },
    {
      id: "AF-138020", name: "Aaron Feld", dob: "Dec 2, 1992", gender: "Male",
      externalPatientId: "000013802", accountStatus: "Active", allergies: "Latex",
      territory: "NJ AREA", region: "Mid-Atlantic", primaryPrescriber: "Dr. Majkus", primarySOC: "NJ SOC",
      consentExpiration: "Oct 20, 2026", enrollmentDate: "Oct 20, 2025",
      homePhone: "9735550401", mobilePhone: "9735550402", workPhone: "9735550403", alternatePhone: "9735550404", preferredPhone: "Mobile",
      email: "aaron.feld@yopmail.com", preferredMethodOfContact: "Text", bestTimeToContact: "Morning",
      address: "10 Broad St", city: "Newark", state: "New Jersey", zip: "07101",
    },
    {
      id: "AF-145321", name: "Priya Nair", dob: "Apr 18, 1990", gender: "Female",
      externalPatientId: "000014532", accountStatus: "Active", allergies: "Aspirin",
      territory: "CT AREA", region: "Northeast", primaryPrescriber: "Dr. Franconi", primarySOC: "Hartford SOC",
      consentExpiration: "Nov 5, 2026", enrollmentDate: "Nov 5, 2025",
      homePhone: "8605550501", mobilePhone: "8605550502", workPhone: "", alternatePhone: "8605550503", preferredPhone: "Mobile",
      email: "priya.nair@yopmail.com", preferredMethodOfContact: "Email", bestTimeToContact: "Afternoon",
      address: "55 Asylum St", city: "Hartford", state: "Connecticut", zip: "06103",
    },
    {
      id: "AF-152789", name: "Devon Okafor", dob: "Oct 9, 1983", gender: "Male",
      externalPatientId: "000015278", accountStatus: "Active", allergies: "None",
      territory: "NY METRO", region: "Northeast", primaryPrescriber: "Dr. Johnson", primarySOC: "NYC SOC",
      consentExpiration: "Dec 18, 2026", enrollmentDate: "Dec 18, 2025",
      homePhone: "7185550601", mobilePhone: "7185550602", workPhone: "7185550603", alternatePhone: "7185550604", preferredPhone: "Home",
      email: "devon.okafor@yopmail.com", preferredMethodOfContact: "Phone", bestTimeToContact: "Evening",
      address: "89 Court St", city: "New York", state: "New York", zip: "10002",
    },
  ];
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface FieldStoreState {
  items: FieldItem[];
  hcps: FieldHCP[];
  patients: FieldPatientRecord[];
  resetFieldData: () => void;
}

export const useFieldStore = create<FieldStoreState>()(
  persist(
    (set) => ({
      items: seedFieldItems(),
      hcps: seedFieldHCPs(),
      patients: seedFieldPatients(),
      resetFieldData: () =>
        set({ items: seedFieldItems(), hcps: seedFieldHCPs(), patients: seedFieldPatients() }),
    }),
    {
      name: "arx-field-portal",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
