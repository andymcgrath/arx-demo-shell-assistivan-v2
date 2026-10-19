/**
 * The demo patient's coverage, as the Benefit Investigation Result (BIR) shows it. One source, so the BIR layouts
 * agree with each other and with the Summary of Benefits PDF. All data is representative.
 */
export const PAYER = {
  name: "BlueCross BlueShield of Florida",
  type: "Commercial",
  planType: "Commercial PPO",
  planName: "Blue Options PPO",
  planFunding: "Fully Insured",
  payerId: "00590",
  employer: "Sunrise Logistics Inc.",
  groupNumber: "GRP-88420",
  memberId: "BCB-KR-298341",
  insurancePhone: "(800) 477-3736",
  /** The payer's prior authorization line. Not the patient's phone. */
  paPhone: "(800) 555-0148",
  effectiveDate: "1/1/2026",
} as const;
