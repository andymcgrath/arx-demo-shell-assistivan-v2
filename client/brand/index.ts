/**
 * The active brand. Vite inlines it at build time from `brands/<BRAND>/brand.json`
 * (see vite.config.ts). There is no runtime fetch.
 */
import type { FlowType } from "@/engine/types";
import type { BrandConfig, BrandDemo } from "./schema";

declare const __BRAND__: BrandConfig;

export const BRAND: BrandConfig = __BRAND__;

/** The demo a fresh session starts on. */
export const DEFAULT_DEMO: BrandDemo = BRAND.demos[0];

/** The flow a fresh session starts on. */
export const DEFAULT_FLOW: FlowType = DEFAULT_DEMO.flow;

export function findDemo(id: string | undefined): BrandDemo | undefined {
  return id ? BRAND.demos.find((d) => d.id === id) : undefined;
}

/** True when at least one of this brand's demos runs on the flow. */
export function isFlowEnabled(flow: string | undefined): flow is FlowType {
  return !!flow && BRAND.demos.some((d) => d.flow === flow);
}
