/**
 * Who pays, as the benefits investigation (BI) finds it. BI runs before the PA because it decides the payer and
 * whether a PA is needed. ABV and BV are the pharmacy-benefit check. eMedBV is the medical-benefit check.
 * Aliases may repeat across kinds. Within payers they are unique (see `catalog.test.ts`).
 */
export type CatalogPayer = "pharmacy" | "medical" | "none";

export const CATALOG_PAYERS: Record<CatalogPayer, { label: string; aliases: string[] }> = {
  pharmacy: { label: "Pharmacy benefit pays", aliases: ["ABV", "BV", "pharmacy BV", "pharmacy benefit verification"] },
  medical: { label: "Medical benefit pays", aliases: ["eMedBV", "medical BV", "medical benefit verification"] },
  none: { label: "Neither benefit pays", aliases: ["no coverage", "uncovered"] },
};
