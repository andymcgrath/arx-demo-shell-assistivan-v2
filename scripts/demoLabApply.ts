import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import type { DemoRequest, RequestResult } from "../client/workflows/catalog/request";
import { writeDemoRequest, type ExportModules } from "./demoLabExport";

/**
 * The Demo Lab's "Build it now" route. Dev only, like export: the export plugin registers it, and that plugin applies to
 * `vite serve` only. It does what you would do by hand for a request with no new cards:
 *
 *   1. write docs/demos/<client>/<slug>.request.json and .prompt.md (the export)
 *   2. run `pnpm demo:apply <client>/<slug>` (writes brands/<client>/brand.json, runs the brand test, puts the file
 *      back if the test fails)
 *
 * It refuses when: the caller is not this machine, the request is invalid, the request has new (ghost) cards, you are on
 * main, the client's brand file has uncommitted changes, or another build is running. It never commits or tags.
 */

export const APPLY_ROUTE = "/__demo-lab/apply";
const PROTECTED_BRANCHES = ["main", "master"];
const RUN_TIMEOUT_MS = 240_000;

export interface GitRunner {
  (args: string[]): { status: number; stdout: string };
}

export interface ApplyModules extends ExportModules {
  /** How many new (ghost) cards the request has. */
  ghostCount: (request: DemoRequest) => number;
}

export interface ApplyEnv {
  git: GitRunner;
  /** Runs the apply script for `<client>/<slug>` and resolves with its output, one line each. */
  run: (name: string) => Promise<{ ok: boolean; lines: string[] }>;
}

export interface BuildReply {
  status: number;
  json: { ok: boolean; written?: string[]; lines?: string[]; problems?: string[]; last?: LastBuild };
}

export const realGit =
  (root: string): GitRunner =>
  (args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return { status: r.status ?? 1, stdout: r.stdout ?? "" };
  };

/** Why the repo is not ready for a build. Empty when it is. */
export function gitProblems(client: string, git: GitRunner): string[] {
  const head = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (head.status !== 0) return ["This folder is not a git checkout, so I cannot tell which branch you are on. Apply by hand with pnpm demo:apply."];
  const branch = head.stdout.trim();
  const problems: string[] = [];
  if (branch === "HEAD") problems.push("You are not on a branch. Switch to a short-lived branch first.");
  else if (PROTECTED_BRANCHES.includes(branch)) problems.push(`You are on ${branch}. Switch to a short-lived branch first. Feature branches only.`);
  const brandFile = `brands/${client}/brand.json`;
  const dirty = git(["status", "--porcelain", "--", brandFile]);
  if (dirty.status !== 0) problems.push("Could not read the git status of the brand file.");
  else if (dirty.stdout.trim() !== "") problems.push(`${brandFile} has uncommitted changes. Commit or stash them first, so the build's change stands alone.`);
  return problems;
}

const isLoopback = (addr: string | undefined) => addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";

let running = false;

/** The latest build that reached the apply script. It outlives a page reload, so the lab can still say what happened. */
export interface LastBuild {
  at: number;
  ok: boolean;
  lines: string[];
  written?: string[];
}
let last: LastBuild | undefined;
const doneListeners = new Set<() => void>();

export const isBuilding = () => running;
export const lastBuild = () => last;
/** Called once a build that wrote the brand file has finished. Returns a function that stops listening. */
export function onBuildDone(cb: () => void): () => void {
  doneListeners.add(cb);
  return () => doneListeners.delete(cb);
}

/** GET: the latest build, for the lab to show after the page reloads with the new brand file. */
export function handleLast(call: { remoteAddress?: string }): BuildReply {
  if (!isLoopback(call.remoteAddress)) return { status: 403, json: { ok: false, problems: ["only this machine may ask"] } };
  return { status: 200, json: { ok: true, last } };
}

/** The route's logic, apart from the HTTP plumbing, so a test can drive it. */
export async function handleBuild(
  root: string,
  call: { method?: string; remoteAddress?: string; body: string },
  modules: ApplyModules,
  env: ApplyEnv,
): Promise<BuildReply> {
  if (call.method !== "POST") return { status: 405, json: { ok: false, problems: ["use POST"] } };
  if (!isLoopback(call.remoteAddress)) return { status: 403, json: { ok: false, problems: ["only this machine may build"] } };
  let input: unknown;
  try {
    input = JSON.parse(call.body);
  } catch {
    return { status: 400, json: { ok: false, problems: ["the body is not JSON"] } };
  }
  const result: RequestResult = modules.validate(input);
  if (!result.ok) return { status: 422, json: { ok: false, problems: result.problems } };
  const request = result.request;
  const ghosts = modules.ghostCount(request);
  if (ghosts > 0) {
    return { status: 422, json: { ok: false, problems: [`This request has ${ghosts} new card${ghosts === 1 ? "" : "s"}. A script cannot build those. Export it and give the prompt file to Claude Code.`] } };
  }
  if (running) return { status: 409, json: { ok: false, problems: ["Another build is running. Wait for it to finish."] } };
  running = true;
  let ran = false;
  try {
    const blocked = gitProblems(request.client, env.git);
    if (blocked.length) return { status: 409, json: { ok: false, problems: blocked } };
    let written: string[];
    try {
      written = writeDemoRequest(root, request, modules.buildPrompt);
    } catch (e) {
      return { status: 400, json: { ok: false, problems: [(e as Error).message] } };
    }
    const out = await env.run(`${request.client}/${request.slug}`);
    ran = true;
    // What the build changed, from git: a plain count, so an unexpected rewrite of the file shows at once.
    if (out.ok) {
      const brandFile = `brands/${request.client}/brand.json`;
      const stat = env.git(["diff", "--numstat", "--", brandFile]);
      const m = stat.status === 0 ? stat.stdout.trim().split(/\s+/) : [];
      if (m.length >= 2) out.lines = [`${brandFile}: ${m[0]} line${m[0] === "1" ? "" : "s"} added, ${m[1]} removed.`, ...out.lines];
    }
    last = { at: Date.now(), ok: out.ok, lines: out.lines, written };
    return { status: out.ok ? 200 : 422, json: { ok: out.ok, written, lines: out.lines } };
  } finally {
    running = false;
    // Let the reply go out first, then tell listeners (the page reloads to pick up the brand file).
    if (ran) setTimeout(() => doneListeners.forEach((cb) => cb()), 300);
  }
}

/** Runs `node scripts/demo-apply.mjs <name>` in the project folder. Never rejects: a failure is a result. */
export const realRun =
  (root: string) =>
  (name: string): Promise<{ ok: boolean; lines: string[] }> =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join("scripts", "demo-apply.mjs"), name], { cwd: root });
      const lines: string[] = [];
      const take = (b: Buffer) => lines.push(...b.toString("utf8").split("\n").filter((l) => l.trim()));
      child.stdout.on("data", take);
      child.stderr.on("data", take);
      const timer = setTimeout(() => {
        child.kill();
        lines.push("The build took too long and was stopped.");
      }, RUN_TIMEOUT_MS);
      child.on("error", (e) => {
        clearTimeout(timer);
        resolve({ ok: false, lines: [e.message] });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ ok: code === 0, lines });
      });
    });
