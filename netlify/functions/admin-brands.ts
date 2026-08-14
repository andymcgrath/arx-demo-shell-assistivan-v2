/**
 * GET /api/admin/brands — list of saved presets for the "Load brand"
 * dropdown. Always includes the three bundled defaults plus anything
 * saved in this environment's store (see listPresets in brandStore.ts).
 */
import type { Handler } from "@netlify/functions";
import { listPresets, json, errorDetail } from "./_lib/brandStore";

export const handler: Handler = async event => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const list = await listPresets();
    return json(200, list);
  } catch (err) {
    console.error("[admin-brands]", err);
    return json(500, { error: "Server error", detail: errorDetail(err) });
  }
};
