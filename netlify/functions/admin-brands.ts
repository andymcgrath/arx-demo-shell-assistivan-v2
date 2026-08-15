/**
 * GET /api/admin/brands — list of saved presets for the "Load brand"
 * dropdown. Always includes the three bundled defaults plus anything
 * saved in this environment's store (see listPresets in brandStore.ts).
 *
 * v2 function — see brand-active.ts for why.
 */
import { listPresets, json, errorDetail } from "./_lib/brandStore";

export default async (req: Request) => {
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const list = await listPresets();
    return json(200, list);
  } catch (err) {
    console.error("[admin-brands]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
