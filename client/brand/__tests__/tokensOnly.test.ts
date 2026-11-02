import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every color on a patient screen is a brand token (`--arx-*`, `bg-arx-action`, `text-arx-on-primary`). A raw Tailwind
 * palette class, a hex or rgb literal, or a color word sits outside the brand, so it looks the same for every client
 * and can differ from one screen to the next. This fails on any of them. Neutrals are tokens too (`arx-white`,
 * `arx-slate`, `arx-borders`).
 *
 * The exceptions draw the phone's own interface, not the brand: the lock screen and the text-message screens. Each is
 * named here with its reason. Do not add one for a screen the brand colors.
 */
const ROOT = join(__dirname, "../../portals/patient");

const PHONE_CHROME: { match: RegExp; why: string; optional?: boolean }[] = [
  { match: /LockScreen\.tsx$/, why: "the phone's lock screen" },
  { match: /Sms\.tsx$|SMSMessage\.tsx$/, why: "the phone's text-message thread" },
  { match: /AppointmentConfirmation\.tsx$/, why: "a text message from the clinic" },
  { match: /DesignSystem\.tsx$/, why: "the developer style guide, not a patient screen" },
  { match: /skins\/patient\/(SMSMessage|PaApprovedSms)\.tsx$/, why: "the phone's text-message thread", optional: true },
  { match: /Signature\.tsx$/, why: "the signature canvas draws ink, and a canvas cannot read a CSS variable" },
];

const PALETTE =
  /(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|decoration|placeholder|shadow|accent|caret)-(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/\d+)?(?![\w-])/g;
const HEX = /(["'`])#(?:[0-9a-fA-F]{3})\1|#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/g;
const FUNCTION = /\brgba?\(|\bhsla?\((?!var\()/g;
const WORD = /(?:color|backgroundColor|borderColor|fill|stroke)\s*[:=]\s*\{?\s*["'](?:white|black|red|green|blue|gray|grey|#fff)["']/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : files(path);
    return name.endsWith(".tsx") ? [path] : [];
  });
}

/** Drops comments, so a note that mentions "text-white" is not a use. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("patient screens use brand tokens only", () => {
  const screens = files(ROOT).filter((f) => !PHONE_CHROME.some((c) => c.match.test(f)));

  it("has screens to check", () => {
    expect(screens.length).toBeGreaterThan(40);
  });

  it("names a real file for every phone-chrome exception", () => {
    const all = files(ROOT);
    // `optional` marks a file that exists only on the patient-view branch, until that branch merges.
    for (const { match, why, optional } of PHONE_CHROME) if (!optional) expect(all.some((f) => match.test(f)), why).toBe(true);
  });

  it("uses no raw palette class, hex, rgb, or color word", () => {
    const hits: string[] = [];
    for (const path of screens) {
      const lines = code(readFileSync(path, "utf8")).split("\n");
      lines.forEach((line, i) => {
        for (const re of [PALETTE, HEX, FUNCTION, WORD]) {
          for (const m of line.matchAll(re)) hits.push(`${relative(ROOT, path)}:${i + 1}  ${m[0]}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
