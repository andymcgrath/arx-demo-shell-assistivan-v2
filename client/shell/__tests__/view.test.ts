import { describe, expect, it } from "vitest";
import { allowedViews, resolveView, showViewToggle, viewFromSearch, viewProblems } from "@/shell/view";

describe("allowed views and the toggle", () => {
  it("gives a brand without enabledViews the full view and no toggle", () => {
    expect(allowedViews(undefined)).toEqual(["full"]);
    expect(showViewToggle(undefined)).toBe(false);
  });

  it("shows the toggle only when a brand lists more than one view", () => {
    expect(showViewToggle(["full", "patient"])).toBe(true);
    expect(showViewToggle(["patient"])).toBe(false);
    expect(showViewToggle(["full"])).toBe(false);
  });
});

describe("?view=", () => {
  it("reads a known view and ignores anything else", () => {
    expect(viewFromSearch("?view=patient")).toBe("patient");
    expect(viewFromSearch("?a=1&view=full")).toBe("full");
    expect(viewFromSearch("?view=admin")).toBeUndefined();
    expect(viewFromSearch("")).toBeUndefined();
  });
});

describe("resolveView", () => {
  const both = ["full", "patient"] as const;

  it("starts on the brand's first view", () => {
    expect(resolveView({ enabledViews: undefined })).toBe("full");
    expect(resolveView({ enabledViews: both })).toBe("full");
    expect(resolveView({ enabledViews: ["patient"] })).toBe("patient");
  });

  it("prefers the URL, then the saved view, then the demo's pin", () => {
    expect(resolveView({ enabledViews: both, param: "patient", stored: "full", pinned: "full" })).toBe("patient");
    expect(resolveView({ enabledViews: both, stored: "patient", pinned: "full" })).toBe("patient");
    expect(resolveView({ enabledViews: both, pinned: "patient" })).toBe("patient");
  });

  it("never picks a view the brand does not enable", () => {
    expect(resolveView({ enabledViews: undefined, param: "patient", stored: "patient", pinned: "patient" })).toBe("full");
    expect(resolveView({ enabledViews: ["patient"], param: "full", stored: "full" })).toBe("patient");
    expect(resolveView({ enabledViews: both, param: "patient" , stored: "full" })).toBe("patient");
  });
});

describe("viewProblems", () => {
  const demos = (view?: unknown) => [{ id: "d1", view }];

  it("accepts a brand with no view settings", () => {
    expect(viewProblems({ demos: demos() })).toEqual([]);
  });

  it("accepts a demo that pins an enabled view", () => {
    expect(viewProblems({ enabledViews: ["full", "patient"], demos: demos("patient") })).toEqual([]);
    expect(viewProblems({ demos: demos("full") })).toEqual([]);
  });

  it("rejects a demo that pins a view the brand does not enable", () => {
    expect(viewProblems({ demos: demos("patient") })).toHaveLength(1);
    expect(viewProblems({ enabledViews: ["full"], demos: demos("patient") })).toHaveLength(1);
  });

  it("rejects an unknown view on the brand or on a demo", () => {
    expect(viewProblems({ enabledViews: ["full", "kiosk"], demos: demos() })).toHaveLength(1);
    expect(viewProblems({ enabledViews: ["full"], demos: demos("kiosk") })).toHaveLength(1);
  });

  it("rejects an empty or repeating enabledViews", () => {
    expect(viewProblems({ enabledViews: [], demos: demos() })).toHaveLength(1);
    expect(viewProblems({ enabledViews: ["full", "full"], demos: demos() })).toHaveLength(1);
    expect(viewProblems({ enabledViews: "full", demos: demos() })).toHaveLength(1);
  });
});
