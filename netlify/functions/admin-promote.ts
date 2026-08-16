/**
 * POST /api/admin/promote — called by the browser from whichever
 * environment you're currently working in (normally local dev). Forwards
 * the brand + any referenced upload files to the chosen destination's own
 * admin-promote-receive function over a server-to-server request, so the
 * browser never needs cross-origin access to prod directly.
 *
 * Destination resolution, in order:
 *   1. PROMOTE_TARGETS set — body.target must name one of them (matched by
 *      admin-promote-targets.ts's dropdown); its url + secret are used.
 *   2. PROMOTE_TARGETS not set — legacy single-destination fallback using
 *      PROD_SITE_URL + PROMOTE_SECRET.
 * Either way, prod itself should have neither PROMOTE_TARGETS nor
 * PROD_SITE_URL set — it has nowhere further to promote to — so calling
 * this endpoint on prod correctly reports "not configured" instead of
 * silently doing nothing.
 *
 * v2 function — see brand-active.ts for why.
 */
import { json, errorDetail } from "./_lib/brandStore";
import { getPromoteTargets } from "./_lib/promoteTargets";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const body = await req.text();

  let target: string | undefined;
  try {
    target = (JSON.parse(body || "{}") as { target?: string }).target;
  } catch {
    // Malformed JSON is caught again below, where it actually matters.
  }

  const targets = getPromoteTargets();
  let prodUrl: string | undefined;
  let secret: string | undefined;

  if (targets.length > 0) {
    if (!target) return json(400, { error: "Choose a destination before promoting." });
    const match = targets.find(t => t.name === target);
    if (!match) return json(400, { error: `Unknown destination "${target}".` });
    prodUrl = match.url;
    secret = match.secret;
  } else {
    prodUrl = process.env.PROD_SITE_URL;
    secret = process.env.PROMOTE_SECRET;
  }

  if (!prodUrl || !secret) {
    return json(400, {
      error:
        "Promotion isn't configured here. Set PROMOTE_TARGETS (or PROD_SITE_URL + PROMOTE_SECRET) in this environment.",
    });
  }

  try {
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
