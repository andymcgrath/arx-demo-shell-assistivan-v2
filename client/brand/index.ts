/**
 * The active brand. Vite inlines it at build time from `brands/<BRAND>/brand.json`
 * (see vite.config.ts). There is no runtime fetch.
 */
import type { FlowType } from "@/engine/types";
import type { BrandConfig } from "./schema";

declare const __BRAND__: BrandConfig;

export const BRAND: BrandConfig = __BRAND__;

/** The flow a fresh session starts on. */
export const DEFAULT_FLOW: FlowType = BRAND.enabledFlows[0];

export function isFlowEnabled(flow: string | undefined): flow is FlowType {
  return !!flow && (BRAND.enabledFlows as string[]).includes(flow);
}
