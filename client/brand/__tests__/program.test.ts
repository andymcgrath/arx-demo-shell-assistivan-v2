import { describe, it, expect } from "vitest";
import { withProgramDefaults } from "../program";

const base = { name: "X", drugDisplayName: "X", description: "", dosageForm: "", colors: { brand: "#000000" } };

describe("withProgramDefaults", () => {
  it("gives a program with no assets an empty assets object, so a logo read does not throw", () => {
    const program = withProgramDefaults(base);
    expect(program.assets).toEqual({});
    expect(program.assets.logoColor).toBeUndefined();
  });

  it("keeps the assets a brand sets", () => {
    const assets = { logoColor: "/brands/x/logo.svg", logoWhite: null };
    expect(withProgramDefaults({ ...base, assets }).assets).toEqual(assets);
  });
});
