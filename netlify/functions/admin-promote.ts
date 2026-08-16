/**
 * POST /api/admin/promote — called by the browser from whichever
 * environment you're currently working in (normally local dev). Forwards
 * the brand + any referenced upload files to the chosen destination's own
 * admin-promote-receive function over a server-to-server request, so the
 * browser never needs cross-origin access to prod directly, and never
 * sees any target's secret.
 *
 * Destination resolution, in order:
 *   1. PROMOTE_TARGETS set — body.target must name one of them, unless
 *      exactly one target is configured, in which case it's used
 *      automatically. Matched by name against admin-promote-targets.ts's
 *      dropdown; the matching entry's url + secret are used.
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

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const targets = getPromoteTargets();
  const requestedName = typeof payload.target === "string" ? payload.target : undefined;

  let prodUrl: string | undefined;
  let secret: string | undefined;
  let targetName: string;

  if (targets.length > 0) {
    const target = requestedName
      ? targets.find(t => t.name === requestedName)
      : targets.length === 1
        ? targets[0]
        : undefined;

    if (!target) {
      return json(400, {
        error: requestedName
          ? `Unknown destination "${requestedName}".`
          : "Choose a destination before promoting.",
      });
    }
    prodUrl = target.url;
    secret = target.secret;
    targetName = target.name;
  } else {
    prodUrl = process.env.PROD_SITE_URL;
    secret = process.env.PROMOTE_SECRET;
    targetName = "production";
  }

  if (!prodUrl || !secret) {
    return json(400, {
      error:
        "Promotion isn't configured here. Set PROMOTE_TARGETS (or PROD_SITE_URL + PROMOTE_SECRET) in this environment.",
    });
  }

  const { target: _omit, ...forwardBody } = payload;

  try {
    const res = await fetch(`${prodUrl.replace(/\/$/, "")}/api/admin/promote-receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-promote-secret": secret,
      },
      body: JSON.stringify(forwardBody),
    });

    const result = await res.json().catch(() => ({ error: "Unexpected response from production" }));
    return json(res.status, result);
  } catch (err) {
    console.error("[admin-promote]", err);
    return json(502, { error: `Could not reach ${targetName}`, detail: errorDetail(err) });
  }
};
