/**
 * Typecheck ratchet.
 *
 * The codebase has known type errors from the pre-refactor layout (portal
 * alias resolution, duplicated UI kits). This script lets that count go down
 * but never up:
 *
 *   pnpm typecheck:ratchet            fail if errors exceed .typecheck-baseline
 *   pnpm typecheck:ratchet --update   write the current count as the new baseline
 *
 * When the count reaches 0, delete this script and make `pnpm typecheck` the gate.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, ".typecheck-baseline");

const result = spawnSync("pnpm", ["exec", "tsc", "--noEmit", "-p", "tsconfig.json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
if (result.error) {
  console.error(`Could not run tsc: ${result.error.message}`);
  process.exit(2);
}

const count = (output.match(/error TS\d+/g) ?? []).length;

if (process.argv.includes("--update")) {
  fs.writeFileSync(baselineFile, `${count}\n`);
  console.log(`Baseline set to ${count} type errors.`);
  process.exit(0);
}

const baseline = Number.parseInt(fs.readFileSync(baselineFile, "utf8"), 10);
if (count > baseline) {
  console.error(output.split("\n").filter((l) => /error TS/.test(l)).slice(0, 40).join("\n"));
  console.error(`\nType errors went up: ${count} (baseline ${baseline}). Fix the new errors.`);
  process.exit(1);
}
if (count < baseline) {
  console.log(`Type errors fell to ${count} (baseline ${baseline}). Run "pnpm typecheck:ratchet --update" and commit the new baseline.`);
} else {
  console.log(`Type errors at baseline: ${count}.`);
}
