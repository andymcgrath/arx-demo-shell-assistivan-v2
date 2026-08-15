/**
 * POST /api/admin/promote — called by the browser from whichever
 * environment you're currently working in (normally local dev). Forwards
<<<<<<< HEAD
 * the brand + any referenced upload files to the production site's own
 * admin-promote-receive function over a server-to-server request, so the
 * browser never needs cross-origin access to prod directly.
 *
 * Requires PROD_SITE_URL and PROMOTE_SECRET to be set in *this*
 * environment. Prod itself should not have PROD_SITE_URL set — it has
 * nowhere further to promote to — so calling this endpoint on prod
 * correctly reports "not configured" instead of silently doing nothing.
=======
 * the brand + any referenced upload files to a chosen target site's own
 * admin-promote-receive function over a server-to-server request, so the
 * browser never needs cross-origin access to prod directly, and never
 * sees any target's secret.
 *
 * Reads PROMOTE_TARGETS (see _lib/promoteTargets.ts) to resolve which
 * site to send to. The request body's `target` field is the target's
 * `name`; if only one target is configured, it's used automatically.
>>>>>>> TG-Therapeutics
 *
 * v2 function — see brand-active.ts for why.
 */
import { json, errorDetail } from "./_lib/brandStore";
<<<<<<< HEAD
=======
import { getPromoteTargets } from "./_lib/promoteTargets";
>>>>>>> TG-Therapeutics

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

<<<<<<< HEAD
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
=======
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const targets = getPromoteTargets();
  if (targets.length === 0) {
    return json(400, {
      error:
        "No promote targets configured. Set PROMOTE_TARGETS in this environment's .env (see .env.example).",
    });
  }

  const requestedName = typeof payload.target === "string" ? payload.target : undefined;
  const target = requestedName
    ? targets.find(t => t.name === requestedName)
    : targets.length === 1
      ? targets[0]
      : undefined;

  if (!target) {
    return json(400, {
      error: requestedName
        ? `Unknown promote target "${requestedName}".`
        : "More than one promote target is configured — specify which one to use.",
    });
  }

  const { target: _omit, ...forwardBody } = payload;

  try {
    const res = await fetch(`${target.url.replace(/\/$/, "")}/api/admin/promote-receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-promote-secret": target.secret,
      },
      body: JSON.stringify(forwardBody),
>>>>>>> TG-Therapeutics
    });

    const result = await res.json().catch(() => ({ error: "Unexpected response from production" }));
    return json(res.status, result);
  } catch (err) {
    console.error("[admin-promote]", err);
<<<<<<< HEAD
    return json(502, { error: "Could not reach the production site", detail: errorDetail(err) });
=======
    return json(502, { error: `Could not reach ${target.name}`, detail: errorDetail(err) });
>>>>>>> TG-Therapeutics
  }
};
