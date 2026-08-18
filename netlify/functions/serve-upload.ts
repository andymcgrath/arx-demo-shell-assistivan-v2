/**
 * Public. GET /uploads/:file — streams a previously uploaded
 * logo/favicon/icon back out of the "uploads" Blobs store with its
 * original content type.
 *
 * netlify.toml forwards the splat as part of the destination PATH (not a
 * `?file=:splat` query string, and not this function's own `config.path`
 * — see admin-brand-detail.ts for why both of those proved unreliable in
 * production despite working under `netlify dev`), so this reads the
 * filename off the tail of the request URL itself. Matches either the
 * original request path (/uploads/:file) or the redirect's destination
 * path (/.netlify/functions/serve-upload/:file) — see admin-brand-detail.ts
 * for why req.url's shape isn't consistent between netlify dev and
 * production.
 *
 * v2 function — see brand-active.ts for why. Bonus of v2 here: a real
 * Response can take the raw ArrayBuffer directly as its body, no more
 * base64/isBase64Encoded dance that v1's Lambda-shaped responses needed.
 */
import { uploadsStore } from "./_lib/uploadStore";

const FILE_PATTERN = /\/(?:uploads|\.netlify\/functions\/serve-upload)\/([^/]+)\/?$/;

export default async (req: Request) => {
  const { pathname } = new URL(req.url);
  const match = pathname.match(FILE_PATTERN);
  const file = match ? decodeURIComponent(match[1]) : "";
  if (!file) return new Response("Missing file", { status: 400 });

  try {
    const result = await uploadsStore().getWithMetadata(file, { type: "arrayBuffer" });
    if (!result) return new Response("Not found", { status: 404 });

    const contentType =
      (result.metadata as { contentType?: string } | undefined)?.contentType ??
      "application/octet-stream";

    return new Response(result.data as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[serve-upload]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(`Server error: ${detail}`, { status: 500 });
  }
};
