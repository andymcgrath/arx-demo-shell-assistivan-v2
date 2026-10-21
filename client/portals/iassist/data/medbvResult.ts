/**
 * The eMedBV result the demo shows, and the one-line summary the Insurance step displays once it has run.
 * Representative values, not a live payer response.
 */
export const MEDBV_RESULT = {
  product: { code: "J3590", coinsurance: "30%", paRequired: true },
  administration: { code: "CPT 96372", copay: "$75", paRequired: false },
  deductible: [
    { label: "Individual deductible", limit: 5000, met: 4000.15 },
    { label: "Family deductible", limit: 15000, met: 6000.15 },
  ],
  oop: [
    { label: "Individual out-of-pocket max", limit: 10000, met: 2200 },
    { label: "Family out-of-pocket max", limit: 30000, met: 2600 },
  ],
};

export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The story's BI pick says whether the medical benefit covers it. Only `no_coverage` does not. */
export const medbvCovered = (biChoice: string | undefined) => biChoice !== "no_coverage";

export const medbvHeadline = (covered: boolean) =>
  covered ? "eMedBV complete. Buy and bill covered, prior authorization required." : "eMedBV complete. No medical coverage found.";

/** One line: what is covered, what the patient pays, and whether a PA is needed. */
export function medbvSummary(covered = true): string {
  if (!covered) return "The medical benefit does not cover buy and bill for this product. The patient may qualify for the free drug program.";
  const r = MEDBV_RESULT;
  const d = r.deductible[0];
  return `Product ${r.product.code}: ${r.product.coinsurance} coinsurance, PA ${r.product.paRequired ? "required" : "not required"}. Administration ${r.administration.code}: ${r.administration.copay} copay, PA ${r.administration.paRequired ? "required" : "not required"}. Deductible ${money(d.met)} of ${money(d.limit).replace(".00", "")} met.`;
}
