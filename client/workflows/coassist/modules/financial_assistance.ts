/**
 * Financial assistance: Copay enrollment (the `enroll` exit of the `copay` fork). Enrolling only unlocks the reduced price.
 */
import type { CoaRule } from "./shared";
import { COPAY_FORK } from "../forks";

export const FINANCIAL_ASSISTANCE_RULES: CoaRule[] = [
  {
    // Copay: this is the `enroll` exit of the `copay` fork. Enrolling only unlocks the reduced price.
    // The patient still picks Retail or Mail Order next.
    id: "financial_assistance.select_self_pay.copay",
    on: "SELECT_SELF_PAY",
    scope: { fork: "copay" },
    // A patient who arrives from a client web page (`webHandoff`) enrolls while the PA still runs. Copay needs no
    // separate insurance approval, so enrolling does not wait for the PA decision.
    when: (d) => (d.paApprovedOtpVerified || d.webHandoff) && d.pricingOption === null && !d.copayEnrolled,
    set: () => COPAY_FORK.exits.find((e) => e.id === "enroll")!.data,
    emit: { portal: "patient", step: 9 },
  },
];
