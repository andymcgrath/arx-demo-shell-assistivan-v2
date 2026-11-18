import { describe, it, expect } from "vitest";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { startPortalFor } from "@/shell/DemoShell";
import { faxStageEvents } from "@/shell/faxLadders";
import { ctx, runSteps, startFlow } from "./harness";

/**
 * Standard, entry point `pres`: the HCP completes the enrollment form on the client's engagement site and the case is created the way a
 * faxed referral creates it. The invite, consent, BI, PA and fulfillment that follow are the fax path's (the golden path is in scenarios.ts).
 */
function start(entry: "fax" | "pres") {
  const actor = startFlow("Fax_QS_PA_Approved", { choices: { entry } });
  return { actor, data: () => ctx(actor).workflowData, accepts: (type: string) => actor.getSnapshot().can({ type } as any) };
}

describe("Fax_QS_PA_Approved entry fork", () => {
  it("offers the engagement site as an extra entry point", () => {
    expect(scenarioFacts("Fax_QS_PA_Approved").hasEngagementEntry).toBe(true);
    expect(scenarioFacts("Fax_PAP_Audit").hasEngagementEntry).toBe(false);
  });

  it("takes the faxed referral for `fax` and the HCP's submit for `pres`, and refuses the other", () => {
    const fax = start("fax");
    expect(fax.accepts("REFERRAL_RECEIVED")).toBe(true);
    expect(fax.accepts("PRES_SUBMIT")).toBe(false);
    const pres = start("pres");
    expect(pres.accepts("PRES_SUBMIT")).toBe(true);
    expect(pres.accepts("REFERRAL_RECEIVED")).toBe(false);
  });

  it("creates the same case as a fax and waits for the agent's invite", () => {
    const fax = start("fax");
    runSteps(fax.actor, [{ type: "REFERRAL_RECEIVED" }]);
    const pres = start("pres");
    runSteps(pres.actor, [{ type: "PRES_SUBMIT", prescriberNpi: "1234567893" }]);
    const pick = (d: ReturnType<typeof fax.data>) => ({ enrollmentStatus: d.enrollmentStatus, enrollmentInviteSent: d.enrollmentInviteSent, patientInvited: d.patientInvited, biStatus: d.biStatus });
    expect(pick(pres.data())).toEqual(pick(fax.data()));
    expect(pres.data().prescriberNpi).toBe("1234567893");
    expect(pres.accepts("PRES_SUBMIT")).toBe(false);
    expect(pres.accepts("INVITE")).toBe(true);
  });

  it("opens PrES on the Provider tab and a fax on the CRM, and the stage ladder starts with the right event", () => {
    expect(startPortalFor("Fax_QS_PA_Approved", { entry: "pres" })).toBe("provider");
    expect(startPortalFor("Fax_QS_PA_Approved", { entry: "fax" })).toBe("crm");
    expect(faxStageEvents("standard", 2, { entry: "pres" })[0].type).toBe("PRES_SUBMIT");
    expect(faxStageEvents("standard", 2, { entry: "fax" })[0].type).toBe("REFERRAL_RECEIVED");
    expect(faxStageEvents("standard", 2)[0].type).toBe("REFERRAL_RECEIVED");
  });
});
