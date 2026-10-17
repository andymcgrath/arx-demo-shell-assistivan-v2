/**
 * coassistLadders.ts: the event lists behind the presenter's "jump to stage"
 * menu for the CoAssist flows (CoA_DTP, CoA_Copay, CoA_DME).
 *
 * DemoShell's resetActorToStage RESETs the actor, then sends these events to
 * land on a stage. This module is pure (no store, no actor, no React) so the
 * same lists run in the headless tests (__tests__/stageLadders.test.ts). A
 * test that mirrored a copy of this code is how the DME "stage 7 never
 * advances" bug stayed hidden: it sent SHIP_RX without READY_RX.
 *
 * Stages: 2 enrolled and verified, 3 BI running, 4 BI complete (and for
 * DTP/Copay, PA approved and re-verified), 5 pricing and delivery chosen,
 * 6 filling, 7 shipped, 8 delivered.
 *
 * DTP and Copay: pricing defaults to Retail, a quick jump rather than a
 * scenario picker. CoA_DME takes pharmacyBenefitStatus and
 * medicalBenefitStatus on COMPLETE_BI. Stage 4 defaults to Scenario 1
 * (pharmacy covered). Index.tsx's BIR-0431 toggle buttons are the real way
 * to switch DME scenarios; they share dmeBiCompleteEvents() below so the two
 * cannot drift. Scenario 1 has no address or date step, so stage 5 ends at
 * the pharmacy pick and stage 6 goes straight to FILL_RX.
 */

export interface DmeBiScenario {
  pharmacyBenefitStatus: "covered" | "not_covered";
  medicalBenefitStatus: "covered" | "not_covered";
}

/** Scenario 1: Pharmacy Coverage. The default for every CoA_DME entry point into the replay. */
export const DME_SCENARIO_1_PHARMACY_COVERAGE: DmeBiScenario = {
  pharmacyBenefitStatus: "covered",
  medicalBenefitStatus: "not_covered",
};

export const DME_SCENARIO_2_COVERED_BY_BOTH: DmeBiScenario = {
  pharmacyBenefitStatus: "covered",
  medicalBenefitStatus: "covered",
};

export const DME_SCENARIO_3_NO_COVERAGE: DmeBiScenario = {
  pharmacyBenefitStatus: "not_covered",
  medicalBenefitStatus: "not_covered",
};

export interface LadderEvent {
  type: string;
  portal: string;
  [key: string]: unknown;
}

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): LadderEvent => ({ type, portal, ...extra });

const IDENTITY: LadderEvent[] = [
  ev("ENROLL", "crm"),
  ev("VERIFY_SMS", "patient"),
  ev("VERIFY_OTP", "patient"),
  ev("CONFIRM_CONSENT", "patient"),
];

const DME_DEFAULT_PHARMACY = { name: "CVS Pharmacy #3795", address: "210 N Orange Ave", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-0142" };

/** ENROLL through COMPLETE_BI for a DME scenario, on an already-RESET actor. */
export function dmeBiCompleteEvents(scenario: DmeBiScenario = DME_SCENARIO_1_PHARMACY_COVERAGE): LadderEvent[] {
  return [...IDENTITY, ev("RUN_BI", "crm"), dmeCompleteBi(scenario)];
}

function dmeCompleteBi(scenario: DmeBiScenario): LadderEvent {
  return ev("COMPLETE_BI", "crm", {
    pharmacyBenefitStatus: scenario.pharmacyBenefitStatus,
    medicalBenefitStatus: scenario.medicalBenefitStatus,
  });
}

/** Every event to send, in order, to land a RESET actor on `stage` (2 to 8). Stage 1 is the reset itself. */
export function coassistStageEvents(flowType: "CoA_DTP" | "CoA_Copay" | "CoA_DME", stage: number): LadderEvent[] {
  const out: LadderEvent[] = [];
  const upTo = (n: number) => stage >= n;

  if (upTo(2)) out.push(...IDENTITY);
  if (upTo(3)) out.push(ev("RUN_BI", "crm"));

  if (flowType === "CoA_DME") {
    if (upTo(4)) out.push(dmeCompleteBi(DME_SCENARIO_1_PHARMACY_COVERAGE));
    if (upTo(5)) {
      out.push(
        ev("SUBMIT_PA", "crm"),
        ev("APPROVE_PA", "crm"),
        ev("VERIFY_PA_APPROVED_SMS", "patient"),
        ev("VERIFY_PA_APPROVED_OTP", "patient"),
        ev("SELECT_PHARMACY", "patient", { pharmacy: DME_DEFAULT_PHARMACY }),
      );
    }
  } else {
    if (upTo(4)) {
      out.push(
        ev("COMPLETE_BI", "crm", { result: "coverage_found" }),
        ev("SUBMIT_PA", "provider"),
        ev("APPROVE_PA", "crm"),
        ev("VERIFY_PA_APPROVED_SMS", "patient"),
        ev("VERIFY_PA_APPROVED_OTP", "patient"),
      );
    }
    if (upTo(5)) {
      out.push(
        ev("SELECT_PRICING_OPTION", "patient", { option: "retail" }),
        ev("PATIENT_SETS_ADDRESS", "patient"),
        ev("PATIENT_SELECTS_SHIP_DATE", "patient"),
      );
    }
  }

  if (upTo(6)) out.push(ev("FILL_RX", "crm"));
  if (upTo(7)) out.push(ev("READY_RX", "field"), ev("SHIP_RX", "crm"));
  if (upTo(8)) out.push(ev("DELIVER_RX", "crm"));
  return out;
}
