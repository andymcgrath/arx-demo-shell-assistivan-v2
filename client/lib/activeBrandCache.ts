/**
 * Runtime brand hydration.
 *
 * branding.ts used to statically `import activeBrand from "./active-brand.json"`,
 * which meant a brand saved (or promoted) after the app was built never
 * showed up without a rebuild+redeploy. This module fetches the real
 * active brand from /api/brand/active — backed by Netlify Blobs, see
 * netlify/functions/brand-active.ts — and caches it synchronously so
 * branding.ts can read it the moment it's evaluated.
 *
 * client/App.tsx (loaded via client/bootstrap.tsx) awaits hydrateActiveBrand()
 * before dynamically importing the rest of the app, so by the time any
 * portal module — including branding.ts — is evaluated, the cache below
 * already holds the fetched value.
 *
 * Falls back to the bundled active-brand.json on any failure (offline,
 * running bare `vite dev` without `netlify dev` so /api doesn't exist,
 * slow network past the timeout) — the app should never render blank.
 *
 * Fetches the raw /.netlify/functions/brand-active path rather than the
 * /api/brand/active alias — a production test on this project showed the
 * netlify.toml redirect layer intermittently failing (or adding enough
 * latency to blow past the timeout below) on routes that worked fine hit
 * directly. See admin-brand-detail.ts's header comment for the fuller
 * story on this site's redirect quirks; going straight to the function
 * sidesteps it the same way the admin calls now do.
 */
import fallbackBrand from "@patient/config/active-brand.json";

type ActiveBrand = typeof fallbackBrand;

let cached: ActiveBrand = fallbackBrand;

export function getCachedActiveBrand(): ActiveBrand {
  return cached;
}

export async function hydrateActiveBrand(timeoutMs = 3000): Promise<ActiveBrand> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("/.netlify/functions/brand-active", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      cached = await res.json();
    }
  } catch {
    // Network hiccup, timeout, or /api not available in this environment —
    // keep the bundled fallback already assigned above.
  }
  return cached;
}
