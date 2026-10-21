/**
 * Benefits investigation as a component. A source (CoAssist, iAssist) picks the exits it offers from the catalog below.
 * A scenario's story pins one. Every exit sets both benefit statuses and says whether a PA is required (`paRequired`).
 * `biResult` is derived from them, and the PA starts only when the exit requires one.
 *
 * The rules that resolve the fork (`resolveBi`) and submit the PA (`submitPaRule`) are shared. What a source does
 * around them stays in its own spine (CoAssist sends the cash-offer SMS, for example).
 */
import type { FlowType, WorkflowData } from "@/engine/types";
import type { ForkDefinition, ForkExit, Rule } from "@/engine/workflow/types";
import { exitFor } from "@/engine/workflow/forks";

type Status = "covered" | "not_covered";

/**
 * What BI reports. `coverage_found` means a PA is required. `medical_covered` means the medical benefit covers it and
 * no PA is needed. `no_coverage` means neither benefit covers it.
 */
export function deriveBiResult(paRequired: boolean, medicalBenefitStatus: Status, pharmacyBenefitStatus?: Status): string {
  if (paRequired) return "coverage_found";
  if (medicalBenefitStatus === "covered") return "medical_covered";
  return pharmacyBenefitStatus === "covered" ? "coverage_found" : "no_coverage";
}

type CatalogExit = Omit<ForkExit, "id">;

/** Every BI outcome a source can offer. A source lists the ids it supports, in order. The first is the default. */
export const BI_EXITS = {
  pharmacy_covered: {
    label: "Pharmacy Coverage",
    description: "The pharmacy benefit covers it and needs a PA.",
    data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered", paRequired: true },
  },
  pharmacy_transfer: {
    label: "Pharmacy Transfer",
    description:
      "The pharmacy benefit covers it and the PA starts on its own. The patient does not choose a pharmacy. The Rx transfers to an assigned one and the patient sees its contact details.",
    data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered", paRequired: true, pharmacyAssigned: true },
    requires: ["provider_transfer"],
  },
  medical_covered: {
    label: "Medical Coverage",
    description: "The medical benefit covers it. The case transfers to an outside provider.",
    data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered", paRequired: false },
    requires: ["provider_transfer"],
  },
  medical_pa_required: {
    label: "Medical Coverage, PA Required",
    description: "The medical benefit covers it and a PA is required. The Rx transfers to an assigned pharmacy.",
    data: { pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "covered", paRequired: true, pharmacyAssigned: true },
    requires: ["pharmacy_selection:assigned"],
  },
  medical_buy_and_bill: {
    label: "Medical Coverage, Buy and Bill",
    description:
      "The medical benefit covers it and a PA is required. The HCP buys and bills the drug, so no pharmacy is assigned and nothing ships to the patient. Copay is enrolled by the HCP.",
    data: { pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "covered", paRequired: true },
    requires: ["benefit_verification", "copay"],
  },
  no_coverage: {
    label: "No Coverage (Cash)",
    description: "Neither benefit covers it. No PA is submitted.",
    data: { pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered", paRequired: false },
    requires: ["cash_offer"],
  },
} satisfies Record<string, CatalogExit>;

export type BiExitId = keyof typeof BI_EXITS;

/**
 * The `bi` fork for one source. `requires` on an entry replaces the catalog's: no coverage needs `cash_offer` in
 * CoAssist and `financial_assistance` in iAssist.
 */
export function biFork(options: { scenarios: FlowType[]; exits: { id: BiExitId; requires?: string[] }[] }): ForkDefinition {
  return {
    id: "bi",
    label: "Benefits investigation result",
    chooser: "story",
    scenarios: options.scenarios,
    resolved: (d) => d.biStatus === "complete",
    exits: options.exits.map(({ id, requires }) => {
      const base: CatalogExit = BI_EXITS[id];
      const need = requires ?? base.requires;
      return { id, ...base, ...(need ? { requires: need } : {}) };
    }),
  };
}

/**
 * What COMPLETE_BI sets. The `bi` fork's exit decides it. An event that carries the benefit statuses still wins, so a
 * stage jump or a test can force one. Forced statuses use the legacy PA rule: pharmacy covers and medical does not.
 * An assigned pharmacy only applies when a PA runs.
 */
export function resolveBi(fork: ForkDefinition, d: WorkflowData, e: Record<string, any>): Partial<WorkflowData> {
  const chosen = exitFor(fork, d).data;
  const forced = e.pharmacyBenefitStatus !== undefined || e.medicalBenefitStatus !== undefined;
  const pharmacy = (e.pharmacyBenefitStatus ?? chosen.pharmacyBenefitStatus) as Status;
  const medical = (e.medicalBenefitStatus ?? chosen.medicalBenefitStatus) as Status;
  const paRequired = forced ? pharmacy === "covered" && medical !== "covered" : !!chosen.paRequired;
  return {
    biStatus: "complete",
    pharmacyBenefitStatus: pharmacy,
    medicalBenefitStatus: medical,
    paRequired,
    biResult: deriveBiResult(paRequired, medical, pharmacy),
    pharmacyAssigned: paRequired && !!chosen.pharmacyAssigned,
  };
}

/** A PA needs a completed BI whose exit says one is required. COMPLETE_BI sends SUBMIT_PA, and this rule ignores it otherwise. */
export const submitPaRule = <C>(): Rule<any, C> => ({
  id: "spine.submit_pa",
  on: "SUBMIT_PA",
  scope: { fork: "bi" },
  when: (d) => d.biStatus === "complete" && d.paRequired && d.paStatus === "none",
  set: () => ({ paStatus: "submitted", paSubmittedAt: new Date().toISOString() }),
  emit: { portal: "provider", step: 8 },
});
