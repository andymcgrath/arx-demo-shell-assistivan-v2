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
    transferPartner?: { name: string; address?: string; city?: string; state?: string; zip?: string; phone?: string };
  };
  chatbotIcon: string;
  favicon?: string;
}
