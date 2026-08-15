/**
 * Multi-target promote configuration.
 *
 * Replaces a single PROD_SITE_URL/PROMOTE_SECRET pair with a list, so one
 * dev environment can promote to several Netlify sites (e.g. one per
 * branch/brand) without hand-editing .env between each promote.
 *
 * Set only in the *sending* environment's .env (normally local dev),
 * never on any receiving site — a receiving site only ever needs its own
 * PROMOTE_SECRET (checked in admin-promote-receive.ts), it never needs to
 * know about other sites.
 *
 * Format — a JSON array in a single env var:
 *   PROMOTE_TARGETS=[{"name":"Production","url":"https://assistivan-demo.netlify.app","secret":"..."},{"name":"PharmaEssentia","url":"https://pharmaessentia-demo.netlify.app","secret":"..."}]
 *
 * Each entry's `secret` must match the `PROMOTE_SECRET` env var configured
 * on that specific target site.
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
