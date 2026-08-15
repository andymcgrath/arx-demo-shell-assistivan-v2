/**
 * GET /api/admin/assets — list uploaded files.
 * DELETE /api/admin/assets/:filename — remove one.
 *
 * As with brand details, netlify.toml rewrites :filename into a query
 * param. Deleting only removes the file itself — any brand still
 * pointing at that /uploads/<filename> URL will show a broken image;
 * this never scans/rewrites branding JSON, same as the old behavior.
 *
 * v2 function — see brand-active.ts for why.
 */
import { uploadsStore, isSafeFilename } from "./_lib/uploadStore";
import { json, errorDetail } from "./_lib/brandStore";

export default async (req: Request) => {
  const filename = new URL(req.url).searchParams.get("filename");

  try {
    if (req.method === "GET" && !filename) {
      const { blobs } = await uploadsStore().list();
      return json(200, blobs.map(b => ({ url: `/uploads/${b.key}`, filename: b.key })));
    }

    if (req.method === "DELETE" && filename) {
      const decoded = decodeURIComponent(filename);
      if (!isSafeFilename(decoded)) {
        return json(400, { error: "Invalid filename" });
      }
      await uploadsStore().delete(decoded);
      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[admin-assets]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
