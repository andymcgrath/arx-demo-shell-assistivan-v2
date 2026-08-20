/**
 * Rewrites legacy /uploads/<filename> URLs to the raw
 * /.netlify/functions/serve-upload/<filename> path.
 *
 * netlify.toml's /uploads/* redirect (to serve-upload.ts) has been
 * confirmed unreliable in production on at least two separate deployed
 * sites in this project — it falls through to the SPA catch-all instead
 * of reaching the function, even with force = true set. See
 * netlify/functions/admin-brand-detail.ts's header comment for the
 * broader pattern of this project's redirect layer being unreliable for
 * various route shapes; admin-upload.ts and admin-assets.ts now hand out
 * the raw path directly for anything uploaded going forward, but brand
 * data saved before that change (bundled preset JSON, already-promoted
 * active-brand blobs) still has the old /uploads/... form baked in.
 * Rewriting at render time here means old data keeps working without a
 * migration, instead of only fixing it for new uploads.
 */
const LEGACY_PREFIX = "/uploads/";
const RAW_PREFIX = "/.netlify/functions/serve-upload/";

export function resolveAssetUrl<T extends string | undefined>(url: T): T {
  if (typeof url === "string" && url.startsWith(LEGACY_PREFIX)) {
    return (RAW_PREFIX + url.slice(LEGACY_PREFIX.length)) as T;
  }
  return url;
}

/** Deep-walks an arbitrary JSON-shaped value (brand data, presets, etc.)
 * and rewrites every string that looks like a legacy /uploads/ URL.
 * Generic on purpose rather than a hardcoded list of known fields, so it
 * doesn't need updating every time the branding schema grows a new
 * image field. */
export function resolveAssetUrlsDeep<T>(value: T): T {
  if (typeof value === "string") {
    return resolveAssetUrl(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(resolveAssetUrlsDeep) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveAssetUrlsDeep(v);
    }
    return out as T;
  }
  return value;
}

/** True for any URL that's backed by this app's own Blobs storage
 * (whether it's in the old /uploads/ form or the raw serve-upload form) —
 * i.e. something a promote needs to carry the bytes for, as opposed to
 * an external CDN URL or a data: URL that's already reachable anywhere. */
export function isLocalUploadUrl(url?: string): boolean {
  return Boolean(url) && (url!.startsWith(LEGACY_PREFIX) || url!.startsWith(RAW_PREFIX));
}

/** Extracts the Blobs filename back out of either URL form. */
export function filenameFromUploadUrl(url: string): string {
  if (url.startsWith(RAW_PREFIX)) return url.slice(RAW_PREFIX.length);
  if (url.startsWith(LEGACY_PREFIX)) return url.slice(LEGACY_PREFIX.length);
  return url;
}
