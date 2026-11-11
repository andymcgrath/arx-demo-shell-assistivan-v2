import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PHONE_SCREENS } from "@/portals/patient/phoneScreens";

/** A text-message screen that is missing from PHONE_SCREENS renders inside the program header and footer. */
const source = readFileSync(join(__dirname, "../../portals/patient/index.tsx"), "utf8");
const routes = [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
const smsRoutes = routes.filter((p) => /sms/i.test(p));

describe("phone screens", () => {
  it("finds the text-message routes it guards", () => {
    expect(smsRoutes).toContain("/pap-transfer-sms");
    expect(smsRoutes.length).toBeGreaterThanOrEqual(7);
  });

  it("lists every text-message route, so none renders inside the program chrome", () => {
    expect(smsRoutes.filter((p) => !PHONE_SCREENS.has(p))).toEqual([]);
  });

  it("lists only routes that exist", () => {
    expect([...PHONE_SCREENS].filter((p) => !routes.includes(p))).toEqual([]);
  });
});
