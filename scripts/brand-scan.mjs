#!/usr/bin/env node
/**
 * pnpm brand:scan <url>
 *
 * Reads a client's public page and its stylesheets, ranks the brand colors by the role they play, and prints a proposed
 * `program.colors` block for brands/<slug>/brand.json. The block is a starting point with its evidence beside it.
 * Check it in the Demo Lab (/demo-lab) before it goes in the file. The logo's own colors are not read: the scan sees CSS
 * and meta tags, not images, so compare the pick with the logo by eye.
 *
 * A site that blocks scripts answers 403. Open it in a browser, choose File > Save Page As (web page, complete), and scan
 * the saved file: `pnpm brand:scan page.html --source https://client-site.example`. Linked stylesheets are read from disk.
 *
 * stdout is the JSON block only, so `pnpm brand:scan <url> > colors.json` works. The evidence goes to stderr.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inlineStyles, propose, stylesheetUrls } from "./lib/brandScan.mjs";

const MAX_BYTES = 2_000_000;
const MAX_SHEETS = 8;
const TIMEOUT_MS = 15_000;

async function get(url) {
  if (url.startsWith("file:")) {
    const text = await readFile(fileURLToPath(url), "utf8");
    return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "arx-demo-brand-scan/1.0" }, redirect: "follow" });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`${url} answered ${res.status}. The site blocks scripts. Save the page from a browser and scan the file: pnpm brand:scan page.html --source ${url}`);
  }
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const text = await res.text();
  return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
}

const [target] = process.argv.slice(2);
const sourceFlag = process.argv.indexOf("--source");
const source = sourceFlag > 0 ? process.argv[sourceFlag + 1] : undefined;
const isUrl = /^https?:\/\//i.test(target ?? "");
if (!target || (!isUrl && !source)) {
  console.error("Usage: pnpm brand:scan <https://client-site.example>\n       pnpm brand:scan <saved-page.html> --source <https://client-site.example>");
  process.exit(1);
}

// A saved page resolves its stylesheets against its own folder. The proposal names the client's site as the source.
const url = isUrl ? target : pathToFileURL(target).href;
const html = await get(url);
const sheets = [];
for (const href of stylesheetUrls(html, url).slice(0, MAX_SHEETS)) {
  if (!/^(https?|file):/i.test(href)) continue;
  try {
    sheets.push(await get(href));
  } catch (err) {
    console.error(`skipped ${href}: ${err.message}`);
  }
}
const css = [...inlineStyles(html), ...sheets];
const { colors, ranked } = propose({ html, css, url: source ?? url });

console.error(`Scanned ${url}: ${sheets.length} stylesheet(s) and the page's own styles.\n`);
if (!colors) {
  console.error("No brand color found. The site may build its styles in JavaScript. Set the colors by hand in the Demo Lab.");
  process.exit(2);
}
for (const [i, r] of ranked.entries()) {
  console.error(`${String(i + 1).padStart(2)}. ${r.hex}  score ${r.score.toFixed(1)}  ${r.evidence.slice(0, 3).join("; ")}`);
}
console.error("\nProposed colors. Open /demo-lab, paste these in, and compare with the logo before saving.\n");
console.log(JSON.stringify(colors, null, 2));
