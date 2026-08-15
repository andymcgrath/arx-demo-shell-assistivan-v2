/**
 * Entry point loaded directly by index.html.
 *
 * This has to exist as a separate file from App.tsx: everything App.tsx
 * imports (DemoShell, the patient portal, branding.ts, ...) is a static
 * top-level import, so it all gets evaluated the instant App.tsx's module
 * graph loads — there's no room in there to await an async brand fetch
 * first. Dynamically importing App only after hydrateActiveBrand()
 * resolves delays evaluating that whole graph until the cache in
 * activeBrandCache.ts is already populated, so branding.ts sees the real
 * active brand instead of always falling back to the build-time default.
 */
import { hydrateActiveBrand } from "@/lib/activeBrandCache";

async function boot() {
  await hydrateActiveBrand();
  await import("./App");
}

boot();
