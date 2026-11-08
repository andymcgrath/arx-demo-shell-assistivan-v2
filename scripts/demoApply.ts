import fs from "node:fs";
import path from "node:path";
import type { ApplyResult } from "../client/workflows/catalog/apply";
import type { DemoRequest } from "../client/workflows/catalog/request";

/**
 * `pnpm demo:apply <client>/<slug>` (or just `<slug>` when only one client has it).
 * Reads docs/demos/<client>/<slug>.request.json and writes the demos into brands/<client>/brand.json, then runs the
 * brand test. If the test fails, the brand file goes back as it was. No model.
 */

const SAFE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ApplyDeps {
  /** Loaded through Vite so it can use the "@/" alias. */
  planApply: (request: DemoRequest, existing: Record<string, unknown> | undefined) => ApplyResult;
  validate: (input: unknown) => { ok: true; request: DemoRequest } | { ok: false; problems: string[] };
  runBrandTest: () => { ok: boolean; output: string };
}

export interface ApplyOutcome {
  ok: boolean;
  /** What to tell the user, one line each. */
  lines: string[];
}

/** `client/slug` or a bare slug. Returns the request file, or a reason it cannot be found. */
export function findRequest(root: string, arg: string): { file: string; client: string } | { error: string } {
  const demos = path.join(root, "docs", "demos");
  const parts = arg.split("/");
  if (parts.length > 2 || !parts.every((p) => SAFE.test(p))) return { error: `"${arg}" is not a request name. Use <client>/<slug>, in lowercase words joined by hyphens.` };
  if (parts.length === 2) {
    const file = path.join(demos, parts[0], `${parts[1]}.request.json`);
    return fs.existsSync(file) ? { file, client: parts[0] } : { error: `no request at docs/demos/${parts[0]}/${parts[1]}.request.json` };
  }
  const found = fs.existsSync(demos)
    ? fs.readdirSync(demos).filter((c) => SAFE.test(c) && fs.existsSync(path.join(demos, c, `${arg}.request.json`)))
    : [];
  if (found.length === 0) return { error: `no request named "${arg}" under docs/demos/` };
  if (found.length > 1) return { error: `"${arg}" exists for ${found.join(", ")}. Use <client>/${arg}.` };
  return { file: path.join(demos, found[0], `${arg}.request.json`), client: found[0] };
}

export function runApply(root: string, arg: string, deps: ApplyDeps, opts: { dry?: boolean } = {}): ApplyOutcome {
  const found = findRequest(root, arg);
  if ("error" in found) return { ok: false, lines: [found.error] };

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(found.file, "utf8"));
  } catch {
    return { ok: false, lines: [`${path.relative(root, found.file)} is not JSON`] };
  }
  const checked = deps.validate(raw);
  if (!checked.ok) return { ok: false, lines: ["the request is not valid:", ...checked.problems] };
  const request = checked.request;
  // The folder is the client. A request that says another client would write another client's brand.
  if (request.client !== found.client) return { ok: false, lines: [`the request says client "${request.client}" but sits in docs/demos/${found.client}/`] };

  const brandFile = path.join(root, "brands", request.client, "brand.json");
  const before = fs.existsSync(brandFile) ? fs.readFileSync(brandFile, "utf8") : undefined;
  const plan = deps.planApply(request, before === undefined ? undefined : JSON.parse(before));
  if (!plan.ok) return { ok: false, lines: plan.problems };

  const summary = [
    `${plan.demos.length} demo${plan.demos.length === 1 ? "" : "s"} on ${plan.flow}: ${plan.demos.map((d) => d.id).join(", ")}`,
    ...plan.notes,
  ];
  if (opts.dry) return { ok: true, lines: [`Dry run. Would write brands/${request.client}/brand.json.`, ...summary] };

  fs.mkdirSync(path.dirname(brandFile), { recursive: true });
  fs.writeFileSync(brandFile, `${JSON.stringify(plan.brand, null, 2)}\n`);
  const test = deps.runBrandTest();
  if (!test.ok) {
    if (before === undefined) fs.rmSync(path.dirname(brandFile), { recursive: true, force: true });
    else fs.writeFileSync(brandFile, before);
    return { ok: false, lines: ["The brand test failed, so the brand file was put back as it was.", ...test.output.split("\n").slice(-25)] };
  }
  return { ok: true, lines: [`Wrote brands/${request.client}/brand.json. The brand test passes.`, ...summary] };
}
