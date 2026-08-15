/**
 * GET /api/admin/promote-targets — lists the configured promote
 * destinations for the dropdown in /admin. Only ever returns name + url,
 * never the secret, that stays server-side and is looked up again inside
 * admin-promote.ts at promote time.
 */
import { getPromoteTargets } from "./_lib/promoteTargets";
import { json } from "./_lib/brandStore";

export default async (req: Request) => {
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const targets = getPromoteTargets().map(t => ({ name: t.name, url: t.url }));
  return json(200, targets);
};
