/**
 * POST /api/admin/upload — logo/favicon/chatbot-icon uploads.
 * Same { filename, dataUrl } contract as before; writes into the
 * "uploads" Blobs store instead of public/uploads/ on disk, since a
 * deployed function's local disk doesn't persist between invocations.
 *
 * v2 function — see brand-active.ts for why.
 */
import { uploadsStore, safeFilename, mimeFromDataUrl } from "./_lib/uploadStore";
import { json, errorDetail } from "./_lib/brandStore";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = (await req.json().catch(() => ({}))) as { dataUrl?: string; filename?: string };
    if (!body.dataUrl || !body.filename) {
      return json(400, { error: "Missing filename or dataUrl" });
    }

    const contentType = mimeFromDataUrl(body.dataUrl);
    const base64 = body.dataUrl.split(",")[1] ?? body.dataUrl;
    const buffer = Buffer.from(base64, "base64");
    const filename = safeFilename(body.filename);

    await uploadsStore().set(filename, buffer, { metadata: { contentType } });

    return json(200, { url: `/uploads/${filename}`, filename });
  } catch (err) {
    console.error("[admin-upload]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
