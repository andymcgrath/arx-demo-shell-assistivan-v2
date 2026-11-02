#!/usr/bin/env node
/**
 * pnpm brand:scan <url>
 *
 * Reads a client's public page and its stylesheets, ranks the brand colors by the role they play, and prints a proposed
 * `program.colors` block for brands/<slug>/brand.json. The block is a starting point with its evidence beside it.
 * Check it in the Brand Lab (/brand-lab) before it goes in the file. The logo's own colors are not read: the scan sees CSS
 * and meta tags, not images, so compare the pick with the logo by eye.
 *
 * stdout is the JSON block only, so `pnpm brand:scan <url> > colors.json` works. The evidence goes to stderr.
 */
import { inlineStyles, propose, stylesheetUrls } from "./lib/brandScan.mjs";

const MAX_BYTES = 2_000_000;
const MAX_SHEETS = 8;
const TIMEOUT_MS = 15_000;

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "arx-demo-brand-scan/1.0" }, redirect: "follow" });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const text = await res.text();
  return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
}

const url = process.argv[2];
if (!url || !/^https?:\/\//i.test(url)) {
  console.error("Usage: pnpm brand:scan <https://client-site.example>");
  process.exit(1);
}

const html = await get(url);
const sheets = [];
for (const href of stylesheetUrls(html, url).slice(0, MAX_SHEETS)) {
  if (!/^https?:/i.test(href)) continue;
  try {
    sheets.push(await get(href));
  } catch (err) {
    console.error(`skipped ${href}: ${err.message}`);
  }
}
const css = [...inlineStyles(html), ...sheets];
const { colors, ranked } = propose({ html, css, url });

console.error(`Scanned ${url}: ${sheets.length} stylesheet(s) and the page's own styles.\n`);
if (!colors) {
  console.error("No brand color found. The site may build its styles in JavaScript. Set the colors by hand in the Brand Lab.");
  process.exit(2);
}
for (const [i, r] of ranked.entries()) {
  console.error(`${String(i + 1).padStart(2)}. ${r.hex}  score ${r.score.toFixed(1)}  ${r.evidence.slice(0, 3).join("; ")}`);
}
console.error("\nProposed colors. Open /brand-lab, paste these in, and compare with the logo before saving.\n");
console.log(JSON.stringify(colors, null, 2));
