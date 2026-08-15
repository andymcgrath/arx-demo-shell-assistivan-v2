/**
 * GET/DELETE /api/admin/brands/:slug — one saved preset.
 *
 * netlify.toml rewrites the :slug path segment into a `slug` query param
 * (Netlify Functions don't do path params on their own), so this reads
 * it off the request URL's search params.
 *
 * v2 function — see brand-active.ts for why.
 */
import { getPreset, deletePreset, json, errorDetail } from "./_lib/brandStore";

export default async (req: Request) => {
  const slug = new URL(req.url).searchParams.get("slug");
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
