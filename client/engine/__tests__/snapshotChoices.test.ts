import { describe, it, expect } from "vitest";
import { snapshotHasChoices } from "../snapshotChoices";

const snap = (choices: Record<string, string>) => ({ context: { workflowData: { choices } } });

describe("snapshotHasChoices", () => {
  it("accepts a snapshot on the demo's branches", () => {
    expect(snapshotHasChoices(snap({ bi: "pharmacy_transfer", pa: "approved" }), { bi: "pharmacy_transfer", pa: "approved" })).toBe(true);
  });

  it("rejects a snapshot on another branch, so a stale session does not hide the demo's story", () => {
    expect(snapshotHasChoices(snap({ bi: "pharmacy_covered", pa: "approved" }), { bi: "pharmacy_transfer", pa: "approved" })).toBe(false);
  });

  it("rejects a snapshot that has no choices at all (saved before choices existed)", () => {
    expect(snapshotHasChoices({ context: { workflowData: {} } }, { bi: "pharmacy_transfer" })).toBe(false);
  });

  it("accepts any snapshot when the demo pins nothing", () => {
    expect(snapshotHasChoices(snap({ bi: "pharmacy_covered" }), undefined)).toBe(true);
    expect(snapshotHasChoices(snap({ bi: "pharmacy_covered" }), {})).toBe(true);
  });
});
