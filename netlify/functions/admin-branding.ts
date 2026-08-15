/**
 * GET/POST /api/admin/branding — the /admin screen's read + Save Changes.
 *
 * Behavior matches the old dev-only Vite plugin exactly: GET returns
 * whatever brand is currently active *in this environment*; POST merges
 * the submitted fields into it and makes the result live immediately
 * (no separate "activate" step — Save has always meant "this is live
 * now"). If a presetName is included, it's also saved as a named preset.
 *
 * v2 function — see brand-active.ts for why.
 */
import { getActiveBrand, setActiveBrand, savePreset, slugify, json, errorDetail } from "./_lib/brandStore";

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      const data = await getActiveBrand();
      return json(200, data);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const existing = await getActiveBrand();

      const merged = {
        manufacturer: { ...(existing as any).manufacturer, ...(body as any).manufacturer },
        program: {
          ...(existing as any).program,
          ...(body as any).program,
          colors: { ...(existing as any).program?.colors, ...((body as any).program?.colors ?? {}) },
        },
        chatbotIcon: (body as any).chatbotIcon ?? (existing as any).chatbotIcon,
        favicon: (body as any).favicon ?? (existing as any).favicon,
      };

      await setActiveBrand(merged);

      const presetName = (body as any).presetName;
      if (typeof presetName === "string" && presetName.trim()) {
        const slug = slugify(presetName);
        await savePreset(slug, { presetName: presetName.trim(), data: merged });
      }

      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[admin-branding]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
