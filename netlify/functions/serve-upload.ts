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
 *
 * On a Blobs miss, falls back to BUILTIN_UPLOADS (see that file's header
 * comment) for the specific handful of asset filenames the Boehringer
 * Ingelheim and TG Therapeutics built-in presets reference — those files
 * live in git but were never actually uploaded into any environment's own
 * Blobs store, which a plain deploy doesn't populate on its own (Blobs is
 * separate per environment). Anything not in that manifest still 404s
 * exactly as before; this never masks a genuinely missing/broken upload.
 * On a fallback hit, also writes the bytes into this environment's Blobs
 * store so every later request takes the normal fast Blobs path instead of
 * repeating this fallback — i.e. each environment self-seeds itself the
 * first time any of these built-in assets is actually requested, with no
 * separate manual step.
 */
import { uploadsStore } from "./_lib/uploadStore";
import { BUILTIN_UPLOADS } from "./_lib/builtinUploads";

const FILE_PATTERN = /\/(?:uploads|\.netlify\/functions\/serve-upload)\/([^/]+)\/?$/;

export default async (req: Request) => {
  const { pathname } = new URL(req.url);
  const match = pathname.match(FILE_PATTERN);
  const file = match ? decodeURIComponent(match[1]) : "";
  if (!file) return new Response("Missing file", { status: 400 });

  try {
    const result = await uploadsStore().getWithMetadata(file, { type: "arrayBuffer" });
    if (result) {
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
    }

    const builtin = BUILTIN_UPLOADS[file];
    if (!builtin) return new Response("Not found", { status: 404 });

    const buffer = Buffer.from(builtin.base64, "base64");

    // Best-effort seed — a failed write here shouldn't fail the response,
    // it just means this same fallback runs again on the next request
    // instead of the normal fast Blobs path. Logged so a persistent Blobs
    // write problem (as opposed to a one-time cold-store miss) doesn't go
    // unnoticed.
    try {
      await uploadsStore().set(file, buffer, { metadata: { contentType: builtin.contentType } });
    } catch (seedErr) {
      console.error("[serve-upload] failed to seed built-in upload into Blobs:", file, seedErr);
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": builtin.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[serve-upload]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(`Server error: ${detail}`, { status: 500 });
  }
};
