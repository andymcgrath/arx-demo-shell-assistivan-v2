/**
 * Public. GET /uploads/:file (rewritten from netlify.toml's /uploads/*
 * redirect into ?file=... since this used to be a static file path).
 * Streams a previously uploaded logo/favicon/icon back out of the
 * "uploads" Blobs store with its original content type.
 */
import type { Handler } from "@netlify/functions";
import { uploadsStore } from "./_lib/uploadStore";

export const handler: Handler = async event => {
  const file = event.queryStringParameters?.file;
  if (!file) return { statusCode: 400, body: "Missing file" };

  try {
    const result = await uploadsStore().getWithMetadata(file, { type: "arrayBuffer" });
    if (!result) return { statusCode: 404, body: "Not found" };

    const contentType =
      (result.metadata as { contentType?: string } | undefined)?.contentType ??
      "application/octet-stream";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: Buffer.from(result.data as ArrayBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("[serve-upload]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return { statusCode: 500, body: `Server error: ${detail}` };
  }
};
