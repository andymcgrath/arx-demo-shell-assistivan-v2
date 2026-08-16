/**
 * Shared parsing for PROMOTE_TARGETS — the multi-destination replacement
 * for the older single PROD_SITE_URL + PROMOTE_SECRET pair. Set as a JSON
 * array in .env:
 *
 *   PROMOTE_TARGETS=[{"name":"Assistivan","url":"https://...","secret":"..."}, ...]
 *
 * Used by both admin-promote-targets.ts (lists name+url for the dropdown,
 * never the secret) and admin-promote.ts (looks up the chosen target's
 * url+secret to forward the promote request to).
 */
export interface PromoteTarget {
  name: string;
  url: string;
  secret: string;
}

export function getPromoteTargets(): PromoteTarget[] {
  const raw = process.env.PROMOTE_TARGETS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is PromoteTarget =>
        !!t && typeof t.name === "string" && typeof t.url === "string" && typeof t.secret === "string",
    );
  } catch {
    return [];
  }
}
