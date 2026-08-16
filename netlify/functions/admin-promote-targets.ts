/**
<<<<<<< HEAD
 * GET /api/admin/promote-targets — lists the configured promote
 * destinations for the dropdown in /admin. Only ever returns name + url,
 * never the secret, that stays server-side and is looked up again inside
 * admin-promote.ts at promote time.
 */
import { getPromoteTargets } from "./_lib/promoteTargets";
import { json } from "./_lib/brandStore";
=======
 * GET /api/admin/promote-targets — lists the destinations configured in
 * PROMOTE_TARGETS, for the "Choose destination…" dropdown next to the
 * Promote button. Only { name, url } goes to the browser; secrets stay
 * server-side and are read directly by admin-promote.ts instead.
 *
 * An empty array here means PROMOTE_TARGETS isn't set — the admin UI
 * falls back to the legacy single-destination flow in that case.
 *
 * v2 function — see brand-active.ts for why.
 */
import { json, errorDetail } from "./_lib/brandStore";
import { getPromoteTargets } from "./_lib/promoteTargets";
>>>>>>> PharmaEssentia

export default async (req: Request) => {
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

<<<<<<< HEAD
  const targets = getPromoteTargets().map(t => ({ name: t.name, url: t.url }));
  return json(200, targets);
=======
  try {
    const targets = getPromoteTargets().map(({ name, url }) => ({ name, url }));
    return json(200, targets);
  } catch (err) {
    console.error("[admin-promote-targets]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
>>>>>>> PharmaEssentia
};
