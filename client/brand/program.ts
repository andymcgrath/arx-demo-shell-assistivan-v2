import type { BrandAssets, BrandConfig } from "./schema";

/**
 * The program as the patient screens read it. A brand may leave `assets` out when the drug has no logo files, so
 * every consumer gets an object and the program name shows as text. Nothing else is filled in.
 */
type Program = BrandConfig["program"];

export function withProgramDefaults(program: Program): Omit<Program, "assets"> & { assets: BrandAssets } {
  return { ...program, assets: program.assets ?? {} };
}
