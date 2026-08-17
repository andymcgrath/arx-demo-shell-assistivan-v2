/**
 * GET /api/admin/assets — list uploaded files.
 * DELETE /api/admin/assets/:filename — remove one.
 *
 * netlify.toml has two rules for this function: the bare path (no
 * segment, used for the GET list) and one forwarding the filename in the
 * destination PATH for the DELETE case — see admin-brand-detail.ts for
 * why this reads the path directly instead of a query string or this
 * function's own `config.path` (both proved unreliable in production),
 * and for why it matches either the original request path or the
 * redirect's destination path rather than assuming one (req.url's shape
 * differs between netlify dev and production).
 *
 * Deleting only removes the file itself — any brand still pointing at
 * that /uploads/<filename> URL will show a broken image; this never
 * scans/rewrites branding JSON, same as the old behavior.
 *
 * v2 function — see brand-active.ts for why.
 */
import { uploadsStore, isSafeFilename } from "./_lib/uploadStore";
import { json, errorDetail } from "./_lib/brandStore";

const FILENAME_PATTERN = /\/(?:api\/admin\/assets|\.netlify\/functions\/admin-assets)\/([^/]+)\/?$/;

export default async (req: Request) => {
  const { pathname } = new URL(req.url);
  const match = pathname.match(FILENAME_PATTERN);
  const filename = match ? decodeURIComponent(match[1]) : undefined;

  try {
    if (req.method === "GET" && !filename) {
      const { blobs } = await uploadsStore().list();
      return json(200, blobs.map(b => ({ url: `/uploads/${b.key}`, filename: b.key })));
    }

    if (req.method === "DELETE" && filename) {
      // filename is already decoded once above, off the request path.
      if (!isSafeFilename(filename)) {
        return json(400, { error: "Invalid filename" });
      }
      await uploadsStore().delete(filename);
      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[admin-assets]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
