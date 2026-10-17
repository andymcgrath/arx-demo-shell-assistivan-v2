import type { FlowType } from "@/engine/types";

/** Logo pair. `colors` goes on light backgrounds. `white` goes on dark ones. */
export interface BrandLogo {
  colors: string;
  white: string;
  requiresFilter?: boolean;
}

export interface BrandConfig {
  /** Folder name under `brands/`. Equals the `BRAND` env value. */
  slug: string;
  /** Human name for the brand. Shown in tooling, never in the demo UI. */
  name: string;
  /** Flows this client sees. The first entry is the starting flow. */
  enabledFlows: FlowType[];
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
    logo: Omit<BrandLogo, "requiresFilter">;
    colors: { primary: string; primaryDark: string; primaryLight: string; primaryWash: string };
    educationVideo?: { title: string; description: string; thumbnail: string; embedUrl: string };
  };
  chatbotIcon: string;
  favicon?: string;
}
