import { describe, it, expect, vi } from "vitest";
import { canUndoStep, undoLastStep } from "@/hooks/usePatientBack";
import { useDemoStore } from "@/store/demoStore";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/** The patient's Back arrow is the presenter's Undo: one step back, and the screen follows the case. */

describe("patient Back", () => {
  it("sends UNDO and tells the patient portal to re-sync", () => {
    const send = vi.fn();
    const before = useDemoStore.getState().undoNonce;
    undoLastStep({ getSnapshot: () => ({ context: { _snapshots: [{}] } }), send });
    expect(send).toHaveBeenCalledWith({ type: "UNDO" });
    expect(useDemoStore.getState().undoNonce).toBe(before + 1);
  });

  it("has nothing to undo at the first step", () => {
    expect(canUndoStep({ getSnapshot: () => ({ context: { _snapshots: [] } }), send: vi.fn() })).toBe(false);
    expect(canUndoStep({ getSnapshot: () => ({ context: {} }), send: vi.fn() })).toBe(false);
  });

  it("returns the case, and so the screen, to the step before", () => {
    withFrozenClock(() => {
      // The transfer text's tap lands on the code screen. Back returns to the text, with the tap undone.
      const actor = startFlow("CoA_PAP");
      const route = () => derivePatientRoute(ctx(actor));
      runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI" }]);
      expect(route()).toBe("/pap-transfer-sms");
      runSteps(actor, [{ type: "VERIFY_PAP_TRANSFER_SMS" }]);
      expect(route()).toBe("/pap-update-otp");
      expect(canUndoStep(actor as any)).toBe(true);
      undoLastStep(actor as any);
      expect(route()).toBe("/pap-transfer-sms");
      expect(ctx(actor).workflowData).toMatchObject({ papTransferSmsVerified: false, papSmsVerified: false });
      actor.stop();
    });
  });
});
