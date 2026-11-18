/**
 * The brand file's layout, so a build's diff is only its own change.
 *
 * The brand files are hand-kept and run through Prettier: two-space indent, and an array or object stays on one line when
 * it fits in 80 columns. `JSON.stringify(value, null, 2)` alone puts every item on its own line, which rewrote untouched
 * parts of the file. So a build edits only the `demos` list in the text and leaves every other byte alone.
 */

const WIDTH = 80;
const isPlain = (v: unknown) => v === null || typeof v !== "object";

/** One line when it fits, else one item per line. `lead` is the width of what precedes the value on its line. */
function write(value: unknown, indent: string, lead: number): string {
  if (isPlain(value)) return JSON.stringify(value);
  const defined = (o: Record<string, unknown>) => Object.entries(o).filter(([, v]) => v !== undefined);
  const flat = (v: unknown): string | undefined => {
    if (Array.isArray(v)) {
      const parts = v.map(flat);
      return parts.every((p) => p !== undefined) ? `[${parts.join(", ")}]` : undefined;
    }
    if (v && typeof v === "object") {
      const entries = defined(v as Record<string, unknown>);
      const parts = entries.map(([k, x]) => {
        const f = flat(x);
        return f === undefined ? undefined : `${JSON.stringify(k)}: ${f}`;
      });
      return parts.every((p) => p !== undefined) ? (parts.length ? `{ ${parts.join(", ")} }` : "{}") : undefined;
    }
    return JSON.stringify(v);
  };
  const one = flat(value);
  // The trailing comma counts toward the width.
  if (one !== undefined && indent.length + lead + one.length + 1 <= WIDTH && (Array.isArray(value) || isPlain(value) || !hasNested(value))) return one;
  const inner = `${indent}  `;
  if (Array.isArray(value)) return `[\n${value.map((v) => `${inner}${write(v, inner, 0)}`).join(",\n")}\n${indent}]`;
  const entries = defined(value as Record<string, unknown>);
  const body = entries.map(([k, v]) => {
    const key = `${JSON.stringify(k)}: `;
    return `${inner}${key}${write(v, inner, key.length)}`;
  });
  return `{\n${body.join(",\n")}\n${indent}}`;
}

const hasNested = (v: unknown) => Object.values(v as Record<string, unknown>).some((x) => x && typeof x === "object");

/** A whole brand file, for one that does not exist yet. */
export const formatBrandJson = (value: unknown): string => `${write(value, "", 0)}\n`;

/** The text span of the top-level `"demos"` array, or undefined when there is none. */
function demosSpan(text: string): { start: number; end: number } | undefined {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      if (depth === 1 && text.slice(i, j + 1) === '"demos"') {
        const open = text.indexOf("[", j);
        let d = 0;
        for (let k = open; k < text.length; k++) {
          const ch = text[k];
          if (ch === '"') {
            k++;
            while (text[k] !== '"') k += text[k] === "\\" ? 2 : 1;
          } else if (ch === "[") d++;
          else if (ch === "]" && --d === 0) return { start: open, end: k + 1 };
        }
        return undefined;
      }
      i = j;
    } else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth--;
  }
  return undefined;
}

/** The text span of each top-level element of the array that opens at `open`. */
function elementSpans(text: string, open: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let depth = 0;
  let start = -1;
  for (let k = open; k < text.length; k++) {
    const ch = text[k];
    if (ch === '"') {
      if (start < 0) start = k;
      k++;
      while (text[k] !== '"') k += text[k] === "\\" ? 2 : 1;
    } else if (ch === "[" || ch === "{") {
      if (depth === 1 && start < 0) start = k;
      depth++;
    } else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        if (start >= 0) out.push({ start, end: lastNonSpace(text, k) });
        return out;
      }
    } else if (ch === "," && depth === 1) {
      if (start >= 0) out.push({ start, end: lastNonSpace(text, k) });
      start = -1;
    } else if (depth === 1 && start < 0 && !/\s/.test(ch)) start = k;
  }
  return out;
}
const lastNonSpace = (text: string, before: number) => {
  let e = before;
  while (/\s/.test(text[e - 1])) e--;
  return e;
};

/**
 * The existing brand file's text with only its `demos` list changed. A demo that is the same as before keeps its exact
 * text. A new or changed one is written in the file's layout. Returns undefined when that is not enough: no demos list to
 * edit, or something besides `demos` differs from `existing`. The caller then writes the whole file.
 */
export function replaceDemos(before: string, existing: Record<string, unknown>, next: Record<string, unknown>): string | undefined {
  const rest = (b: Record<string, unknown>) => JSON.stringify({ ...b, demos: 0 });
  if (rest(existing) !== rest(next)) return undefined;
  const span = demosSpan(before);
  if (!span || !Array.isArray(existing.demos) || !Array.isArray(next.demos)) return undefined;
  const old = elementSpans(before, span.start);
  if (old.length !== existing.demos.length) return undefined;
  const kept = new Map<string, string>();
  existing.demos.forEach((d, i) => kept.set(JSON.stringify(d), before.slice(old[i].start, old[i].end)));
  const items = next.demos.map((d) => kept.get(JSON.stringify(d)) ?? write(d, "    ", 0));
  const body = items.length ? `[\n${items.map((t) => `    ${t}`).join(",\n")}\n  ]` : "[]";
  return `${before.slice(0, span.start)}${body}${before.slice(span.end)}`;
}
