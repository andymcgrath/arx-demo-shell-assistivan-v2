/**
 * Representative copay program values for the iAssist HCP views. Demo data, not a live program. The program name
 * comes from the brand file at render time.
 */
import type { WorkflowData } from "@/engine/types";

export const COPAY_ANNUAL_MAX = 15000;
/**
 * A representative member ID for the patient. The demo issues no real card, so it comes from the patient's name: the
 * same patient always gets the same ID, and a different patient gets a different one. Three letters from the program
 * name, then nine digits.
 */
export function copayMemberId(patientName: string, programName: string): string {
  let h = 7;
  for (const ch of patientName.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 1_000_000_007;
  const digits = String(h * 913 % 1_000_000_000).padStart(9, "0");
  const prefix = programName.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "CPY";
  return `${prefix} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export interface CopayTransaction {
  id: string;
  benefitType: "Medical drug";
  /** null while the claim is in review. */
  amount: number | null;
  status: "Approved" | "In review" | "Rejected";
  serviceDate: string;
  denialReason?: string;
}

/** The current calendar-year benefit period, as MM/DD/YYYY - MM/DD/YYYY. */
export function benefitPeriod(now: Date = new Date()): string {
  const y = now.getFullYear();
  return `01/01/${y} - 12/31/${y}`;
}

export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Spend counts approved transactions only. */
export const spendOnCard = (txns: CopayTransaction[]) => txns.filter((t) => t.status === "Approved").reduce((sum, t) => sum + (t.amount ?? 0), 0);

/** MM/DD/YYYY, from an ISO date or a date already in that form. */
const toMmDdYyyy = (v: string) => (v.includes("-") ? [...v.split("-").slice(1), v.split("-")[0]].join("/") : v);

/** One earlier approved claim gives the history something to show. Claims filed in iAssist follow it, in review. */
export function deriveTransactions(d: WorkflowData, now: Date = new Date()): CopayTransaction[] {
  if (!d.copayEnrolled) return [];
  const sample: CopayTransaction = { id: "CLM-0999", benefitType: "Medical drug", amount: 1250, status: "Approved", serviceDate: `01/10/${now.getFullYear()}` };
  const filed = (d.copayClaims ?? []).map((c): CopayTransaction => ({
    id: c.id,
    benefitType: "Medical drug",
    amount: null,
    status: "In review",
    serviceDate: toMmDdYyyy(c.dateOfService),
  }));
  return [sample, ...filed];
}

/** What is left on the card for the benefit period. */
export const copayBalance = (d: WorkflowData): number => COPAY_ANNUAL_MAX - spendOnCard(deriveTransactions(d));
