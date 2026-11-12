/** The HCP site's copy comes from the brand file (`hcpSite`). This reads it and fills the `{drug}` and `{patient}` tokens. */
import { BRAND } from "@/brand";
import { PROGRAM } from "@/portals/patient/config/branding";
import type { BrandHcpSite, BrandPatientSite } from "@/brand/schema";

/** The active brand's HCP site content. Throws when a brand has an HCP enrollment demo and no `hcpSite`. */
export function hcpSite(): BrandHcpSite {
  if (!BRAND.hcpSite) throw new Error(`brands/${BRAND.slug}/brand.json needs "hcpSite" for the HCP enrollment demo`);
  return BRAND.hcpSite;
}

/** The active brand's patient site content (the patient's services page on the audience scenario). */
export function patientSite(): BrandPatientSite {
  if (!BRAND.patientSite) throw new Error(`brands/${BRAND.slug}/brand.json needs "patientSite" for the audience demo`);
  return BRAND.patientSite;
}

export const withDrug = (text: string) => text.split("{drug}").join(PROGRAM.name);
export const withPatient = (text: string, firstName: string) => text.split("{patient}").join(firstName);
