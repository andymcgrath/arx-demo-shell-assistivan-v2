import { describe, it, expect } from "vitest";
import { sameWorkflowData } from "../workflowDataEqual";
import type { WorkflowData } from "../types";

const data = (extra: Record<string, unknown> = {}) => ({ biStatus: "none", paStatus: "none", ...extra }) as unknown as WorkflowData;

describe("sameWorkflowData", () => {
  it("treats equal snapshots as the same", () => {
    expect(sameWorkflowData(data(), data())).toBe(true);
  });

  it("sees a changed value", () => {
    expect(sameWorkflowData(data(), data({ biStatus: "running" }))).toBe(false);
  });

  it("sees an optional field that appears later (eMedBV, copay claims)", () => {
    expect(sameWorkflowData(data(), data({ medbvStatus: "complete" }))).toBe(false);
    expect(sameWorkflowData(data({ medbvStatus: "complete" }), data())).toBe(false);
  });
});
