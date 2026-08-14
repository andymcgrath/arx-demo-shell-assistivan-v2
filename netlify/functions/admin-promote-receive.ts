/**
 * POST /api/admin/promote-receive — writes a promoted brand into *this*
 * environment's store. Deployed identically everywhere, but only meant
 * to be called from another environment's admin-promote forwarder, so
 * it's gated on the PROMOTE_SECRET header matching this environment's
 * PROMOTE_SECRET env var rather than on where the request came from.
 *
 * Writes any referenced upload files first, then the brand JSON, so the
 * brand never points at a briefly-missing image.
 */
import type { Handler } from "@netlify/functions";
import { setActiveBrand, savePreset, slugify, json, errorDetail } from "./_lib/brandStore";
import { uploadsStore } from "./_lib/uploadStore";

interface PromotePayload {
  brand: Record<string, unknown>;
  presetName?: string;
  assets?: { filename: string; dataUrl: string; contentType?: string }[];
}

export const handler: Handler = async event => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const provided = event.headers["x-promote-secret"] ?? event.headers["X-Promote-Secret"];
  const expected = process.env.PROMOTE_SECRET;
  if (!expected || provided !== expected) {
    return json(401, { error: "Invalid or missing promote secret" });
  }

  try {
    const body = (event.body ? JSON.parse(event.body) : {}) as PromotePayload;
    if (!body.brand) return json(400, { error: "Missing brand data" });

    if (Array.isArray(body.assets)) {
      const store = uploadsStore();
      for (const asset of body.assets) {
        const base64 = asset.dataUrl.split(",")[1] ?? asset.dataUrl;
        await store.set(asset.filename, Buffer.from(base64, "base64"), {
          metadata: { contentType: asset.contentType ?? "application/octet-stream" },
        });
      }
    }

    await setActiveBrand(body.brand);

    if (typeof body.presetName === "string" && body.presetName.trim()) {
      const slug = slugify(body.presetName);
      await savePreset(slug, { presetName: body.presetName.trim(), data: body.brand });
    }

    return json(200, { success: true });
  } catch (err) {
    console.error("[admin-promote-receive]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
