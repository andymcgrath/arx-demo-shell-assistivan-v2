import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Text on a brand or action fill reads `text-arx-on-primary` or `text-arx-on-action`, so one brand setting decides it for
 * every screen. A literal white there is dark-on-light on one page and white-on-light on the next. This catches a class
 * list that puts both on one line. A fill and its text on separate lines is not caught, so review those by eye.
 */
const ROOT = join(__dirname, "../../portals/patient");
const FILL = /(?<![\w-])(?:hover:|active:)?bg-arx-(?:primary|action)(?:-dark|-hover)?(?![\w-])/;
const WHITE_TEXT = /(?<![\w-])(?:hover:|active:)?text-white(?:\/\d+)?(?![\w-])/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : files(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

describe("text on brand fills", () => {
  it("never hard-codes white on a brand or action fill in the patient portal", () => {
    const hits: string[] = [];
    for (const path of files(ROOT)) {
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (FILL.test(line) && WHITE_TEXT.test(line)) hits.push(`${path.replace(ROOT, "patient")}:${i + 1}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
