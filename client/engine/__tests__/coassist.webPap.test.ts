import { describe, it, expect } from "vitest";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { REVEAL_MS } from "@/workflows/coassist/modules/shared";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * CoA_Web_PAP: the web page enrolls the patient, the case is in the CRM, and BI returns when the agent opens the BI stage
 * (no Gateway). BI finds no coverage, so the free drug program takes over.
 */
function start() {
  const clock = new SimulatedClock();
  const actor = startFlow("CoA_Web_PAP", { clock });
  return { actor, clock, data: () => ctx(actor).workflowData, route: () => derivePatientRoute(ctx(actor)), accepts: (type: string) => actor.getSnapshot().can({ type } as any) };
}

describe("CoA_Web_PAP", () => {
  it("has the CRM and no Gateway", () => {
    expect(scenarioFacts("CoA_Web_PAP")).toMatchObject({ isWebSource: true, hasWebCrm: true });
    expect(scenarioFacts("CoA_Web_Copay")).toMatchObject({ isWebSource: true, hasWebCrm: false });
  });

  it("ignores the Gateway: BI waits for the agent", () => {
    withFrozenClock(() => {
      const { actor, clock, data, accepts } = start();
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", consentStatus: "confirmed", biStatus: "running" });
      expect(accepts("VIEW_GATEWAY")).toBe(false);
      clock.increment(REVEAL_MS * 10);
      expect(data().biStatus).toBe("running");
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      expect(data()).toMatchObject({ biStatus: "complete", papTransferStatus: "referred" });
    });
  });

  it("leaves the phone idle until BI is back, then sends the transfer text with no PA", () => {
    withFrozenClock(() => {
      const { actor, clock, data, route } = start();
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      expect(route()).toBe("/pap-transfer-sms");
      expect(data().paStatus).toBe("none");
      expect(data().selectedPharmacy?.name).toBe(ctx(actor).workflowData.selectedPharmacy?.name);
    });
  });
});
