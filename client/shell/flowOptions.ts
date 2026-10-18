/**
 * The demo dropdown. Each entry is a demo from the active brand's `demos` list in
 * `brands/<BRAND>/brand.json`: a label, a description, the flow it runs on, and the
 * fork choices it starts with. See client/brand/schema.ts (BrandDemo).
 *
 * The labels used to live here, one per flow. They moved to the brand files so each client
 * sees its own wording, and so one flow can appear several times with different choices.
 */
import type { BrandDemo } from "@/brand/schema";
import { BRAND } from "@/brand";

/** The demos this client sees, in the order the brand lists them. */
export const DEMO_OPTIONS: BrandDemo[] = BRAND.demos;
