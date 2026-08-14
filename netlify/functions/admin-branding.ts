/**
 * GET/POST /api/admin/branding — the /admin screen's read + Save Changes.
 *
 * Behavior matches the old dev-only Vite plugin exactly: GET returns
 * whatever brand is currently active *in this environment*; POST merges
 * the submitted fields into it and makes the result live immediately
 * (no separate "activate" step — Save has always meant "this is live
 * now"). If a presetName is included, it's also saved as a named preset.
 */
import type { Handler } from "@netlify/functions";
import { getActiveBrand, setActiveBrand, savePreset, slugify, json, errorDetail } from "./_lib/brandStore";

export const handler: Handler = async event => {
  try {
    if (event.httpMethod === "GET") {
      const data = await getActiveBrand();
      return json(200, data);
    }

    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};
      const existing = await getActiveBrand();

      const merged = {
        manufacturer: { ...(existing as any).manufacturer, ...body.manufacturer },
        program: {
          ...(existing as any).program,
          ...body.program,
          colors: { ...(existing as any).program?.colors, ...(body.program?.colors ?? {}) },
        },
        chatbotIcon: body.chatbotIcon ?? (existing as any).chatbotIcon,
        favicon: body.favicon ?? (existing as any).favicon,
      };

      await setActiveBrand(merged);

      if (typeof body.presetName === "string" && body.presetName.trim()) {
        const slug = slugify(body.presetName);
        await savePreset(slug, { presetName: body.presetName.trim(), data: merged });
      }

      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[admin-branding]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
