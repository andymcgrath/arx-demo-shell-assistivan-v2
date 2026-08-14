/**
 * Storage helpers for logo/favicon/chatbot-icon uploads.
 *
 * Same Netlify Blobs mechanism as brandStore.ts, kept in a separate store
 * ("uploads") since these are binary files rather than JSON, and are
 * addressed by filename rather than by slug. Served back out through the
 * serve-upload function (see netlify.toml's /uploads/* redirect) — Blobs
 * entries aren't directly web-addressable the way static files were.
 */
import { getStore } from "@netlify/blobs";

const STORE_NAME = "uploads";

export function uploadsStore() {
  return getStore(STORE_NAME);
}

/** Timestamp-prefixed so re-uploading a file with the same name never
 * collides with (or silently overwrites) a previous one — matches the old
 * file-based behavior exactly. */
export function safeFilename(name: string): string {
  const cleaned = String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${cleaned}`;
}

/** Pulls the real content type out of a `data:image/png;base64,...` URL so
 * it can be stored as blob metadata and replayed on the way back out —
 * static file serving used to infer this from the file extension, Blobs
 * has no notion of an extension so this has to be carried explicitly. */
export function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);base64,/.exec(dataUrl);
  return match?.[1] ?? "application/octet-stream";
}

export function isSafeFilename(name: string): boolean {
  return !name.includes("/") && !name.includes("\\") && !name.includes("..");
}
