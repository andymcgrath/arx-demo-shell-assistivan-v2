export interface Evidence {
  hex: string;
  role: string;
  weight: number;
  where: string;
}
export interface Ranked {
  hex: string;
  score: number;
  evidence: string[];
}
export interface Proposal {
  colors: { brand: string; action?: string; accent?: string; fidelity: "exact"; source: string } | null;
  ranked: Ranked[];
}
export const STOCK_COLORS: Set<string>;
export function colorsIn(text: string): string[];
export function oklab(hex: string): [number, number, number];
export function distance(a: string, b: string): number;
export function isNeutral(hex: string): boolean;
export function rules(css: string): [string, string][];
export function evidenceFrom(input: { html?: string; css?: string[] }): { found: Evidence[]; counts: Map<string, number> };
export function propose(input: { html: string; css: string[]; url: string }): Proposal;
export function stylesheetUrls(html: string, pageUrl: string): string[];
export function inlineStyles(html: string): string[];
