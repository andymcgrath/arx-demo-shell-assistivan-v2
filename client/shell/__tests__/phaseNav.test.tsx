// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getWorkflowActor, switchWorkflow, useActorStore } from "@/engine/actorSingleton";
import { WorkflowProvider } from "@/engine/WorkflowProvider";
import PhaseNav from "@/shell/PhaseNav";
import { stageList } from "@/shell/stageJump";

/**
 * The phase rail as a client uses it: see where the case is, press Next to send the step that moves it on or be told what
 * to do on the phone, press Back or a stage to jump.
 */

let actor: ReturnType<typeof getWorkflowActor>;
// A jump resets the case, which replaces the running actor, so read whichever one is current.
const data = () => ((useActorStore.getState().actor as any).getSnapshot().context as any).workflowData;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-01-15T12:00:00.000Z") });
  sessionStorage.clear();
  // The app's own actor, so a jump (which resets it) acts on the one the rail reads.
  switchWorkflow("Fax_QS_PA_Approved");
  actor = getWorkflowActor();
  actor.send({ type: "RESET" } as any);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const mount = () =>
  render(
    <WorkflowProvider>
      <PhaseNav />
    </WorkflowProvider>,
  );
const next = () => screen.getByRole("button", { name: /^Next/ }) as HTMLButtonElement;
const back = () => screen.getByRole("button", { name: /^Back/ }) as HTMLButtonElement;

describe("phase rail", () => {
  it("lists the scenario's stages and marks the first as the one the case is on", () => {
    mount();
    const stages = stageList("Fax_QS_PA_Approved", undefined);
    for (const { label } of stages) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(`Stage 1 of ${stages.length}`)).toBeTruthy();
    expect(screen.getByText("You are here")).toBeTruthy();
    expect(back().disabled).toBe(true);
  });

  it("Next sends the referral, then the invite, then waits for the patient and says where on the phone", () => {
    mount();
    expect(next().disabled).toBe(false);
    fireEvent.click(next());
    expect(data().enrollmentStatus).not.toBe("none");
    // The invite is the back office's too.
    fireEvent.click(next());
    expect(data().enrollmentInviteSent).toBe(true);
    // Now the patient's turn: Next is off and the rail says so.
    expect(next().disabled).toBe(true);
    expect(screen.getByText(/Continue on the phone/)).toBeTruthy();
  });

  it("opens the BI stage for the client and moves the stage when the result lands", () => {
    mount();
    for (const event of ["REFERRAL_RECEIVED", "INVITE", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"]) act(() => void actor.send({ type: event, portal: "crm" } as any));
    expect(data().biStatus).toBe("running");
    expect(next().textContent).toContain("Next");
    fireEvent.click(next());
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(data().biStatus).toBe("complete");
  });

  it("a stage click jumps the case there, and Back goes one stage back", () => {
    mount();
    const stages = stageList("Fax_QS_PA_Approved", undefined);
    fireEvent.click(screen.getByTitle(`Jump to ${stages[3].label}`));
    expect(data().paStatus).not.toBe("none");
    expect(screen.getByText(`Stage 4 of ${stages.length}`)).toBeTruthy();
    fireEvent.click(back());
    expect(screen.getByText(`Stage 3 of ${stages.length}`)).toBeTruthy();
  });
});
