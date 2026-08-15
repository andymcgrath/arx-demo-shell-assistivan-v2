/**
 * POST /api/admin/promote — called by the browser from whichever
 * environment you're currently working in (normally local dev). Forwards
 * the brand + any referenced upload files to the production site's own
 * admin-promote-receive function over a server-to-server request, so the
 * browser never needs cross-origin access to prod directly.
 *
 * Requires PROD_SITE_URL and PROMOTE_SECRET to be set in *this*
 * environment. Prod itself should not have PROD_SITE_URL set — it has
 * nowhere further to promote to — so calling this endpoint on prod
 * correctly reports "not configured" instead of silently doing nothing.
 *
 * v2 function — see brand-active.ts for why.
 */
import { json, errorDetail } from "./_lib/brandStore";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const prodUrl = process.env.PROD_SITE_URL;
  const secret = process.env.PROMOTE_SECRET;

  if (!prodUrl || !secret) {
    return json(400, {
      error:
        "Promotion isn't configured here. Set PROD_SITE_URL and PROMOTE_SECRET in this environment (PROD_SITE_URL should only be set in dev, not in prod).",
    });
  }

  try {
    const body = await req.text();
    const res = await fetch(`${prodUrl.replace(/\/$/, "")}/api/admin/promote-receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-promote-secret": secret,
      },
      body: body || "{}",
    });

    const result = await res.json().catch(() => ({ error: "Unexpected response from production" }));
    return json(res.status, result);
  } catch (err) {
    console.error("[admin-promote]", err);
    return json(502, { error: "Could not reach the production site", detail: errorDetail(err) });
  }
};
