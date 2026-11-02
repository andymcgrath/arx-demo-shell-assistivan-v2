/**
 * brandScan: finds a client's brand colors in the HTML and CSS of their public site, ranks them by the role they play, and
 * proposes a `program.colors` block with the evidence for each pick. Pure functions, no network, so tests feed them fixtures.
 * scripts/brand-scan.mjs fetches a URL and calls these.
 *
 * Scripts do not import app code, so the small color math (hex to OKLab) is repeated here.
 */

const NEUTRAL_CHROMA = 0.04;
const BRAND_VARIABLE = /(brand|primary|accent|secondary|main|cta|button|btn|theme|highlight)/i;
const BUTTON_SELECTOR = /(\bbutton\b|\.btn|\.button|\.cta|\[type=["']?submit|\.wp-block-button|\.elementor-button)/i;
const LINK_SELECTOR = /(^|[\s,>])a(:hover)?([\s,{.]|$)/i;
const HEADER_SELECTOR = /(\bheader\b|\bnav\b|\.navbar|\.site-header|\.masthead)/i;

/** A selector for a state (hover, focus, disabled) or a status (danger, warning) says nothing about the brand. */
const NOT_BRAND_SELECTOR = /(:hover|:focus|:active|:disabled|\.active|\.focus|\.disabled|\[disabled\]|danger|warning|error|alert|info\b|default)/i;

/** Colors that come with common CSS frameworks. A site that still shows one has not set its own there. */
export const STOCK_COLORS = new Set([
  // Bootstrap 3
  "#337ab7", "#286090", "#204d74", "#2e6da4", "#23527c", "#5cb85c", "#449d44", "#398439", "#5bc0de", "#31b0d5", "#269abc",
  "#f0ad4e", "#ec971f", "#d58512", "#d9534f", "#c9302c", "#ac2925", "#c12e2a",
  // Bootstrap 5
  "#0d6efd", "#0a58ca", "#198754", "#dc3545", "#ffc107", "#0dcaf0", "#6c757d",
]);

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const RGB = /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+%?)?\s*\)/gi;
const HSL = /hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+[\d.]+%?)?\s*\)/gi;

const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** Every color literal in `text`, as lowercase #rrggbb. Fully transparent and 8-digit alpha colors keep their rgb. */
export function colorsIn(text) {
  const out = [];
  for (const m of text.matchAll(HEX)) {
    let h = m[0].slice(1).toLowerCase();
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    out.push("#" + h.slice(0, 6));
  }
  for (const m of text.matchAll(RGB)) out.push("#" + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]));
  for (const m of text.matchAll(HSL)) {
    const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min((n + h / 30) % 12 - 3, 9 - ((n + h / 30) % 12), 1));
    out.push("#" + hex2(f(0) * 255) + hex2(f(8) * 255) + hex2(f(4) * 255));
  }
  return out;
}

const toLinear = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** OKLab of a #rrggbb color: [L, a, b]. */
export function oklab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export const distance = (a, b) => {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
};

/** White, black, and grays carry no brand. */
export const isNeutral = (hex) => {
  const [, a, b] = oklab(hex);
  return Math.hypot(a, b) < NEUTRAL_CHROMA;
};

/** Splits CSS into [selector, body] rules. Handles one level of @media nesting by flattening. */
export function rules(css) {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  for (const m of flat.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)) out.push([m[1].trim(), m[2]]);
  return out;
}

/**
 * Evidence: each color the site uses, with where and how. `weight` is how strongly the place says "this is the brand".
 */
export function evidenceFrom({ html = "", css = [] }) {
  const found = [];
  const add = (hex, role, weight, where) => found.push({ hex, role, weight, where });

  for (const m of html.matchAll(/<meta[^>]+name=["']theme-color["'][^>]*>/gi)) {
    for (const hex of colorsIn(m[0])) add(hex, "theme-color", 10, "meta theme-color");
  }
  for (const m of html.matchAll(/<meta[^>]+name=["']msapplication-TileColor["'][^>]*>/gi)) {
    for (const hex of colorsIn(m[0])) add(hex, "tile-color", 6, "meta TileColor");
  }

  const allText = [html, ...css].join("\n");
  const counts = new Map();
  for (const hex of colorsIn(allText)) counts.set(hex, (counts.get(hex) ?? 0) + 1);

  for (const sheet of css) {
    for (const m of sheet.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]/g)) {
      if (!BRAND_VARIABLE.test(m[1])) continue;
      for (const hex of colorsIn(m[2])) add(hex, "variable", 8, m[1]);
    }
    for (const [selector, body] of rules(sheet)) {
      if (NOT_BRAND_SELECTOR.test(selector)) continue;
      const kind = BUTTON_SELECTOR.test(selector) ? "button" : HEADER_SELECTOR.test(selector) ? "header" : LINK_SELECTOR.test(selector) ? "link" : null;
      if (!kind) continue;
      for (const m of body.matchAll(/(background(?:-color)?|color|border-color)\s*:\s*([^;]+)/gi)) {
        const prop = m[1].toLowerCase();
        for (const hex of colorsIn(m[2])) {
          if (kind === "button" && prop.startsWith("background")) add(hex, "button-fill", 8, selector.slice(0, 50));
          else if (kind === "button" && prop === "color") add(hex, "button-text", 6, selector.slice(0, 50));
          else if (kind === "link" && prop === "color") add(hex, "link", 5, selector.slice(0, 50));
          else if (kind === "header" && prop.startsWith("background")) add(hex, "header", 3, selector.slice(0, 50));
        }
      }
    }
  }
  return { found, counts };
}

/** Merges colors closer than `within`, keeping the most-used spelling. */
function cluster(entries, within = 2) {
  const groups = [];
  for (const e of entries.sort((a, b) => b.score - a.score)) {
    const g = groups.find((g) => distance(g.hex, e.hex) < within);
    if (g) {
      g.score += e.score;
      g.evidence.push(...e.evidence);
      for (const r of e.roles ?? []) g.roles.add(r);
    } else groups.push({ hex: e.hex, score: e.score, evidence: [...e.evidence], roles: new Set(e.roles ?? []) });
  }
  return groups.sort((a, b) => b.score - a.score);
}

/**
 * Ranks the chromatic colors and proposes `colors`: brand (the highest-ranked color), action (the top button fill when it
 * is a different color), and accent (the next distinct color). Always `fidelity: "exact"`, with `source` set, because
 * the point is to match the client.
 */
export function propose({ html, css, url }) {
  const { found, counts } = evidenceFrom({ html, css });
  const byHex = new Map();
  for (const f of found) {
    if (isNeutral(f.hex) || STOCK_COLORS.has(f.hex)) continue;
    const e = byHex.get(f.hex) ?? { hex: f.hex, score: 0, evidence: [], roles: new Set() };
    e.roles.add(f.role);
    // A button fill says "action" more than "brand", so it counts for less here. The action pick below ranks fills on their own.
    e.score += f.role === "button-fill" ? 3 : f.weight;
    e.evidence.push(`${f.role}: ${f.where}`);
    byHex.set(f.hex, e);
  }
  // Frequency breaks ties and surfaces colors the site uses a lot without naming a role.
  for (const [hex, n] of counts) {
    if (isNeutral(hex) || STOCK_COLORS.has(hex)) continue;
    // A color used once or twice with no role is noise (a hover state, an icon). A color used often is worth a look.
    if (n < 3 && !byHex.has(hex)) continue;
    const e = byHex.get(hex) ?? { hex, score: 0, evidence: [], roles: new Set() };
    e.score += Math.log2(1 + n);
    if (n > 1) e.evidence.push(`used ${n} times`);
    byHex.set(hex, e);
  }
  const ranked = cluster([...byHex.values()]);
  const brand = ranked[0];
  const buttonFills = cluster(
    found.filter((f) => f.role === "button-fill" && !isNeutral(f.hex) && !STOCK_COLORS.has(f.hex)).map((f) => ({ hex: f.hex, score: f.weight, evidence: [f.where] })),
  );
  const action = buttonFills[0] && distance(buttonFills[0].hex, brand?.hex ?? "#000000") >= 3 ? buttonFills[0] : undefined;
  // An accent needs a role that names a brand color, and about half the brand's weight. A color that only shows up as button text, by count, or in one corner of the page is not one.
  const ACCENT_ROLES = ["variable", "theme-color", "tile-color", "header", "link"];
  const accent = ranked.find((g) => g !== brand && g.score >= (brand?.score ?? 0) * 0.5 && ACCENT_ROLES.some((r) => g.roles.has(r)) && distance(g.hex, brand.hex) >= 8 && (!action || distance(g.hex, action.hex) >= 8));
  const colors = brand
    ? { brand: brand.hex, ...(action ? { action: action.hex } : {}), ...(accent ? { accent: accent.hex } : {}), fidelity: "exact", source: url }
    : null;
  return { colors, ranked: ranked.slice(0, 8) };
}

/** Pulls stylesheet URLs out of HTML, resolved against the page URL. */
export function stylesheetUrls(html, pageUrl) {
  const out = [];
  for (const m of html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)) {
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      out.push(new URL(href, pageUrl).href);
    } catch {
      /* skip a malformed href */
    }
  }
  return [...new Set(out)];
}

/** The text of inline <style> blocks. */
export const inlineStyles = (html) => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
