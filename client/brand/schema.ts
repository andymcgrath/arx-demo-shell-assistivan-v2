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

export interface BrandConfig {
  /** Folder name under `brands/`. Equals the `BRAND` env value. */
  slug: string;
  /** Human name for the brand. Shown in tooling, never in the demo UI. */
  name: string;
  /** Browser tab title. Written into the HTML at build time. */
  title: string;
  /** Flows this client sees. The first entry is the starting flow. */
  enabledFlows: FlowType[];
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
    assets: BrandAssets;
    colors: BrandColors;
    educationVideo?: { title: string; description: string; thumbnail: string; embedUrl: string };
  };
  chatbotIcon: string;
  favicon?: string;
}
