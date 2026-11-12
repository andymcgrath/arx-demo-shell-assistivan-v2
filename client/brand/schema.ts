import type { FlowType } from "@/engine/types";

export type { BrandColors } from "./theme";
import type { BrandColors } from "./theme";

/**
 * Manufacturer logo pair. `colors` goes on light backgrounds. `white` goes on dark ones.
 * `requiresFilter` is deprecated. It recolors a logo that has no transparent asset.
 * The brand test allows it only for brands on its legacy list. New brands must not set it.
 */
export interface BrandLogo {
  colors: string;
  white: string;
  requiresFilter?: boolean;
}

/**
 * Program images, all local files in `public/brands/<slug>/`.
 * Logos must be real transparent assets. No CSS filter fixes them up.
 */
export interface BrandAssets {
  /**
   * Brand-colored drug logo for light backgrounds. Set `null` (or leave out) when the drug has
   * no logo. The program name then shows as text. A child brand uses `null` to clear a parent's logo.
   */
  logoColor?: string | null;
  /** All-white drug logo for dark backgrounds. Same rules as `logoColor`. */
  logoWhite?: string | null;
  /** Hero image for the welcome and landing screens. */
  hero?: string;
  /** Page or section background image. */
  background?: string;
}

/**
 * A PDF the demo shows in Related Documents and in the document viewers. `file` is a local path in
 * `public/brands/<slug>/docs/`. `fileName` is the name the screens show and the download uses.
 */
export interface BrandDocument {
  file: string;
  fileName: string;
}

/**
 * Per-brand documents. Every key is optional. A brand with no `enrollmentForm` or `summaryOfBenefits`
 * shows the shared defaults. A brand with no `paForm` shows no PA form row (see brand/documents.ts).
 */
export interface BrandDocuments {
  enrollmentForm?: BrandDocument;
  summaryOfBenefits?: BrandDocument;
  paForm?: BrandDocument;
  /** The Letter of Necessity the provider's PA form shows after a simulated upload. Leave out to use the shared sample. */
  letterOfNecessity?: BrandDocument;
}

/**
 * One entry in the demo dropdown: a flow plus the branch to take at each fork. The client picks a
 * story, not a workflow. A demo can only select declared fork exits (see workflows/forks.ts), so a
 * bad edit cannot build an illegal path. The brand test checks every flow and choice.
 */
export interface BrandDemo {
  /** Unique within the brand. Stored in the session to remember the selection. */
  id: string;
  flow: FlowType;
  /** What the dropdown shows. */
  label: string;
  description?: string;
  /** Fork id to exit id, for example `{ "bi": "no_coverage" }`. Omitted forks take the scenario's default. */
  choices?: Record<string, string>;
}

/** The diagnosis a brand's drug treats, with the clinical wording the iAssist forms prefill. */
export interface BrandIndication {
  /** Plain name, for example "Chronic spontaneous urticaria". */
  name: string;
  /** ICD-10-CM code. Representative for the demo: confirm with a coder before real use. */
  icd10: string;
  /** The code's official description. */
  icd10Label: string;
  /** Prefills "Current Treatment Plan" on the PA. */
  currentTreatment: string;
  /** Prefills "Reason for Prescribing" on the PA. `{drug}` becomes the drug display name. */
  rationale: string;
}

/** The copy and lists for the HCP enrollment web page (the `CoA_HCP_Enroll` scenario). Optional. */
export interface BrandHcpSite {
  /** The patient support program's name, for example the hub the HCP enrolls the patient in. */
  programName: string;
  /** The page title on the product page. */
  headline: string;
  /** A line under the headline on the product page. */
  intro: string;
  /** The Support Services page. */
  support: { headline: string; intro: string; roles: { title: string; body: string }[] };
  /** The services the HCP picks from. Only `enabled` ones continue into the form. */
  services: { id: string; title: string; description: string; enabled: boolean }[];
  /** The specialty pharmacies on the Rx step. */
  pharmacies: { name: string; phone: string; fax: string }[];
  /** The diagnosis choices on the clinical step. */
  diagnoses: { code: string; label: string }[];
  /** The drug strengths the HCP can prescribe. */
  strengths: string[];
  /** The line shown after the HCP submits. `{patient}` becomes the patient's first name. */
  submitted: string;
}

export interface BrandConfig {
  /** Folder name under `brands/`. Equals the `BRAND` env value. */
  slug: string;
  /** Human name for the brand. Shown in tooling, never in the demo UI. */
  name: string;
  /** Browser tab title. Written into the HTML at build time. */
  title: string;
  /** The demos this client sees, in dropdown order. The first entry is where a new session starts. */
  demos: BrandDemo[];
  /** Shows the one-off "Client" tab in iAssist workflows. Off unless set to `true`. */
  showClientTab?: boolean;
  manufacturer: {
    name: string;
    /** The company's legal name, for consent text on a client web page. Optional. Falls back to `name`. */
    legalName?: string;
    tagline: string;
    logo: BrandLogo;
    support: { label: string; phone: string };
    legal: { privacyUrl: string; termsUrl: string; safetyUrl: string; prescribingUrl: string };
    /** `{{YEAR}}` is replaced with the current year. */
    copyright: string;
  };
  program: {
    name: string;
    drugDisplayName: string;
    description: string;
    dosageForm: string;
    /** Leave it out when the drug has no logo files. The program name then shows as text. */
    assets?: BrandAssets;
    /** PDFs for Related Documents. Leave out to use the shared defaults. */
    documents?: BrandDocuments;
    colors: BrandColors;
    educationVideo?: { title: string; description: string; thumbnail: string; embedUrl: string };
    /**
     * Where a transfer sends the patient: the pharmacy in the `pharmacy_transfer` branch. Its name and contact details
     * show on the patient's transfer confirmation and in the CRM. Optional. A brand with none uses a placeholder.
     */
    /**
     * What the drug treats. The iAssist diagnosis, the PA form, and the eMedBV summary read it, so every screen shows
     * one diagnosis. Optional. A brand with none leaves the diagnosis for the HCP to pick.
     */
    indication?: BrandIndication;
    /**
     * The clinical questions the provider's PA form asks, in order. Optional. A brand with none gets questions built
     * from its `indication` (see client/brand/paQuestions.ts), or generic ones when it has no indication either.
     * Write each as a yes or no question. The Letter of Necessity question is added by the form, not listed here.
     */
    paQuestions?: string[];
    /** The product's NDC, shown on the PA form's medication row. Optional. A brand with none shows the drug name only. */
    ndc?: string;
    transferPartner?: { name: string; address?: string; city?: string; state?: string; zip?: string; phone?: string };
    /** The strengths the EHR's eRx form offers, in order. The first is selected. Optional. A brand with none shows 0.5, 1.0 and 2.4 mg. */
    dosages?: string[];
    /**
     * The client's own pharmacy. It joins the dispensing pharmacy list in the EHR's eRx form and in the CRM's triage
     * dropdown, so a demo can send the eRx to it and the agent dispatches to it. Optional.
     */
    specialtyPharmacy?: { name: string; address?: string; city?: string; state?: string; zip?: string; phone?: string };
  };
  /** The HCP enrollment web page. Only a brand with an HCP enrollment demo needs it. */
  hcpSite?: BrandHcpSite;
  chatbotIcon: string;
  favicon?: string;
}
