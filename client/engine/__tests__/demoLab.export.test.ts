import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createServer, resolveConfig } from "vite";
import { demoLabExportPlugin, handleExport, writeDemoRequest, EXPORT_ROUTE, type ExportModules } from "../../../scripts/demoLabExport";
import { validateDemoRequest, type DemoRequest } from "@/workflows/catalog/request";
import { buildPrompt } from "@/workflows/catalog/prompt";

/**
 * The export endpoint writes under docs/demos/ only, rejects any other path, and does not exist in a production build.
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

const modules: ExportModules = { validate: validateDemoRequest, buildPrompt };
const asRequest = (over: Record<string, unknown> = {}) => ({ ...REQUEST, ...over }) as unknown as DemoRequest;

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "demo-lab-"));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const files = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map(String).sort() : []);
const call = (over: Record<string, unknown> = {}, extra: Partial<Parameters<typeof handleExport>[1]> = {}) =>
  handleExport(root, { method: "POST", remoteAddress: "127.0.0.1", body: JSON.stringify({ ...REQUEST, ...over }), ...extra }, modules);

describe("writeDemoRequest", () => {
  it("writes the request and the prompt under docs/demos/<client>/", () => {
    const written = writeDemoRequest(root, asRequest(), buildPrompt);
    expect(written).toEqual(["docs/demos/mirum/abv-apa.request.json", "docs/demos/mirum/abv-apa.prompt.md"]);
    expect(files(root)).toEqual(["docs", "docs/demos", "docs/demos/mirum", "docs/demos/mirum/abv-apa.prompt.md", "docs/demos/mirum/abv-apa.request.json"]);
    expect(JSON.parse(fs.readFileSync(path.join(root, written[0]), "utf8")).slug).toBe("abv-apa");
    expect(fs.readFileSync(path.join(root, written[1]), "utf8")).toContain("docs/demos/mirum/abv-apa.request.json");
  });

  it("rejects a client or slug that would leave docs/demos/, and writes nothing", () => {
    for (const bad of ["..", "../x", "a/../../b", "/etc", "a\\b", ""]) {
      expect(() => writeDemoRequest(root, asRequest({ client: bad }), buildPrompt), bad).toThrow();
      expect(() => writeDemoRequest(root, asRequest({ slug: bad }), buildPrompt), bad).toThrow();
    }
    expect(files(root)).toEqual([]);
  });

  it("rejects a symlink inside docs/demos that leads out of it", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
    try {
      fs.mkdirSync(path.join(root, "docs", "demos"), { recursive: true });
      fs.symlinkSync(outside, path.join(root, "docs", "demos", "mirum"));
      expect(() => writeDemoRequest(root, asRequest(), buildPrompt)).toThrow("under docs/demos");
      expect(files(outside)).toEqual([]);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("handleExport", () => {
  it("writes a valid request", () => {
    const r = call();
    expect(r.status).toBe(200);
    expect(r.json.written).toEqual(["docs/demos/mirum/abv-apa.request.json", "docs/demos/mirum/abv-apa.prompt.md"]);
  });

  it("rejects an invalid request with its problems, and writes nothing", () => {
    const r = call({ winTheme: "" });
    expect(r.status).toBe(422);
    expect(r.json.problems).toContain("win theme is required");
    expect(files(root)).toEqual([]);
  });

  it("rejects a request that names a path, and a client that climbs out", () => {
    expect(call({ path: "../../x" }).status).toBe(422);
    expect(call({ client: "../../etc" }).status).toBe(422);
    expect(files(root)).toEqual([]);
  });

  it("rejects a method other than POST, a caller that is not this machine, and a body that is not JSON", () => {
    expect(call({}, { method: "GET" }).status).toBe(405);
    expect(call({}, { remoteAddress: "10.0.0.5" }).status).toBe(403);
    expect(call({}, { remoteAddress: undefined }).status).toBe(403);
    expect(handleExport(root, { method: "POST", remoteAddress: "::1", body: "{" }, modules).status).toBe(400);
    expect(files(root)).toEqual([]);
  });
});

describe("the dev server route", () => {
  it("writes through a real Vite dev server, and rejects a path", async () => {
    const server = await createServer({
      configFile: false,
      root: process.cwd(),
      logLevel: "silent",
      appType: "custom",
      resolve: { alias: { "@": path.resolve(process.cwd(), "client") } },
      server: { middlewareMode: true },
      plugins: [demoLabExportPlugin(root)],
    });
    const http1 = http.createServer(server.middlewares);
    await new Promise<void>((resolve) => http1.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(http1.address() as AddressInfo).port}${EXPORT_ROUTE}`;
    try {
      const post = (body: unknown) => fetch(url, { method: "POST", body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }));
      const ok = await post(REQUEST);
      expect(ok.status).toBe(200);
      expect(files(path.join(root, "docs", "demos", "mirum"))).toEqual(["abv-apa.prompt.md", "abv-apa.request.json"]);
      const bad = await post({ ...REQUEST, client: "../escape" });
      expect(bad.status).toBe(422);
      expect(files(root).some((f) => f.includes("escape"))).toBe(false);
    } finally {
      await new Promise((resolve) => http1.close(resolve));
      await server.close();
    }
  }, 30000);
});

describe("production build", () => {
  it("has no export plugin, and the dev server has one", async () => {
    const built = await resolveConfig({ configFile: path.resolve(process.cwd(), "vite.config.ts"), logLevel: "silent" }, "build");
    expect(built.plugins.map((p) => p.name)).not.toContain("demo-lab-export");
    const dev = await resolveConfig({ configFile: path.resolve(process.cwd(), "vite.config.ts"), logLevel: "silent" }, "serve");
    expect(dev.plugins.map((p) => p.name)).toContain("demo-lab-export");
  }, 30000);
});
