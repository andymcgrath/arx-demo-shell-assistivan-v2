/**
 * POST /api/admin/promote — called by the browser from whichever
 * environment you're currently working in (normally local dev). Forwards
<<<<<<< HEAD
 * the brand + any referenced upload files to a chosen target site's own
=======
 * the brand + any referenced upload files to the chosen destination's own
>>>>>>> PharmaEssentia
 * admin-promote-receive function over a server-to-server request, so the
 * browser never needs cross-origin access to prod directly, and never
 * sees any target's secret.
 *
<<<<<<< HEAD
 * Reads PROMOTE_TARGETS (see _lib/promoteTargets.ts) to resolve which
 * site to send to. The request body's `target` field is the target's
 * `name`; if only one target is configured, it's used automatically.
=======
 * Destination resolution, in order:
 *   1. PROMOTE_TARGETS set — body.target must name one of them (matched by
 *      admin-promote-targets.ts's dropdown); its url + secret are used.
 *   2. PROMOTE_TARGETS not set — legacy single-destination fallback using
 *      PROD_SITE_URL + PROMOTE_SECRET.
 * Either way, prod itself should have neither PROMOTE_TARGETS nor
 * PROD_SITE_URL set — it has nowhere further to promote to — so calling
 * this endpoint on prod correctly reports "not configured" instead of
 * silently doing nothing.
>>>>>>> PharmaEssentia
 *
 * v2 function — see brand-active.ts for why.
 */
import { json, errorDetail } from "./_lib/brandStore";
import { getPromoteTargets } from "./_lib/promoteTargets";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

<<<<<<< HEAD
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
=======
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
>>>>>>> PharmaEssentia
  }

  const targets = getPromoteTargets();
  if (targets.length === 0) {
    return json(400, {
      error:
<<<<<<< HEAD
        "No promote targets configured. Set PROMOTE_TARGETS in this environment's .env (see .env.example).",
=======
        "Promotion isn't configured here. Set PROMOTE_TARGETS (or PROD_SITE_URL + PROMOTE_SECRET) in this environment.",
>>>>>>> PharmaEssentia
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
<<<<<<< HEAD
    const res = await fetch(`${target.url.replace(/\/$/, "")}/api/admin/promote-receive`, {
=======
    const res = await fetch(`${prodUrl.replace(/\/$/, "")}/api/admin/promote-receive`, {
>>>>>>> PharmaEssentia
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-promote-secret": target.secret,
      },
      body: JSON.stringify(forwardBody),
    });

    const result = await res.json().catch(() => ({ error: "Unexpected response from production" }));
    return json(res.status, result);
  } catch (err) {
    console.error("[admin-promote]", err);
    return json(502, { error: `Could not reach ${target.name}`, detail: errorDetail(err) });
  }
};
