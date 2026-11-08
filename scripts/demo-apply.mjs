/**
 * pnpm demo:apply <client>/<slug> [--dry]
 * See scripts/demoApply.ts. This file only loads it through Vite, so the "@/" alias works.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createServer } from "vite";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const name = args.find((a) => !a.startsWith("--"));
if (!name) {
  console.error("Usage: pnpm demo:apply <client>/<slug> [--dry]");
  process.exit(1);
}

const root = process.cwd();
const server = await createServer({ root, logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
let code = 1;
try {
  const [{ runApply }, { planApply }, { validateDemoRequest }] = await Promise.all([
    server.ssrLoadModule("/scripts/demoApply.ts"),
    server.ssrLoadModule("/client/workflows/catalog/apply.ts"),
    server.ssrLoadModule("/client/workflows/catalog/request.ts"),
  ]);
  const runBrandTest = () => {
    const r = spawnSync("pnpm", ["vitest", "run", path.join("client", "brand", "__tests__", "brands.test.ts")], { cwd: root, encoding: "utf8" });
    return { ok: r.status === 0, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  };
  // A new brand file starts from this brand. Source under client/ never names a brand.
  const PARENT_BRAND = "assistivan";
  const out = runApply(root, name, { planApply: (r, e) => planApply(r, e, PARENT_BRAND), validate: validateDemoRequest, runBrandTest }, { dry });
  for (const line of out.lines) (out.ok ? console.log : console.error)(line);
  code = out.ok ? 0 : 1;
} finally {
  await server.close();
}
process.exit(code);
