/**
 * iassistLadders.ts: the event lists behind the presenter's "jump to stage"
 * menu for the iAssist flows (iAssist_PA_Approved and iAssist_PAP).
 *
 * DemoShell's resetActorToStage RESETs the actor, then sends these events to
 * land on a stage. Pure (no store, no actor, no React) so the headless tests
 * run the same lists (__tests__/stageLadders.test.ts).
 *
 * BI starts when REFERRAL_RECEIVED lands, and a BI that requires a PA submits
 * it, so no ladder sends RUN_BI or SUBMIT_PA (workflows/iassist/rules.ts).
 *
 * iAssist_PA_Approved: 2 referral received (BI running), 3 patient enrolled,
 * 4 BI complete and PA approved, 5 pricing, delivery and payment done and the
 * Rx filling, 6 shipped, 7 delivered.
 * iAssist_Medical_Transfer: 2 referral received, 3 patient enrolled, 4 BI complete and PA approved, 5 patient verified
 * and the Rx transferred to the assigned pharmacy (the terminal stage).
 * iAssist_PAP (appeal): 2 referral received, 3 patient enrolled, 4 BI complete
 * and PA denied, 5 appeal filed, 6 appeal approved, site of care picked and
 * infusion scheduled (the terminal stage).
 */
import { KEANU_SITE_OF_CARE_FACTS } from "@/engine/WorkflowEngine";
import type { LadderEvent } from "./coassistLadders";
import { transferStageEvents } from "./transferLadders";

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): LadderEvent => ({ type, portal, ...extra });

/** The same CoAssist Pharmacy the Benefit Pricing card shows for Copay Program self-pay. */
export type IassistLadderFlow = "iAssist_PA_Approved" | "iAssist_PAP" | "iAssist_Medical_Transfer";

export function iassistStageEvents(flowType: IassistLadderFlow, stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  const upTo = (n: number) => stage >= n;

  if (upTo(2)) out.push(ev("REFERRAL_RECEIVED", "provider"));
  if (upTo(3)) out.push(ev("VERIFY_SMS", "patient"), ev("VERIFY_OTP", "patient"), ev("CONFIRM_CONSENT", "patient"));

  // The transfer scenario shares one ladder with every source that ends in the Triage transfer exit.
  if (flowType === "iAssist_Medical_Transfer") return transferStageEvents(stage);

  if (flowType === "iAssist_PAP") {
    if (upTo(4)) out.push(ev("COMPLETE_BI", "crm", { result: "coverage_found" }), ev("DENY_PA", "crm"));
    if (upTo(5)) out.push(ev("INITIATE_APPEAL", "crm"));
    if (upTo(6)) {
      const infusionDate = new Date();
      infusionDate.setDate(infusionDate.getDate() + 7);
      infusionDate.setHours(9, 0, 0, 0);
      out.push(
        ev("APPROVE_APPEAL", "crm"),
        ev("SELECT_PHARMACY", "crm", {
          pharmacy: {
            name: KEANU_SITE_OF_CARE_FACTS.facilityName,
            address: KEANU_SITE_OF_CARE_FACTS.address,
            city: KEANU_SITE_OF_CARE_FACTS.city,
            state: KEANU_SITE_OF_CARE_FACTS.state,
            zip: KEANU_SITE_OF_CARE_FACTS.zip,
            phone: KEANU_SITE_OF_CARE_FACTS.contactPhone,
          },
        }),
        ev("PATIENT_SELECTS_INFUSION_DATE", "patient", { date: infusionDate.toISOString() }),
      );
    }
    return out;
  }

  if (upTo(4)) out.push(ev("COMPLETE_BI", "crm", { result: "coverage_found" }), ev("APPROVE_PA", "crm"));
  if (upTo(5)) {
    out.push(
      ev("VERIFY_PA_APPROVED_SMS", "patient"),
      ev("VERIFY_PA_APPROVED_OTP", "patient"),
      ev("SELECT_SELF_PAY", "patient"),
      ev("PATIENT_SETS_ADDRESS", "patient"),
      ev("PATIENT_SELECTS_SHIP_DATE", "patient"),
      ev("PATIENT_PAYS", "patient"),
      ev("VERIFY_PAYMENT", "patient"),
      ev("FILL_RX", "crm"),
    );
  }
  if (upTo(6)) out.push(ev("READY_RX", "field"), ev("SHIP_RX", "crm"));
  if (upTo(7)) out.push(ev("DELIVER_RX", "crm"));
  return out;
}
