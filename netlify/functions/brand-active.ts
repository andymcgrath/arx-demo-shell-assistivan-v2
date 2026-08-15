/**
 * Public, read-only. GET /api/brand/active
 *
 * Returns the brand the app should render *right now*, read at request
 * time instead of baked into the JS bundle at build time — this is what
 * lets a Save/Promote take effect immediately, no rebuild required.
 * See client/lib/activeBrandCache.ts for the client-side caller.
 *
 * v2 function (default export, Web Request/Response) rather than the
 * classic v1 `handler` export — Blobs' automatic environment injection is
 * unreliable on v1's Lambda-emulation shim in local dev, even on a
 * correctly linked site.
 */
import { getActiveBrand, json, errorDetail } from "./_lib/brandStore";

export default async () => {
  try {
    const brand = await getActiveBrand();
    return json(200, brand);
  } catch (err) {
    console.error("[brand-active]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
