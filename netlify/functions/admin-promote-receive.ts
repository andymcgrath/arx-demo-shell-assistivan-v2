/**
 * POST /api/admin/promote-receive — writes a promoted brand into *this*
 * environment's store. Deployed identically everywhere, but only meant
 * to be called from another environment's admin-promote forwarder, so
 * it's gated on the PROMOTE_SECRET header matching this environment's
 * PROMOTE_SECRET env var rather than on where the request came from.
 *
 * Writes any referenced upload files first, then the brand JSON, so the
 * brand never points at a briefly-missing image.
 *
 * v2 function — see brand-active.ts for why.
 */
import { setActiveBrand, savePreset, slugify, json, errorDetail } from "./_lib/brandStore";
import { uploadsStore } from "./_lib/uploadStore";

interface PromotePayload {
  brand: Record<string, unknown>;
  presetName?: string;
  assets?: { filename: string; dataUrl: string; contentType?: string }[];
}

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const provided = req.headers.get("x-promote-secret");
  const expected = process.env.PROMOTE_SECRET;
  if (!expected || provided !== expected) {
    // Temporary diagnostic detail — lengths/edges only, never the full
    // value, so this is safe to leave in a response body. Remove once
    // the mismatch is found; this narrows "not set on this site" vs
    // "set but doesn't match" vs "header never arrived" instantly,
    // instead of guessing blind.
    return json(401, {
      error: "Invalid or missing promote secret",
      debug: {
        expectedSet: Boolean(expected),
        expectedLength: expected?.length ?? 0,
        expectedEdges: expected ? `${expected.slice(0, 4)}...${expected.slice(-4)}` : null,
        providedLength: provided?.length ?? 0,
        providedEdges: provided ? `${provided.slice(0, 4)}...${provided.slice(-4)}` : null,
      },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PromotePayload;
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
