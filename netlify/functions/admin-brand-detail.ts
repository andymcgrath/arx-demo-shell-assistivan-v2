/**
 * GET/DELETE /api/admin/brands/:slug — one saved preset.
 *
 * netlify.toml forwards :slug as part of the destination PATH (not a
 * query string, and not this function's own `config.path` — see below),
 * so this reads it off the tail of the request URL itself. Two other
 * approaches were tried first and both proved unreliable specifically in
 * production despite working fine under `netlify dev`:
 *   - a netlify.toml redirect rewriting :slug into a `slug` query string
 *     param — the query string arrived empty on Netlify's real edge.
 *   - this function's own `config.path` export (Netlify Functions v2's
 *     documented declarative routing) — registered and worked locally,
 *     but never took effect on the deployed site (a known, reported gap
 *     in Netlify's tooling, not something fixable in this codebase).
 * Forwarding the segment in the path itself, the way a splat redirect
 * always has, is the one approach that's actually reliable in production.
 *
 * v2 function — see brand-active.ts for why.
 */
import { getPreset, deletePreset, json, errorDetail } from "./_lib/brandStore";

const PREFIX = "/.netlify/functions/admin-brand-detail/";

export default async (req: Request) => {
  const { pathname } = new URL(req.url);
  const slug = pathname.startsWith(PREFIX) ? decodeURIComponent(pathname.slice(PREFIX.length)) : "";
  if (!slug) return json(400, { error: "Missing slug" });

  try {
    if (req.method === "GET") {
      const preset = await getPreset(slug);
      if (!preset) return json(404, { error: "Brand not found" });
      return json(200, preset);
    }

    if (req.method === "DELETE") {
      // Deletes only the saved preset — active-brand is a separate entry,
      // so this never affects what's currently live, even if you delete
      // the preset it originally came from.
      await deletePreset(slug);
      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[admin-brand-detail]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
