/**
 * Public. GET /uploads/:file — streams a previously uploaded
 * logo/favicon/icon back out of the "uploads" Blobs store with its
 * original content type.
 *
 * Routed via this function's own `config.path` (a real path param, not a
 * netlify.toml `*` -> `?file=:splat` rewrite) — see admin-brand-detail.ts
 * for why: the query-string version worked under `netlify dev` but
 * silently dropped the value on Netlify's real production edge.
 *
 * v2 function — see brand-active.ts for why. Bonus of v2 here: a real
 * Response can take the raw ArrayBuffer directly as its body, no more
 * base64/isBase64Encoded dance that v1's Lambda-shaped responses needed.
 */
import type { Config, Context } from "@netlify/functions";
import { uploadsStore } from "./_lib/uploadStore";

export const config: Config = {
  path: "/uploads/:file",
};

export default async (req: Request, context: Context) => {
  const file = context.params.file;
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
