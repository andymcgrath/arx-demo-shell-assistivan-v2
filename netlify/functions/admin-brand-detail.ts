/**
 * GET/DELETE /api/admin/brands/:slug — one saved preset.
 *
 * netlify.toml rewrites the :slug path segment into a `slug` query param
 * (Netlify Functions don't do path params on their own), so this reads
 * from queryStringParameters rather than the URL path.
 */
import type { Handler } from "@netlify/functions";
import { getPreset, deletePreset, json, errorDetail } from "./_lib/brandStore";

export const handler: Handler = async event => {
  const slug = event.queryStringParameters?.slug;
  if (!slug) return json(400, { error: "Missing slug" });

  try {
    if (event.httpMethod === "GET") {
      const preset = await getPreset(slug);
      if (!preset) return json(404, { error: "Brand not found" });
      return json(200, preset);
    }

    if (event.httpMethod === "DELETE") {
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
