/**
 * faxLadders.ts: the event lists behind the presenter's "jump to stage" menu for
 * the Standard workflow (Fax_QS_PA_Approved) and the PAP workflow (Fax_PAP_Audit
 * and PrES_PAP, which share a ladder).
 *
 * DemoShell's resetActorToStage RESETs the actor, then sends these events to land
 * on a stage. Pure (no store, no actor, no React) so the headless tests run the
 * same lists (__tests__/stageLadders.test.ts).
 *
 * BI starts when the patient consents, so no ladder sends RUN_BI. The Standard PA is
 * manual, so its ladder does send SUBMIT_PA (the provider acts after an email).
 *
 * Standard: 2 patient enrolled (BI running), 3 same, 4 BI complete and PA submitted,
 * 5 PA approved, 6 pharmacy picked and filling, 7 shipped, 8 delivered.
 * PAP: 2 patient enrolled (BI running), 3 same, 4 BI back with no insurance and the
 * application update, income verified, 5 address, date and pharmacy,
 * 6 filling, 7 shipped, 8 delivered.
 */
import type { LadderEvent } from "./coassistLadders";

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): LadderEvent => ({ type, portal, ...extra });

const ENROLLED: LadderEvent[] = [
  ev("REFERRAL_RECEIVED", "crm"),
  ev("INVITE", "crm"),
  ev("VERIFY_SMS", "patient"),
  ev("VERIFY_OTP", "patient"),
  ev("CONFIRM_CONSENT", "patient"),
];

const STANDARD_PHARMACY = { name: "Accredo Health Group Inc.", address: "789 Pharma Ave", city: "Tampa", state: "FL", zip: "33602", phone: "(813) 555-5678" };
const PAP_PHARMACY = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

/** Every event to send, in order, to land a RESET actor on `stage` (2 to 8). Stage 1 is the reset itself. */
export function faxStageEvents(workflow: "standard" | "pap", stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  const upTo = (n: number) => stage >= n;

  if (upTo(2)) out.push(...ENROLLED);

  if (workflow === "pap") {
    if (upTo(4)) {
      out.push(
        ev("COMPLETE_BI", "crm", { result: "no_insurance" }),
        ev("SEND_PAP_SMS", "crm"),
        ev("VERIFY_PAP_SMS", "patient"),
        ev("VERIFY_PAP_OTP", "patient"),
        ev("VERIFY_INCOME", "patient"),
      );
    }
    if (upTo(5)) out.push(ev("PATIENT_SETS_ADDRESS", "patient"), ev("PATIENT_SELECTS_SHIP_DATE", "patient"), ev("SELECT_PHARMACY", "crm", { pharmacy: PAP_PHARMACY }));
    if (upTo(6)) out.push(ev("FILL_RX", "crm"));
  } else {
    if (upTo(4)) out.push(ev("COMPLETE_BI", "crm", { result: "coverage_found" }), ev("SUBMIT_PA", "provider"));
    if (upTo(5)) out.push(ev("APPROVE_PA", "crm"));
    if (upTo(6)) out.push(ev("SELECT_PHARMACY", "crm", { pharmacy: STANDARD_PHARMACY }), ev("FILL_RX", "crm"));
  }

  if (upTo(7)) out.push(ev("READY_RX", "field"), ev("SHIP_RX", "crm"));
  if (upTo(8)) out.push(ev("DELIVER_RX", "crm"));
  return out;
}
