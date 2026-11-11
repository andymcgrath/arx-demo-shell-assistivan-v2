import { describe, it, expect } from "vitest";
import { nextHistory } from "@/lib/portalRouter";
import { coverageOutcome } from "@/portals/web/outcome";

describe("portal router history", () => {
  it("adds an entry for a new path and ignores the path it is already on", () => {
    expect(nextHistory(["/a"], "/b")).toEqual(["/a", "/b"]);
    expect(nextHistory(["/a", "/b"], "/b")).toEqual(["/a", "/b"]);
  });

  it("goes back one entry for -1, so a Back arrow returns to the screen before", () => {
    expect(nextHistory(["/a", "/b", "/c"], -1)).toEqual(["/a", "/b"]);
    expect(nextHistory(["/a", "/b", "/c"], -2)).toEqual(["/a"]);
  });

  it("never goes back past the first entry, and never forward by number", () => {
    expect(nextHistory(["/a"], -1)).toEqual(["/a"]);
    expect(nextHistory(["/a", "/b"], -5)).toEqual(["/a"]);
    expect(nextHistory(["/a", "/b"], 1)).toEqual(["/a", "/b"]);
  });

  it("replaces the current entry, and a reset forgets the history", () => {
    expect(nextHistory(["/a", "/b"], "/c", { replace: true })).toEqual(["/a", "/c"]);
    expect(nextHistory(["/a", "/b"], "/z", { reset: true })).toEqual(["/z"]);
  });

  it("keeps the history bounded", () => {
    let h = ["/0"];
    for (let i = 1; i <= 80; i++) h = nextHistory(h, `/${i}`);
    expect(h.length).toBe(50);
    expect(h[h.length - 1]).toBe("/80");
  });
});

describe("client page coverage outcome", () => {
  it("waits until a PA is approved or the case is referred, and not for a PA that never runs", () => {
    expect(coverageOutcome({ paStatus: "none", papTransferStatus: "none" })).toBe("checking");
    expect(coverageOutcome({ paStatus: "approved", papTransferStatus: "none" })).toBe("summary");
    expect(coverageOutcome({ paStatus: "none", papTransferStatus: "referred" })).toBe("referred");
  });
});
