import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { DemoRequest, RequestResult } from "../client/workflows/catalog/request";

/**
 * The Demo Lab's export endpoint. Dev only: the plugin applies to `vite serve`, so a build has no route and no code for
 * it. It writes two files and nothing else:
 *
 *   docs/demos/<client>/<slug>.request.json
 *   docs/demos/<client>/<slug>.prompt.md
 *
 * The path comes from `client` and `slug` in the request. Both must be plain words joined by hyphens, and the final path
 * must stay under `docs/demos/`. A request cannot name a path. Only the machine itself (loopback) may call it.
 */

export const EXPORT_ROUTE = "/__demo-lab/export";
const MAX_BODY = 1_000_000;
/** Same rule as `SAFE_SLUG` in the request validator. Repeated here so the writer guards itself. */
const SAFE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ExportModules {
  validate: (input: unknown) => RequestResult;
  buildPrompt: (request: DemoRequest, requestPath: string) => string;
}

export interface ExportReply {
  status: number;
  json: { ok: boolean; written?: string[]; problems?: string[] };
}

/** Writes the two files under `<root>/docs/demos/<client>/`. Throws when the path would leave that folder. */
export function writeDemoRequest(root: string, request: DemoRequest, buildPrompt: ExportModules["buildPrompt"]): string[] {
  if (!SAFE.test(request.client) || !SAFE.test(request.slug)) throw new Error("client and slug must be lowercase words joined by hyphens");
  const demosRoot = path.resolve(root, "docs", "demos");
  const dir = path.resolve(demosRoot, request.client);
  const inside = (parent: string, child: string) => {
    const rel = path.relative(parent, child);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  };
  if (!inside(demosRoot, dir)) throw new Error("the path must stay under docs/demos/");
  fs.mkdirSync(dir, { recursive: true });
  // A symlink inside docs/demos must not lead out of it.
  if (!inside(fs.realpathSync(demosRoot), fs.realpathSync(dir))) throw new Error("the path must stay under docs/demos/");

  const requestFile = path.join(dir, `${request.slug}.request.json`);
  const promptFile = path.join(dir, `${request.slug}.prompt.md`);
  const relative = (f: string) => path.relative(root, f).split(path.sep).join("/");
  fs.writeFileSync(requestFile, `${JSON.stringify(request, null, 2)}\n`);
  fs.writeFileSync(promptFile, buildPrompt(request, relative(requestFile)));
  return [relative(requestFile), relative(promptFile)];
}

const isLoopback = (addr: string | undefined) => addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";

/** The endpoint's logic, apart from the HTTP plumbing, so a test can drive it. */
export function handleExport(root: string, call: { method?: string; remoteAddress?: string; body: string }, modules: ExportModules): ExportReply {
  if (call.method !== "POST") return { status: 405, json: { ok: false, problems: ["use POST"] } };
  if (!isLoopback(call.remoteAddress)) return { status: 403, json: { ok: false, problems: ["only this machine may export"] } };
  let input: unknown;
  try {
    input = JSON.parse(call.body);
  } catch {
    return { status: 400, json: { ok: false, problems: ["the body is not JSON"] } };
  }
  const result = modules.validate(input);
  if (!result.ok) return { status: 422, json: { ok: false, problems: result.problems } };
  try {
    return { status: 200, json: { ok: true, written: writeDemoRequest(root, result.request, modules.buildPrompt) } };
  } catch (e) {
    return { status: 400, json: { ok: false, problems: [(e as Error).message] } };
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("the body is too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Dev only. `apply: "serve"` keeps it out of `vite build`. `root` is the project folder the files go under. */
export function demoLabExportPlugin(root: string): Plugin {
  return {
    name: "demo-lab-export",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(EXPORT_ROUTE, async (req: IncomingMessage, res: ServerResponse) => {
        const send = (r: ExportReply) => {
          res.statusCode = r.status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(r.json));
        };
        try {
          const body = req.method === "POST" ? await readBody(req) : "";
          // Loaded through Vite so the validator can use the "@/" alias. This code exists only in the dev server.
          const [{ validateDemoRequest }, { buildPrompt }] = await Promise.all([
            server.ssrLoadModule("/client/workflows/catalog/request.ts"),
            server.ssrLoadModule("/client/workflows/catalog/prompt.ts"),
          ]);
          send(handleExport(root, { method: req.method, remoteAddress: req.socket.remoteAddress, body }, { validate: validateDemoRequest, buildPrompt }));
        } catch (e) {
          send({ status: 500, json: { ok: false, problems: [(e as Error).message] } });
        }
      });
    },
  };
}
