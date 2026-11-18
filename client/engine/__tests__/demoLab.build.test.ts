import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer, resolveConfig } from "vite";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { resolveBrand } from "../../brand/resolve";
import { demoLabExportPlugin } from "../../../scripts/demoLabExport";
import { APPLY_ROUTE, gitProblems, handleBuild, type ApplyEnv, type ApplyModules, type GitRunner } from "../../../scripts/demoLabApply";
import { ghostCards, validateDemoRequest } from "@/workflows/catalog/request";
import { buildPrompt } from "@/workflows/catalog/prompt";

/**
 * "Build it now": export, then apply. It refuses on main, with a dirty brand file, with new cards, from another machine,
 * and while another build runs. It never exists in a production build.
 */

const REQUEST = {
  version: 1,
  client: "mirum",
  slug: "abv-apa",
  title: "ABV with APA",
  workflow: "iassist",
  intake: "erx",
  apps: ["crm"],
  forks: ["bi"],
  cards: [{ kind: "block", moduleId: "enrollment" }],
  demos: [{ id: "a", label: "A", choices: { bi: "medical_pa_required" } }],
  brand: { name: "M", drug: "D", documents: [] },
  winTheme: "One handoff",
  openQuestions: [],
};
const GHOST = { kind: "ghost", name: "Thing", sees: "A new screen", app: "crm", lane: "hcp" };

const modules: ApplyModules = { validate: validateDemoRequest, buildPrompt, ghostCount: (r) => ghostCards(r).length };

/** A fake git: the branch, and what `git status` says about the brand file. */
const git = (branch: string, dirty = ""): GitRunner => (args) => {
  if (args[0] === "rev-parse") return { status: 0, stdout: `${branch}\n` };
  if (args[0] === "status") return { status: 0, stdout: dirty };
  return { status: 1, stdout: "" };
};

let root: string;
let ran: string[];
const env = (over: Partial<ApplyEnv> = {}): ApplyEnv => ({
  git: git("demo-lab-x"),
  run: async (name) => {
    ran.push(name);
    return { ok: true, lines: [`Wrote brands/mirum/brand.json. The brand test passes.`] };
  },
  ...over,
});
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-lab-build-"));
  ran = [];
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const call = (body: unknown, e: ApplyEnv = env(), extra: Partial<Parameters<typeof handleBuild>[1]> = {}) =>
  handleBuild(root, { method: "POST", remoteAddress: "127.0.0.1", body: JSON.stringify(body), ...extra }, modules, e);
const exported = () => (fs.existsSync(path.join(root, "docs")) ? fs.readdirSync(path.join(root, "docs"), { recursive: true }).map(String) : []);

describe("gitProblems", () => {
  it("passes on a feature branch with a clean brand file", () => expect(gitProblems("mirum", git("demo-lab-x"))).toEqual([]));
  it("refuses main and master", () => {
    expect(gitProblems("mirum", git("main"))[0]).toMatch(/on main/);
    expect(gitProblems("mirum", git("master"))[0]).toMatch(/on master/);
  });
  it("refuses a detached HEAD", () => expect(gitProblems("mirum", git("HEAD"))[0]).toMatch(/not on a branch/));
  it("refuses a brand file with uncommitted changes, and names it", () => {
    expect(gitProblems("mirum", git("x", " M brands/mirum/brand.json\n"))[0]).toMatch(/brands\/mirum\/brand\.json has uncommitted changes/);
  });
  it("refuses outside a git checkout", () => expect(gitProblems("mirum", () => ({ status: 128, stdout: "" }))[0]).toMatch(/not a git checkout/));
});

describe("handleBuild", () => {
  it("exports the files, then applies <client>/<slug>", async () => {
    const r = await call(REQUEST);
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
    expect(r.json.written).toEqual(["docs/demos/mirum/abv-apa.request.json", "docs/demos/mirum/abv-apa.prompt.md"]);
    expect(ran).toEqual(["mirum/abv-apa"]);
  });

  it("reports a failed apply, and the files it exported stay", async () => {
    const r = await call(REQUEST, env({ run: async () => ({ ok: false, lines: ["The brand test failed, so the brand file was put back as it was."] }) }));
    expect(r.status).toBe(422);
    expect(r.json.ok).toBe(false);
    expect(r.json.lines?.[0]).toMatch(/put back/);
  });

  it("refuses a request with new cards, and writes and runs nothing", async () => {
    const r = await call({ ...REQUEST, cards: [...REQUEST.cards, GHOST] });
    expect(r.status).toBe(422);
    expect(r.json.problems?.[0]).toMatch(/1 new card\. A script cannot build those/);
    expect(exported()).toEqual([]);
    expect(ran).toEqual([]);
  });

  it("refuses on main, or a dirty brand file, and writes and runs nothing", async () => {
    for (const e of [env({ git: git("main") }), env({ git: git("x", " M brands/mirum/brand.json") })]) {
      const r = await call(REQUEST, e);
      expect(r.status).toBe(409);
    }
    expect(exported()).toEqual([]);
    expect(ran).toEqual([]);
  });

  it("refuses an invalid request, a method other than POST, another machine, and a body that is not JSON", async () => {
    expect((await call({ ...REQUEST, winTheme: "" })).status).toBe(422);
    expect((await call(REQUEST, env(), { method: "GET" })).status).toBe(405);
    expect((await call(REQUEST, env(), { remoteAddress: "10.0.0.5" })).status).toBe(403);
    expect((await handleBuild(root, { method: "POST", remoteAddress: "::1", body: "{" }, modules, env())).status).toBe(400);
    expect(ran).toEqual([]);
  });

  it("refuses a second build while one is running", async () => {
    let release!: () => void;
    const slow = env({ run: () => new Promise((resolve) => { release = () => resolve({ ok: true, lines: [] }); }) });
    const first = call(REQUEST, slow);
    await new Promise((r) => setTimeout(r, 10));
    const second = await call(REQUEST);
    expect(second.status).toBe(409);
    expect(second.json.problems?.[0]).toMatch(/Another build is running/);
    release();
    expect((await first).status).toBe(200);
  });
});

describe("the dev server route and the production build", () => {
  it("refuses outside a git checkout and writes nothing, through a real dev server", async () => {
    const server = await createServer({
      configFile: false,
      root: process.cwd(),
      logLevel: "silent",
      appType: "custom",
      // The app inlines the brand at build time. This bare server has no config, so it gets one the same way.
      define: { __BRAND__: JSON.stringify(resolveBrand(path.resolve(process.cwd(), "brands"), "assistivan")) },
      resolve: { alias: { "@": path.resolve(process.cwd(), "client") } },
      server: { middlewareMode: true },
      plugins: [demoLabExportPlugin(root)],
    });
    const srv = http.createServer(server.middlewares);
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    try {
      const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}${APPLY_ROUTE}`;
      const res = await fetch(url, { method: "POST", body: JSON.stringify(REQUEST) });
      const body = await res.json();
      expect(res.status, JSON.stringify(body)).toBe(409);
      expect(body.problems[0]).toMatch(/not a git checkout/);
      expect(exported()).toEqual([]);
    } finally {
      await new Promise((resolve) => srv.close(resolve));
      await server.close();
    }
  }, 30000);

  it("has no build route in a production build", async () => {
    const built = await resolveConfig({ configFile: path.resolve(process.cwd(), "vite.config.ts"), logLevel: "silent" }, "build");
    expect(built.plugins.map((p) => p.name)).not.toContain("demo-lab-export");
  }, 30000);
});
