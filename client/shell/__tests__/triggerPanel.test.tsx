// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { switchWorkflow, useActorStore } from "@/engine/actorSingleton";
import { WorkflowProvider } from "@/engine/WorkflowProvider";
import TriggerPanel from "@/shell/TriggerPanel";
import { startFlow } from "@/engine/__tests__/harness";

/**
 * The Trigger panel as a presenter uses it: open it, press what it offers, and watch the machine move. An agent step
 * opens the stage, waits out the machine's delay, and closes the stage when the result lands.
 */

let actor: ReturnType<typeof startFlow>;
let sent: string[];
const workflowData = () => (actor.getSnapshot().context as any).workflowData;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-01-15T12:00:00.000Z") });
  sessionStorage.clear();
  actor = startFlow("CoA_DTP");
  switchWorkflow("CoA_DTP");
  useActorStore.getState().setActor(actor as any);
  sent = [];
  const send = actor.send.bind(actor);
  vi.spyOn(actor, "send").mockImplementation(((e: any) => {
    sent.push(e.stage ? `${e.type}:${e.stage}` : e.type);
    return send(e);
  }) as any);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function openPanel() {
  render(
    <WorkflowProvider>
      <TriggerPanel />
    </WorkflowProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Trigger/ }));
}

describe("Trigger panel", () => {
  it("offers the referral first, as a manual step from another app", () => {
    openPanel();
    expect(screen.getByText("Manual steps")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Referral received" }));
    expect(sent).toContain("REFERRAL_RECEIVED");
    expect(workflowData().enrollmentStatus).not.toBe("none");
  });

  it("opens the BI stage, waits for the machine's delay, and closes the stage when the result lands", () => {
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Referral received" }));
    expect(workflowData().biStatus).toBe("running");

    fireEvent.click(screen.getByRole("button", { name: /Open BI/ }));
    expect(sent).toContain("VIEW_STAGE:BI");
    expect(workflowData().biStatus).toBe("running");
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(workflowData().biStatus).toBe("running");
    expect(sent).not.toContain("LEAVE_STAGE:BI");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(workflowData().biStatus).toBe("complete");
    expect(sent).toContain("LEAVE_STAGE:BI");
  });

  it("never offers the BI result itself as a button", () => {
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Referral received" }));
    expect(screen.queryByRole("button", { name: /Complete BI/ })).toBeNull();
  });

  it("leaving closes an open stage and cancels the reveal, as closing the tab does", () => {
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Referral received" }));
    fireEvent.click(screen.getByRole("button", { name: /Open BI/ }));
    cleanup();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(sent).toContain("LEAVE_STAGE:BI");
    expect(workflowData().biStatus).toBe("running");
  });

  it("says so when there is nothing for the presenter to do", () => {
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Referral received" }));
    fireEvent.click(screen.getByRole("button", { name: /Open BI/ }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // The PA runs next: an agent step again, so the panel is not empty. Open it to finish the PA, then the patient is next.
    fireEvent.click(screen.getByRole("button", { name: /Open PA/ }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText(/The patient is next/)).toBeTruthy();
  });
});
