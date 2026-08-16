/**
 * GET/DELETE /api/admin/brands/:slug — one saved preset.
 *
<<<<<<< HEAD
 * netlify.toml rewrites the :slug path segment into a `slug` query param
 * (Netlify Functions don't do path params on their own), so this reads
 * it off the request URL's search params.
 *
 * v2 function — see brand-active.ts for why.
 */
import { getPreset, deletePreset, json, errorDetail } from "./_lib/brandStore";

export default async (req: Request) => {
  const slug = new URL(req.url).searchParams.get("slug");
=======
 * Routed via this function's own `config.path` below rather than a
 * netlify.toml redirect that rewrites :slug into a `slug` query param —
 * that query-string-substitution approach worked fine under `netlify dev`
 * but silently dropped the value on Netlify's real production edge
 * (confirmed via the deployed site's function logs: request reached this
 * function, but the query param arrived empty). Path params via `config`
 * are handled natively by Netlify Functions, not the legacy redirects
 * engine, so they don't hit that gap.
 *
 * v2 function — see brand-active.ts for why.
 */
import type { Config, Context } from "@netlify/functions";
import { getPreset, deletePreset, json, errorDetail } from "./_lib/brandStore";

export const config: Config = {
  path: "/api/admin/brands/:slug",
};

export default async (req: Request, context: Context) => {
  const slug = context.params.slug;
>>>>>>> PharmaEssentia
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
